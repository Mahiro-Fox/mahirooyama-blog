import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

import { apiRateLimiter, loginRateLimiter } from '@/lib/rate-limit';

// JWT 密钥检查（最少32字符）
const rawSecret =
  process.env.JWT_SECRET || 'your-secret-key-change-in-production';
if (rawSecret.length < 32) {
  throw new Error(
    'JWT_SECRET must be at least 32 characters long for security. ' +
      'Please generate a strong key and add it to your .env.local file.'
  );
}
const JWT_SECRET = new TextEncoder().encode(rawSecret);

// 会话刷新阈值：剩余4小时时自动续期
const SESSION_REFRESH_THRESHOLD = 4 * 60 * 60; // 4小时（秒）
const SESSION_EXPIRY = 24 * 60 * 60; // 24小时（秒）

// 需要保护的路由
const protectedRoutes = ['/admin'];
const publicRoutes = ['/admin/login'];
const apiRoutes = ['/api'];

// 获取客户端 IP
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. API 速率限制（防止暴力破解）
  if (pathname === '/api/login') {
    const clientIp = getClientIp(request);
    const { success, resetTime } = await loginRateLimiter.check(clientIp);

    if (!success) {
      const minutesLeft = Math.ceil((resetTime - Date.now()) / 60000);
      return NextResponse.json(
        {
          error: `尝试次数过多，请${minutesLeft}分钟后再试`,
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)),
          },
        }
      );
    }
  }

  // 2. 通用 API 速率限制
  if (apiRoutes.some((route) => pathname.startsWith(route))) {
    const clientIp = getClientIp(request);
    const { success } = await apiRateLimiter.check(`${clientIp}:${pathname}`);

    if (!success) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
    }
  }

  // 3. 检查 /admin 路径，但排除 /admin/login
  if (
    protectedRoutes.some((route) => pathname.startsWith(route)) &&
    !publicRoutes.some((route) => pathname.startsWith(route))
  ) {
    const token = request.cookies.get('admin-session')?.value;

    if (!token) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      return addSecurityHeaders(response);
    }

    try {
      // 验证 token
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const now = Math.floor(Date.now() / 1000);
      const exp = payload.exp || 0;

      // 4. 会话刷新（Sliding Session）：剩余时间少于4小时时续期
      let response = NextResponse.next();

      if (exp - now < SESSION_REFRESH_THRESHOLD) {
        // 重新签发 token
        const newToken = await new SignJWT({
          role: 'admin',
          loggedInAt: new Date().toISOString(),
          sessionId: payload.sessionId || crypto.randomUUID(),
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime(`${SESSION_EXPIRY}s`)
          .sign(JWT_SECRET);

        // 设置新 cookie
        response.cookies.set('admin-session', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: SESSION_EXPIRY,
          path: '/',
        });
      }

      return addSecurityHeaders(response);
    } catch (error) {
      // token 无效或过期
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('admin-session');
      return addSecurityHeaders(response);
    }
  }

  // 5. 对 /admin/login 也添加安全头
  if (pathname.startsWith('/admin/login')) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
