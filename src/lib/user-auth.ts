'use server';

import { auth } from '@/auth';
import { accountStore } from '@/store/account-store';

export type CurrentUser = {
  id: string;
  username: string;
  email?: string | null;
};

/**
 * 在 Server Components / Server Actions 中获取当前登录用户。
 * 使用 next-auth 的 auth() 读取 session，替代原读 user-session cookie + jose jwtVerify 的实现。
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;

    // 二次校验：account.json 仍存在（防止账号被删后 session 仍有效）
    const account = await accountStore.getById(String(session.user.id));
    if (!account) return null;

    return {
      id: String(account.id),
      username: String(account.username),
      email: account.email,
    };
  } catch {
    return null;
  }
}

/**
 * 在 API Routes 中校验鉴权。
 * 返回值兼容原签名（去掉 sessionId，下游无人使用）。
 */
export async function verifyUserAuth() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false as const, error: 'Not logged in' };
    }

    const account = await accountStore.getById(String(session.user.id));
    if (!account) {
      return { success: false as const, error: 'Account not found' };
    }

    return {
      success: true as const,
      userId: String(account.id),
      username: account.username,
    };
  } catch {
    return { success: false as const, error: 'Session expired' };
  }
}
