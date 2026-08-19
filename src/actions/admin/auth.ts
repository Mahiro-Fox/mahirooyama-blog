'use server';

import { SESSION_EXPIRY } from '@/constant/auth';
import {
  adminLoginViaGo,
  adminLogoutViaGo,
  verifyAuth,
} from '@/lib/admin-auth';
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
      loggedInAt: string;
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

    // 速率限制仍在 Next 层做：因为它需要把 resetTime 返回给前端 toast
    const rateLimit = await loginRateLimiter.check(`login:${username}`);
    if (!rateLimit.success) {
      return {
        success: false,
        error: '登录尝试过于频繁，请稍后再试',
        resetTime: rateLimit.resetTime,
      };
    }

    const result = await adminLoginViaGo(username, password);
    if (!result.success) {
      // 防止时序攻击：失败小延迟
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 100 + 50)
      );
      return { success: false, error: result.error };
    }

    return {
      success: true,
      message: result.message,
      expiresIn: result.expiresIn,
      sessionId: result.sessionId,
      loggedInAt: result.loggedInAt,
      user: result.user,
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

// —— 兼容：其他地方可能从 logout.ts 调用 adminLogout，但这里也提供 logout 别名——
export async function logout() {
  return adminLogoutViaGo();
}
