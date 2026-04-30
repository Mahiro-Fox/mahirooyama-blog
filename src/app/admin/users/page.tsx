import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { userStore } from '@/store/user-store';
import { jwtVerify } from 'jose';

import { requirePermission } from '@/lib/permissions';

import UsersClient from './users-client';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin-session');
    if (!token?.value) return null;

    const { payload } = await jwtVerify(token.value, JWT_SECRET);
    if (!payload.userId || !payload.username) return null;

    return {
      id: String(payload.userId),
      username: String(payload.username),
      role: String(payload.role || 'user'),
    };
  } catch {
    return null;
  }
}

export default async function UsersPage() {
  // Check permission
  const permissionCheck = await requirePermission('users:read');
  if (!permissionCheck.allowed) {
    redirect('/admin?toast=unauthorized&message=无权限访问用户管理');
  }

  // Auth is handled by parent layout, just get current user for client
  const currentUser = await getCurrentUser();
  const users = await userStore.getAll();

  return (
    <UsersClient
      initialUsers={users}
      currentUser={{
        id: currentUser?.id || '',
        username: currentUser?.username || '',
        role: (currentUser?.role as 'super_admin' | 'user') || 'user',
      }}
    />
  );
}
