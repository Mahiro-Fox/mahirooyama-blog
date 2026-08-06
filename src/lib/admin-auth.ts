'use server';

import { sessionStore } from '@/store/session-store';
import { userStore } from '@/store/user-store';
import { jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, JWT_SECRET } from '@/constant/auth';

type AdminSessionPayload = JWTPayload & {
  userId?: string;
  username?: string;
  avatar?: string;
  role?: string;
  sessionId?: string;
};


export async function verifyAuth() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE);

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

    // JWT 仅作为身份凭证；头像/用户名/角色等展示信息以 userStore 中的最新数据为准，
    // 避免 token 中的字段在用户更新后过期（例如头像上传后刷新页面回退到旧值）。
    const freshUser = await userStore.getById(String(payload.userId));
    if (!freshUser) {
      // 用户已被删除：会话无效
      return { success: false, error: '用户不存在或已被删除' };
    }

    return {
      success: true,
      userId: payload.userId,
      username: freshUser.username,
      avatar: freshUser.avatar || '/uploads/images/avatar/default-avatar.webp',
      role: freshUser.role,
      mustChangePassword: freshUser.mustChangePassword,
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
