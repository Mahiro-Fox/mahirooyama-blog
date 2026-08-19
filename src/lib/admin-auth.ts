'use server';

import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE } from '@/constant/auth';
import { goFetch } from '@/lib/server/api-client';

type AdminVerifyResponse = {
  success: boolean;
  error?: string;
  userId?: string;
  username?: string;
  avatar?: string;
  role?: string;
  mustChangePassword?: boolean;
  loggedInAt?: string;
  expiresAt?: number;
  sessionId?: string;
  recoveredSession?: boolean;
};

type AdminLoginResponse = {
  token: string;
  user: {
    id: string;
    username: string;
    avatar: string;
    role: string;
    mustChangePassword?: boolean;
    lastUpdated?: string;
  };
  expiresIn: number;
  mustChangePassword?: boolean;
  sessionId: string;
  loggedInAt: string;
};

/**
 * 后台鉴权：读 cookie → 调 Go /api/admin/auth/verify
 * 保持 verifyAuth() 原返回形状：{success, userId, username, avatar, role, mustChangePassword, loggedInAt, expiresAt, sessionId, error}
 * 不直接在 Next 端验 JWT，避免前后端双份算法维护。
 */
export async function verifyAuth(): Promise<{
  success: boolean;
  error?: string;
  userId?: string;
  username?: string;
  avatar?: string;
  role?: string;
  mustChangePassword?: boolean;
  loggedInAt?: string;
  expiresAt?: number;
  sessionId?: string;
}> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE);
    if (!token?.value) {
      return { success: false, error: '未登录' };
    }
    const res = await goFetch<AdminVerifyResponse>('/api/admin/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token: token.value }),
    });
    if (!res || !res.success) {
      return {
        success: false,
        error: res?.error ?? '登录已过期，请重新登录',
      };
    }
    return {
      success: true,
      userId: res.userId,
      username: res.username,
      avatar: res.avatar,
      role: res.role,
      mustChangePassword: res.mustChangePassword,
      loggedInAt: res.loggedInAt,
      expiresAt: res.expiresAt,
      sessionId: res.sessionId,
    };
  } catch {
    return { success: false, error: '登录已过期，请重新登录' };
  }
}

/**
 * 内部辅助：把 go login 返回值写到 admin-session cookie
 * 返回值暴露给 actions/admin/auth.ts::login 直接使用
 */
export async function adminLoginViaGo(
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
  | { success: false; error: string }
> {
  try {
    const res = await goFetch<AdminLoginResponse>('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      parseJson: true,
    });
    const cookieStore = await cookies();
    setCookie(cookieStore, ADMIN_SESSION_COOKIE, res.token, res.expiresIn);
    return {
      success: true,
      message: '登录成功',
      expiresIn: res.expiresIn,
      sessionId: res.sessionId,
      loggedInAt: res.loggedInAt,
      user: {
        id: res.user.id,
        username: res.user.username,
        avatar: res.user.avatar,
        role: res.user.role,
        mustChangePassword: res.user.mustChangePassword,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err ?? '');
    if (msg.includes('返回 401')) {
      const body = (() => {
        try {
          const idx = msg.indexOf('返回 401:');
          if (idx < 0) return '';
          const raw = msg.slice(idx + '返回 401:'.length).trim();
          if (!raw) return '';
          const json = JSON.parse(raw) as { error?: string };
          return json.error ?? '';
        } catch {
          return '';
        }
      })();
      return { success: false, error: body || '用户名或密码错误' };
    }
    return { success: false, error: '登录失败，请稍后重试' };
  }
}

/**
 * 内部辅助：调用 go logout → 删 cookie
 */
export async function adminLogoutViaGo(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? '';
  try {
    if (token) {
      await goFetch<{ success: boolean }>('/api/admin/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
    }
  } catch {
    // 尽力而为，即使 go 端失败也继续删 cookie
  }
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  return { success: true };
}

// —— helpers ——
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
