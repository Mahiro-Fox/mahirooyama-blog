import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

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

// 会话刷新阈值：剩余4小时时自动续期
const SESSION_REFRESH_THRESHOLD = 4 * 60 * 60; // 4小时（秒）
const SESSION_EXPIRY = 24 * 60 * 60; // 24小时（秒）

// 需要保护的路由 - /login 已独立，不在 /admin 下
const protectedRoutes = ['/admin'];

// 添加安全响应头
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; connect-src 'self' https://cdn.jsdelivr.net;"
  );
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 添加 x-pathname header 供 Server Components 使用
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // 检查 /admin 路径（所有 /admin 都需要认证）
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
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

      // 会话刷新（Sliding Session）：剩余时间少于4小时时续期
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      if (exp - now < SESSION_REFRESH_THRESHOLD) {
        // 重新签发 token，保留原有信息
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

        // 通过 COOKIE_SECURE 环境变量可强制控制 secure 属性
        const isSecure =
          process.env.COOKIE_SECURE === 'true' ||
          (process.env.COOKIE_SECURE !== 'false' &&
            process.env.NODE_ENV === 'production');

        // 设置新 cookie
        response.cookies.set('admin-session', newToken, {
          httpOnly: true,
          secure: isSecure,
          sameSite: 'strict',
          maxAge: SESSION_EXPIRY,
          path: '/',
        });
      }

      return addSecurityHeaders(response);
    } catch (error) {
      // token 无效或过期
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('admin-session');
      return addSecurityHeaders(response);
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
