'use server';

import { sessionStore } from '@/store/session-store';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE } from '@/constant/auth';

export async function adminLogout() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (token) {
    sessionStore.delete(token);
  }

  cookieStore.delete(ADMIN_SESSION_COOKIE);

  return { success: true };
}
