'use server';

import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

import { JWT_SECRET } from '@/constant';
import { sessionStore } from '@/store/session-store';

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
