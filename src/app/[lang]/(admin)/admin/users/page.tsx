import { userStore } from '@/store/user-store';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/permissions';
import { getAdminActionContext } from '@/utils/action-response';
import UsersClient from './users-client';

export default async function UsersPage() {
  // Check permission
  const permissionCheck = await requirePermission('users:read');
  if (!permissionCheck.allowed || !permissionCheck.user) {
    redirect('/admin?toast=unauthorized&message=无权限访问用户管理');
  }

  const currentUser = permissionCheck.user;
  // Go 端 GET /api/admin/users 需要会话，显式透传身份
  const ctx = await getAdminActionContext();
  const users = await userStore.getAll(ctx);

  return (
    <UsersClient
      initialUsers={users}
      currentUser={{
        id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
      }}
    />
  );
}
