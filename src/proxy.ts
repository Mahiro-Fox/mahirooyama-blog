import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { pageRoutesConfig } from '@/config/common';
import { ADMIN_SESSION_COOKIE } from '@/constant/auth';
import { i18nConfig } from '@/i18n/i18n.config';

// —— 登录态判定：proxy 走 edge runtime，不再引入 next-auth。
// 因为 next-auth 已被移除，proxy 只能做「有没有 admin-session cookie」的粗校验，
// 真正的 JWT+PG 表会话校验在 Server Action / Server Component 调用 verifyAuth() 完成。
// 这样能避免 edge 里加载 jose 等重型库，也能与 Go 后端 verify API 保持单一可信源。
function isAdminLoggedIn(req: NextRequest): boolean {
  return Boolean(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

// 获取需要保护的路由（原实现不动）
function getProtectedRoutes() {
  const routes = new Set<string>();
  pageRoutesConfig.forEach((route) => {
    if (route.needAuth) {
      if (route.navHref) routes.add(route.navHref);
      if (route.adminHref) routes.add(route.adminHref);
    }
  });
  return Array.from(routes);
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self';",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;",
      "connect-src 'self' *;",
      "img-src 'self' * blob:;",
      "media-src 'self' * blob:;",
    ].join(' ')
  );
  return response;
}

const protectedRoutes = getProtectedRoutes();

export default async function middleware(req: NextRequest) {
  if (req.headers.get('x-i18n-rewritten')) {
    return addSecurityHeaders(NextResponse.next());
  }
  const { pathname } = req.nextUrl;
  const defaultLang = i18nConfig.defaultLang;
  const locales = i18nConfig.locales;
  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value || defaultLang;

  const pathSegments = pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];
  const hasLocaleInPath = locales.includes(firstSegment);

  if (hasLocaleInPath && firstSegment === defaultLang) {
    const newPath = `/${pathSegments.slice(1).join('/')}`;
    const url = req.nextUrl.clone();
    url.pathname = newPath || '/';
    return NextResponse.redirect(url);
  }

  let rewriteUrl: URL | null = null;
  let visibleLocalePrefix = '';

  if (hasLocaleInPath) {
    visibleLocalePrefix = `/${firstSegment}`;
  } else {
    if (
      cookieLocale &&
      locales.includes(cookieLocale) &&
      cookieLocale !== defaultLang
    ) {
      const url = req.nextUrl.clone();
      url.pathname = `/${cookieLocale}${pathname === '/' ? '' : pathname}`;
      return NextResponse.redirect(url);
    }
    const newPath = `/${defaultLang}${pathname === '/' ? '' : pathname}`;
    rewriteUrl = req.nextUrl.clone();
    rewriteUrl.pathname = newPath;
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);
  requestHeaders.set('x-i18n-rewritten', 'true'); // ★ 新增

  const pathnameWithoutLocale = hasLocaleInPath
    ? '/' + pathSegments.slice(1).join('/') || '/'
    : pathname;

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  );

  if (isProtectedRoute) {
    const loggedIn = isAdminLoggedIn(req);
    const loginPath = `${visibleLocalePrefix}/signin`;
    if (!loggedIn) {
      const loginUrl = new URL(loginPath, req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }
    const response = rewriteUrl
      ? NextResponse.rewrite(rewriteUrl, {
          request: { headers: requestHeaders },
        })
      : NextResponse.next({ request: { headers: requestHeaders } });
    return addSecurityHeaders(response);
  }

  const response = rewriteUrl
    ? NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
};
