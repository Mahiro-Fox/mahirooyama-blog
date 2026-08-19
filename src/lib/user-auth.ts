'use server';

import { cookies } from 'next/headers';
import { USER_SESSION_COOKIE } from '@/constant/auth';
import { goFetch } from '@/lib/server/api-client';

type UserVerifyResponse = {
  success: boolean;
  error?: string;
  accountId?: string;
  username?: string;
  email?: string;
  loggedInAt?: string;
  expiresAt?: number;
  sessionId?: string;
  recoveredSession?: boolean;
};

type UserLoginResponse = {
  token: string;
  account: { id: string; username: string; email?: string | null; provider?: string; createdAt?: string };
  expiresIn: number;
  sessionId: string;
  loggedInAt: string;
};

export type CurrentUser = {
  id: string;
  username: string;
  email?: string | null;
};

type CookieStoreLike = {
  set: (name: string, value: string, options?: Record<string, unknown>) => void;
  delete: (name: string) => void;
};

function setCookie(
  cookieStore: CookieStoreLike,
  name: string,
  value: string,
  maxAgeSec: number
): void {
  const isSecure =
    process.env.COOKIE_SECURE === 'true' ||
    (process.env.COOKIE_SECURE !== 'false' &&
      process.env.NODE_ENV === 'production');
  cookieStore.set(name, value, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'strict',
    maxAge: maxAgeSec,
    path: '/',
  });
}

/**
 * Server Components/Actions 中获取当前前台登录用户（切走 next-auth → 调 Go 鉴权）
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(USER_SESSION_COOKIE);
    if (!token?.value) return null;
    const res = await goFetch<UserVerifyResponse>('/api/user/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token: token.value }),
    });
    if (!res?.success || !res.accountId || !res.username) return null;
    return {
      id: res.accountId,
      username: res.username,
      email: res.email ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * 用于 Server Action：{ success, userId, username, error }
 */
export async function verifyUserAuth() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(USER_SESSION_COOKIE);
    if (!token?.value) {
      return { success: false as const, error: 'Not logged in' };
    }
    const res = await goFetch<UserVerifyResponse>('/api/user/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token: token.value }),
    });
    if (!res?.success || !res.accountId) {
      return { success: false as const, error: res?.error ?? 'Session expired' };
    }
    return {
      success: true as const,
      userId: res.accountId,
      username: res.username,
    };
  } catch {
    return { success: false as const, error: 'Session expired' };
  }
}

// —— 给 actions/user-auth.ts 调用的内部辅助 ——

export async function userLoginViaGo(username: string, password: string) {
  const res = await goFetch<UserLoginResponse>('/api/user/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  const cookieStore = await cookies();
  setCookie(cookieStore, USER_SESSION_COOKIE, res.token, res.expiresIn);
  return res;
}

export async function userLogoutViaGo(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value ?? '';
  try {
    if (token) {
      await goFetch<{ success: boolean }>('/api/user/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
    }
  } catch {
    // 尽力而为
  }
  cookieStore.delete(USER_SESSION_COOKIE);
  return { success: true };
}
