'use server';

import { signIn, signOut } from '@/auth';
import { accountStore } from '@/store/account-store';
import { AuthError } from 'next-auth';
import { loginRateLimiter } from '@/lib/rate-limit';
import { getCurrentUser } from '@/lib/user-auth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('UserAuthAction');

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

    // 限流（在 server action 层做，便于把 resetTime 返回给前端）
    const rateLimit = await loginRateLimiter.check(`user-login:${username}`);
    if (!rateLimit.success) {
      return {
        success: false,
        error: 'Too many attempts, please try again later',
        resetTime: rateLimit.resetTime,
      };
    }

    // 调用 next-auth 的 signIn（credentials provider）
    // redirect: false → 不抛 NEXT_REDIRECT，返回错误对象
    await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    // signIn 成功 → 查 account 返回用户信息
    const account = await accountStore.getByUsername(username);
    if (!account) {
      return { success: false, error: 'Login failed, please try again' };
    }

    return {
      success: true,
      message: 'Login successful',
      user: { id: account.id, username: account.username },
    };
  } catch (error) {
    if (error instanceof AuthError) {
      // CredentialsSignin = authorize 返回 null
      return { success: false, error: 'Invalid username or password' };
    }
    logger.error('Login failed', error, {
      username,
      action: 'userLogin',
    });
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
  | { success: false; error: string }
> {
  try {
    if (!username || !password) {
      return { success: false, error: 'Username and password required' };
    }

    if (username.length < 3) {
      return {
        success: false,
        error: 'Username must be at least 3 characters',
      };
    }

    if (password.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters',
      };
    }

    const existing = await accountStore.getByUsername(username);
    if (existing) {
      return { success: false, error: 'Username already exists' };
    }

    const account = await accountStore.create({ username, password });

    // 注册成功后自动登录
    await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    return {
      success: true,
      message: 'Registration successful',
      user: { id: account.id, username: account.username },
    };
  } catch (error) {
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
  await signOut({ redirect: false });
  return { success: true };
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
 * Google OAuth 登录（Server Action，供 signin 页的按钮调用）。
 * signIn('google') 会抛 NEXT_REDIRECT，由 Next.js server action runtime 处理。
 */
export async function userLoginWithGoogle(redirectTo: string = '/chat') {
  await signIn('google', { redirectTo });
}
