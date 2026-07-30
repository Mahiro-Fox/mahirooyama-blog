import { jwtVerify, SignJWT } from 'jose';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { pageRoutesConfig } from '@/config/common';
import { SESSION_EXPIRY, SESSION_REFRESH_THRESHOLD } from '@/constant/auth';
import { i18nConfig } from '@/i18n/i18n.config';

// JWT 密钥检查（最少32字符）
const rawSecret =
  process.env.JWT_SECRET || 'your-secret-key-change-in-production';
if (rawSecret.length < 32) {
  console.warn(
    'JWT_SECRET must be at least 32 characters long for security. ' +
      'Please generate a strong key and add it to your .env.local file.'
  );
}
const JWT_SECRET = new TextEncoder().encode(rawSecret);

// 保持不带语言前缀，只维护一份配置
function getProtectedRoutes() {
  const routes = new Set<string>();
  routes.add('/admin');

  pageRoutesConfig.forEach((route) => {
    if (route.needAuth) {
      if (route.navHref) routes.add(route.navHref);
      if (route.adminHref) routes.add(route.adminHref);
    }
  });

  return Array.from(routes);
}

const protectedRoutes = getProtectedRoutes(); // 提到模块顶层，只算一次，不用每次请求都重新算
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // 默认语言
  const defaultLang = i18nConfig.defaultLang;
  // 支持的语言列表
  const locales = i18nConfig.locales;
  // 从cookie中获取语言设置
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value || defaultLang;

  const pathSegments = pathname.split('/').filter(Boolean);
  // 第一个路径段，即语言前缀
  const firstSegment = pathSegments[0];
  // 检查路径是否包含语言前缀
  const hasLocaleInPath = locales.includes(firstSegment);

  // 情况 A ：路径包含默认语言前缀，且默认语言是当前语言
  if (hasLocaleInPath && firstSegment === defaultLang) {
    const newPath = `/${pathSegments.slice(1).join('/')}`;
    const url = request.nextUrl.clone();
    url.pathname = newPath || '/';
    return NextResponse.redirect(url);
  }

  let rewriteUrl: URL | null = null;
  let visibleLocalePrefix = '';

  if (hasLocaleInPath) {
    // 情况 C ：路径包含其他语言前缀
    visibleLocalePrefix = `/${firstSegment}`;
  } else {
    // 情况 B ：路径不包含语言前缀，且cookie中包含语言设置
    if (
      cookieLocale &&
      locales.includes(cookieLocale) &&
      cookieLocale !== defaultLang
    ) {
      const url = request.nextUrl.clone();
      url.pathname = `/${cookieLocale}${pathname === '/' ? '' : pathname}`;
      return NextResponse.redirect(url);
    }
    const newPath = `/${defaultLang}${pathname === '/' ? '' : pathname}`;
    rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = newPath;
  }

  // 登录路径
  const loginPath = `${visibleLocalePrefix}/login`;

  // 去掉语言前缀后的真实路径，两种情况统一处理
  const pathnameWithoutLocale = hasLocaleInPath
    ? '/' + pathSegments.slice(1).join('/') || '/'
    : pathname;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // 用不带前缀的路径 vs 不带前缀的配置比较，两边基准统一
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  );

  if (isProtectedRoute) {
    const token = request.cookies.get('admin-session')?.value;

    if (!token) {
      const loginUrl = new URL(loginPath, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      return addSecurityHeaders(response);
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const now = Math.floor(Date.now() / 1000);
      const exp = payload.exp || 0;

      const response = rewriteUrl
        ? NextResponse.rewrite(rewriteUrl, {
            request: { headers: requestHeaders },
          })
        : NextResponse.next({ request: { headers: requestHeaders } });

      if (exp - now < SESSION_REFRESH_THRESHOLD) {
        const newToken = await new SignJWT({
          userId: payload.userId,
          username: payload.username,
          role: payload.role,
          loggedInAt: new Date().toISOString(),
          sessionId: payload.sessionId || crypto.randomUUID(),
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime(`${SESSION_EXPIRY}s`)
          .sign(JWT_SECRET);

        const isSecure =
          process.env.COOKIE_SECURE === 'true' ||
          (process.env.COOKIE_SECURE !== 'false' &&
            process.env.NODE_ENV === 'production');

        response.cookies.set('admin-session', newToken, {
          httpOnly: true,
          secure: isSecure,
          sameSite: 'strict',
          maxAge: SESSION_EXPIRY,
          path: '/',
        });
      }

      return addSecurityHeaders(response);
    } catch {
      const loginUrl = new URL(loginPath, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('admin-session');
      return addSecurityHeaders(response);
    }
  }

  const response = rewriteUrl
    ? NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });
  return addSecurityHeaders(response);
}

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
