'use server';

import { sessionStore } from '@/store/session-store';
import { cookies } from 'next/headers';

export async function adminLogout() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-session')?.value;

  if (token) {
    sessionStore.delete(token);
  }

  cookieStore.delete('admin-session');

  return { success: true };
}
