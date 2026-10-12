import { accountStore } from '@/store/account-store';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/permissions';
import { getAdminActionContext } from '@/utils/action-response';
import FrontUsersClient from './front-users-client';

export default async function FrontUsersPage() {
  // 权限校验：需要 accounts:read
  const permissionCheck = await requirePermission('accounts:read');
  if (!permissionCheck.allowed || !permissionCheck.user) {
    redirect('/admin?toast=unauthorized&message=无权限访问前台用户管理');
  }

  const currentUser = permissionCheck.user;
  // Go 端 GET /api/admin/accounts 需要会话，显式透传身份
  const ctx = await getAdminActionContext();
  const accounts = await accountStore.getAll(ctx);

  return (
    <FrontUsersClient
      initialAccounts={accounts}
      currentUser={{
        id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
      }}
    />
  );
}
