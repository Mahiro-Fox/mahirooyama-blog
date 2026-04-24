import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

import { sessionStore } from '@/lib/session-store';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin-session');

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 验证 token
    const { payload } = await jwtVerify(token.value, JWT_SECRET);

    // 检查会话是否存在（单设备登录验证）
    if (!sessionStore.exists(token.value)) {
      return NextResponse.json(
        { error: '会话已在其他设备上失效，请重新登录' },
        { status: 401 }
      );
    }

    // 更新会话最后使用时间
    sessionStore.update(token.value);

    return NextResponse.json({
      success: true,
      userId: payload.userId,
      username: payload.username,
      avatar: payload.avatar,
      role: payload.role,
      loggedInAt: payload.loggedInAt,
      expiresAt: payload.exp,
      sessionId: payload.sessionId,
    });
  } catch (error) {
    // Token 无效或过期
    return NextResponse.json(
      { error: '登录已过期，请重新登录' },
      { status: 401 }
    );
  }
}
