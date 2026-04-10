import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

import { sessionStore } from '@/lib/session-store';

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

// 24小时过期时间（秒）
const SESSION_EXPIRY = 24 * 60 * 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: '请提供密码' }, { status: 400 });
    }

    // 验证密码（使用 bcrypt 比较）
    let isValidPassword = false;

    if (ADMIN_PASSWORD_HASH) {
      // 使用哈希验证
      isValidPassword = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    } else {
      // 如果没有设置哈希，降级到明文比较（仅用于开发）
      console.warn(
        '警告: 未设置 ADMIN_PASSWORD_HASH，使用明文密码验证。生产环境请使用哈希密码！'
      );
      const fallbackPassword = process.env.ADMIN_PASSWORD || 'admin123';
      isValidPassword = password === fallbackPassword;
    }

    if (!isValidPassword) {
      // 添加随机延迟防止时序攻击
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 100 + 50)
      );
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }

    // 生成唯一的会话 ID
    const sessionId = crypto.randomUUID();

    // 创建 JWT token
    const token = await new SignJWT({
      role: 'admin',
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

    sessionStore.create(token, {
      sessionId,
      userAgent,
      ip: clientIp,
    });

    // 设置 cookie
    const cookieStore = await cookies();
    cookieStore.set('admin-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_EXPIRY,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      message: '登录成功',
      expiresIn: SESSION_EXPIRY,
      sessionId,
    });
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
