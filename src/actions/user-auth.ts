'use server';

import { headers } from 'next/headers';
import { goFetch } from '@/lib/server/api-client';
import { loginRateLimiter } from '@/lib/rate-limit';
import { createLogger } from '@/utils/logger';
import {
  userLoginViaGo,
  userLogoutViaGo,
  getCurrentUser,
} from '@/lib/user-auth';

const logger = createLogger('UserAuthAction');

// 从请求头解析客户端 IP（用于限流叠加 IP 维度）
async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown';
}

export async function userLogin(
  username: string,
  password: string
): Promise<
  | {
      success: true;
      message: string;
      user: { id: string; username: string };
    }
  | { success: false; error: string; resetTime?: number }
> {
  try {
    if (!username || !password) {
      return { success: false, error: 'Username and password required' };
    }
    const rateLimit = await loginRateLimiter.check(`user-login:${username}`);
    const ipLimit = await loginRateLimiter.check(
      `user-login-ip:${await clientIp()}`
    );
    if (!rateLimit.success || !ipLimit.success) {
      return {
        success: false,
        error: 'Too many attempts, please try again later',
        resetTime: Math.max(rateLimit.resetTime, ipLimit.resetTime),
      };
    }

    let loginRes;
    try {
      loginRes = await userLoginViaGo(username, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err ?? '');
      if (msg.includes('返回 401')) {
        return { success: false, error: 'Invalid username or password' };
      }
      throw err;
    }

    return {
      success: true,
      message: 'Login successful',
      user: {
        id: loginRes.account.id,
        username: loginRes.account.username,
      },
    };
  } catch (error) {
    logger.error('Login failed', error, { username, action: 'userLogin' });
    return { success: false, error: 'Login failed, please try again later' };
  }
}

export async function userRegister(
  username: string,
  password: string
): Promise<
  | {
      success: true;
      message: string;
      user: { id: string; username: string };
    }
  | { success: false; error: string; resetTime?: number }
> {
  try {
    if (!username || !password) {
      return { success: false, error: 'Username and password required' };
    }
    if (username.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }
    // 注册限流：叠加 IP 维度（复用注册专用的更严格限制，如用户名/前缀防霸占）
    const regIpLimit = await loginRateLimiter.check(
      `user-register-ip:${await clientIp()}`
    );
    const regNameLimit = await loginRateLimiter.check(
      `user-register-name:${username.toLowerCase()}`
    );
    if (!regIpLimit.success || !regNameLimit.success) {
      return {
        success: false,
        error: 'Registration is too frequent, please try again later',
        resetTime: Math.max(regIpLimit.resetTime, regNameLimit.resetTime),
      };
    }
    // 注册仍走 Go /api/accounts（已支持 bcrypt），成功后立即 Go 端登录写入 user-session cookie
    type CreateAccountRes =
      | { id: string; username: string }
      | { error?: string };
    const created = await goFetch<CreateAccountRes>('/api/accounts', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    const account = created as { id: string; username: string };
    if (!account?.id) {
      return {
        success: false,
        error:
          (created as { error?: string }).error ??
          'Registration failed, please try again later',
      };
    }

    try {
      await userLoginViaGo(username, password);
    } catch (loginErr) {
      logger.error('注册后自动登录失败', loginErr, {
        username,
        action: 'userRegister:autologin',
      });
      // 登录失败不影响注册成功结果；返回成功前端自行跳转
    }

    return {
      success: true,
      message: 'Registration successful',
      user: { id: account.id, username: account.username },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error ?? '');
    // Go /api/accounts 已存在会返回 4xx + error 文本
    if (msg.includes('已被占用') || /username.*(take|exist|duplicate)/i.test(msg)) {
      return { success: false, error: 'Username already exists' };
    }
    logger.error('Registration failed', error, {
      username,
      action: 'userRegister',
    });
    return {
      success: false,
      error: 'Registration failed, please try again later',
    };
  }
}

export async function userLogout() {
  return userLogoutViaGo();
}

export async function checkUserLogin() {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not logged in' };
  }
  return {
    success: true,
    user: { id: user.id, username: user.username },
  };
}

/**
 * Google OAuth 登录：按与用户确认的 V2 方案，本轮直接停用（仅保留函数壳 + 明确报错）。
 * 避免老代码调用时出现奇怪错误。
 */
export async function userLoginWithGoogle(_redirectTo: string = '/chat') {
  return { success: false, error: 'Google login is disabled in this build.' };
}
