import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SESSION_EXPIRY, SESSION_REFRESH_THRESHOLD } from '@/constant/auth';
import { i18nConfig } from '@/i18n/i18n.config';
import { jwtVerify, SignJWT } from 'jose';

import { pageRoutesConfig } from '@/config/common';

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

// 动态获取需要保护的路由
const getProtectedRoutes = () => {
  const routes = new Set<string>();

  // 默认保护所有 /admin 开头的路由
  routes.add('/admin');

  // 从配置中提取需要 auth 的路由
  pageRoutesConfig.forEach((route) => {
    if (route.needAuth) {
      if (route.navHref) routes.add(route.navHref);
      if (route.adminHref) routes.add(route.adminHref);
    }
  });

  return Array.from(routes);
};

const protectedRoutes = getProtectedRoutes();

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

  const defaultLang = i18nConfig.defaultLang;
  const locales = i18nConfig.locales;
  // ---------------- 第一步：语言前缀处理 ----------------
  const pathSegments = pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];
  // 情况 A：URL 显式带了默认语言前缀（如 /en/xxx）——重定向去掉前缀，保持地址栏干净
  if (locales.includes(firstSegment) && firstSegment === defaultLang) {
    const newPath = `/${pathSegments.slice(1).join('/')}`;
    const url = request.nextUrl.clone();
    url.pathname = newPath || '/';
    return NextResponse.redirect(url);
  }
  // 情况 B：URL 没有任何语言前缀 —— 内部 rewrite 到默认语言目录，但地址栏不变
  let rewriteUrl: URL | null = null;
  if (!locales.includes(firstSegment)) {
    const newPath = `/${defaultLang}${pathname === '/' ? '' : pathname}`;
    rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = newPath;
  }
  // 情况 C：URL 带了非默认语言前缀（如 /zh/xxx）—— 无需处理，[lang] 目录本身就能匹配

  // 添加 x-pathname header 供 Server Components 使用
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // 检查路径是否在受保护名单中
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    const token = request.cookies.get('admin-session')?.value;

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      return addSecurityHeaders(response);
    }

    try {
      // 验证 token
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const now = Math.floor(Date.now() / 1000);
      const exp = payload.exp || 0;

      // 创建基础响应
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      // 会话刷新（Sliding Session）：剩余时间少于4小时时续期
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
      // token 无效或过期
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('admin-session');
      return addSecurityHeaders(response);
    }
  }

  const response = rewriteUrl
    ? NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
    : NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
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
