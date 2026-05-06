'use server';

import { cookies } from 'next/headers';
import { sessionStore } from '@/store/session-store';
import { userStore } from '@/store/user-store';
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

const SESSION_EXPIRY = 24 * 60 * 60;

export async function login(username: string, password: string) {
  try {
    if (!username || !password) {
      return { success: false, error: '请提供用户名和密码' };
    }

    // 初始化用户存储
    await userStore.initialize();

    // 验证用户
    const user = await userStore.verifyPassword(username, password);

    if (!user) {
      // 防止时序攻击
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 100 + 50)
      );
      return { success: false, error: '用户名或密码错误' };
    }

    // 生成会话 ID
    const sessionId = crypto.randomUUID();

    // 创建 JWT token
    const token = await new SignJWT({
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      loggedInAt: new Date().toISOString(),
      sessionId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_EXPIRY}s`)
      .sign(JWT_SECRET);

    // 记录会话
    const userAgent = 'server-action';
    const clientIp = 'server-action';

    // 删除旧会话
    sessionStore.deleteByUserId(user.id);

    sessionStore.create(token, {
      userId: user.id,
      sessionId,
      userAgent,
      ip: clientIp,
    });

    // 设置 cookie
    const isSecure =
      process.env.COOKIE_SECURE === 'true' ||
      (process.env.COOKIE_SECURE !== 'false' &&
        process.env.NODE_ENV === 'production');

    const cookieStore = await cookies();
    cookieStore.set('admin-session', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'strict',
      maxAge: SESSION_EXPIRY,
      path: '/',
    });

    return {
      success: true,
      message: '登录成功',
      expiresIn: SESSION_EXPIRY,
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
      },
    };
  } catch (error) {
    console.error('登录失败:', error);
    return { success: false, error: '登录失败，请稍后重试' };
  }
}

export async function verifyAuth() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin-session');

    if (!token) {
      return { success: false, error: '未登录' };
    }

    // 验证 token
    const { payload } = await jwtVerify(token.value, JWT_SECRET);

    // 检查会话是否存在
    if (!sessionStore.exists(token.value)) {
      return {
        success: false,
        error: '会话已在其他设备上失效，请重新登录',
      };
    }

    // 更新会话最后使用时间
    sessionStore.update(token.value);

    return {
      success: true,
      userId: payload.userId,
      username: payload.username,
      avatar: payload.avatar,
      role: payload.role,
      loggedInAt: payload.loggedInAt,
      expiresAt: payload.exp,
      sessionId: payload.sessionId,
    };
  } catch (error) {
    return { success: false, error: '登录已过期，请重新登录' };
  }
}
