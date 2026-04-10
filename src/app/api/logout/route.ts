import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { sessionStore } from '@/lib/session-store';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-session')?.value;

  // 删除服务端会话记录
  if (token) {
    sessionStore.delete(token);
  }

  // 删除 cookie
  cookieStore.delete('admin-session');

  return NextResponse.json({
    success: true,
    message: '登出成功',
  });
}
