import { sessionStore } from '@/store/session-store';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/constant/auth';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  // 删除服务端会话记录
  if (token) {
    sessionStore.delete(token);
  }

  // 删除 cookie
  cookieStore.delete(ADMIN_SESSION_COOKIE);

  return NextResponse.json({
    success: true,
    message: '登出成功',
  });
}
