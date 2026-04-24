import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

import { sessionStore } from '@/lib/session-store';
import { userStore } from '@/lib/user-store';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

// 24小时过期时间（秒）
const SESSION_EXPIRY = 24 * 60 * 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: '请提供用户名和密码' },
        { status: 400 }
      );
    }

    // 初始化用户存储（创建默认管理员）
    await userStore.initialize();

    // 验证用户
    const user = await userStore.verifyPassword(username, password);

    if (!user) {
      // 添加随机延迟防止时序攻击
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 100 + 50)
      );
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    // 生成唯一的会话 ID
    const sessionId = crypto.randomUUID();

    // 创建 JWT token（包含用户ID用于单设备登录）
    const token = await new SignJWT({
      userId: user.id,
      username: user.username,
      role: user.role,
      loggedInAt: new Date().toISOString(),
      sessionId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_EXPIRY}s`)
      .sign(JWT_SECRET);

    // 记录会话（单设备登录：新登录使旧会话失效）
    // 获取客户端信息
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0] || realIp || 'unknown';

    // 删除该用户的旧会话（单设备登录）
    sessionStore.deleteByUserId(user.id);

    sessionStore.create(token, {
      userId: user.id,
      sessionId,
      userAgent,
      ip: clientIp,
    });
    // 通过 COOKIE_SECURE 环境变量可强制控制 secure 属性
    // 如果未设置，则仅在 NODE_ENV=production 且非 HTTP 部署时启用 secure
    const isSecure =
      process.env.COOKIE_SECURE === 'true' ||
      (process.env.COOKIE_SECURE !== 'false' &&
        process.env.NODE_ENV === 'production');
    // 设置 cookie
    const cookieStore = await cookies();
    cookieStore.set('admin-session', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'strict',
      maxAge: SESSION_EXPIRY,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      message: '登录成功',
      expiresIn: SESSION_EXPIRY,
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
