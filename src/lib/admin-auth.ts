'use server';

import { cookies } from 'next/headers';
import { JWT_SECRET } from '@/constant';
import { sessionStore } from '@/store/session-store';
import { jwtVerify, type JWTPayload } from 'jose';

type AdminSessionPayload = JWTPayload & {
  userId?: string;
  username?: string;
  avatar?: string;
  role?: string;
  sessionId?: string;
};

export type CurrentAdminUser = {
  id: string;
  username: string;
  avatar: string;
  role: string;
};

export async function getCurrentAdminUser(): Promise<CurrentAdminUser | null> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('admin-session');
    if (!tokenCookie?.value) return null;

    const payload = await verifyJwtToken(tokenCookie.value);
    if (!payload) return null;

    if (!payload.userId || !payload.username) return null;

    // Note: We don't check sessionStore.exists() here because
    // in dev mode (pnpm dev), Server Components may run in different
    // processes where the in-memory sessionStore is not shared.
    // The JWT signature verification is sufficient for Server Components.
    // Session validation (single-device login) is enforced in API Routes.

    return {
      id: String(payload.userId),
      username: String(payload.username),
      avatar: String(
        payload.avatar || '/uploads/images/avatar/default-avatar.webp'
      ),
      role: String(payload.role || 'user'),
    };
  } catch {
    return null;
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
    const payload = await verifyJwtToken(token.value);
    if (!payload) {
      return { success: false, error: '登录已过期，请重新登录' };
    }

    // 检查会话是否存在
    if (!sessionStore.exists(token.value)) {
      // 如果 JWT 有效但内存会话丢失（通常是因为服务器重启）
      // 我们基于 JWT payload 恢复会话，以避免用户被迫重新登录
      if (payload.userId && payload.sessionId) {
        sessionStore.create(token.value, {
          userId: String(payload.userId),
          sessionId: String(payload.sessionId),
        });
      } else {
        return {
          success: false,
          error: '会话已在其他设备上失效，请重新登录',
        };
      }
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
  } catch {
    return { success: false, error: '登录已过期，请重新登录' };
  }
}

async function verifyJwtToken(
  token: string
): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as AdminSessionPayload;
  } catch {
    return null;
  }
}
