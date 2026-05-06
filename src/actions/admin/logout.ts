'use server';

import { cookies } from 'next/headers';
import { sessionStore } from '@/store/session-store';

export async function adminLogout() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-session')?.value;

  if (token) {
    sessionStore.delete(token);
  }

  cookieStore.delete('admin-session');

  return { success: true };
}
