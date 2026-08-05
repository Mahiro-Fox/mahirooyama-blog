'use server';

import { sessionStore } from '@/store/session-store';
import { userStore } from '@/store/user-store';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import {
  ADMIN_SESSION_COOKIE,
  JWT_SECRET,
  SESSION_EXPIRY,
} from '@/constant/auth';
import { verifyAuth } from '@/lib/admin-auth';
import { loginRateLimiter } from '@/lib/rate-limit';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AuthAction');

export async function login(
  username: string,
  password: string
): Promise<
  | {
      success: true;
      message: string;
      expiresIn: number;
      sessionId: string;
      user: {
        id: string;
        username: string;
        avatar: string;
        role: string;
        mustChangePassword?: boolean;
      };
    }
  | { success: false; error: string; resetTime?: number }
> {
  try {
    if (!username || !password) {
      return { success: false, error: '请提供用户名和密码' };
    }

    // 速率限制检查
    const rateLimit = await loginRateLimiter.check(`login:${username}`);
    if (!rateLimit.success) {
      return {
        success: false,
        error: '登录尝试过于频繁，请稍后再试',
        resetTime: rateLimit.resetTime,
      };
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
    cookieStore.set(ADMIN_SESSION_COOKIE, token, {
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
        mustChangePassword: user.mustChangePassword,
      },
    };
  } catch (error) {
    logger.error('登录失败', error, {
      username,
      action: 'login',
      timestamp: new Date().toISOString(),
    });
    return { success: false, error: '登录失败，请稍后重试' };
  }
}

export async function checkLogin() {
  const authCheck = await verifyAuth();
  if (!authCheck.success) {
    return { success: false, error: '未登录' };
  }
  return { success: true, user: authCheck };
}
