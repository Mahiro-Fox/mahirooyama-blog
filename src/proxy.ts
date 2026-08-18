import { authConfig } from '@/auth.config';
import NextAuth from 'next-auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { pageRoutesConfig } from '@/config/common';
import { i18nConfig } from '@/i18n/i18n.config';

// 用 edge-safe 的 authConfig 创建 proxy 用的 auth
const { auth } = NextAuth(authConfig);

// 获取需要保护的路由
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

// 添加安全响应头
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
      // ip解析
      "connect-src 'self' *;",
      // 允许 img-src 使用任何源的图片资源
      "img-src 'self' * blob:;",
      // 允许 media-src 使用任何源的音频资源
      "media-src 'self' * blob:;",
    ].join(' ')
  );
  return response;
}

const protectedRoutes = getProtectedRoutes();

export default auth(async (req: NextRequest) => {
  // ★ 新增：如果是中间件自己 rewrite 出来的内部请求，直接放行，避免二次处理死循环
  if (req.headers.get('x-i18n-rewritten')) {
    return addSecurityHeaders(NextResponse.next());
  }
  const { pathname } = req.nextUrl;
  // 默认语言
  const defaultLang = i18nConfig.defaultLang;
  // 支持的语言列表
  const locales = i18nConfig.locales;
  // 从cookie中获取语言设置，setCookie的操作在site-header.tsx的<SwitchLanguage>组件中
  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value || defaultLang;

  const pathSegments = pathname.split('/').filter(Boolean);
  // 第一个路径段，即语言前缀
  const firstSegment = pathSegments[0];
  // 检查路径是否包含语言前缀
  const hasLocaleInPath = locales.includes(firstSegment);

  // 情况 A ：路径包含默认语言前缀，且当前语言是默认语言，直接重定向到不带前缀的路径
  // 例如：/en/xxx -> /xxx
  if (hasLocaleInPath && firstSegment === defaultLang) {
    const newPath = `/${pathSegments.slice(1).join('/')}`;
    const url = req.nextUrl.clone();
    url.pathname = newPath || '/';
    return NextResponse.redirect(url);
  }

  let rewriteUrl: URL | null = null;
  let visibleLocalePrefix = '';

  if (hasLocaleInPath) {
    // 情况 C ：路径包含语言前缀，仅添加到可见前缀，不做任何重定向处理
    visibleLocalePrefix = `/${firstSegment}`;
  } else {
    // 情况 B-1 ：路径不包含语言前缀，但是cookie中包含语言设置，且cookie中的语言不是默认语言，立即重定向到cookie中的语言前缀路径
    if (
      cookieLocale &&
      locales.includes(cookieLocale) &&
      cookieLocale !== defaultLang
    ) {
      const url = req.nextUrl.clone();
      url.pathname = `/${cookieLocale}${pathname === '/' ? '' : pathname}`;
      return NextResponse.redirect(url);
    }
    // 情况 B-2 ：路径不包含语言前缀，无cookies，或cookies中语言是默认语言，设置重定向url到默认语言前缀路径
    const newPath = `/${defaultLang}${pathname === '/' ? '' : pathname}`;
    rewriteUrl = req.nextUrl.clone();
    rewriteUrl.pathname = newPath;
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);
  requestHeaders.set('x-i18n-rewritten', '1'); // ★ 新增

  // 无语言前缀后的真实路径，用于比对protectedRoutes中的需要保护的路由
  const pathnameWithoutLocale = hasLocaleInPath
    ? '/' + pathSegments.slice(1).join('/') || '/'
    : pathname;

  // 检查路径是否在protectedRoutes中，即是否需要保护的路由
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  );

  // 如果是需要保护的路由，检查是否登录（使用 next-auth session）
  if (isProtectedRoute) {
    const isLoggedIn = !!(req as any).auth;
    // 登录路径
    const loginPath = `${visibleLocalePrefix}/signin`;

    if (!isLoggedIn) {
      const loginUrl = new URL(loginPath, req.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      return addSecurityHeaders(response);
    }

    // 已登录：next-auth JWT 自动滚动，不需要手动刷新
    const response = rewriteUrl
      ? NextResponse.rewrite(rewriteUrl, {
          request: { headers: requestHeaders },
        })
      : NextResponse.next({ request: { headers: requestHeaders } });
    return addSecurityHeaders(response);
  }

  // 其他路由，直接返回响应
  const response = rewriteUrl
    ? NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });
  return addSecurityHeaders(response);
});

// 限制中间件运行的路径，排除静态文件和 API
export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了:
     * 1. /api (API 路由由内部处理)
     * 2. /_next/static (静态文件)
     * 3. /_next/image (图片优化)
     * 4. /favicon.ico, sitemap.xml, robots.txt (元数据文件)
     * 5. 所有包含 . 的文件 (如 .png, .jpg, .svg 等)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
};
