'use server';

import {
  userStore,
  type UserResponse,
  type UserRole,
} from '@/store/user-store';

import { requireAuth, requirePermission } from '@/lib/permissions';

export async function adminGetUsers(): Promise<
  { success: true; users: UserResponse[] } | { success: false; error: string }
> {
  const permissionCheck = await requirePermission('users:read');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  const users = await userStore.getAll();
  return { success: true, users };
}

export async function adminCreateUser(input: {
  username: string;
  password: string;
  role: UserRole;
}): Promise<{ success: true } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('users:create');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  if (!input.username || !input.password || !input.role) {
    return { success: false, error: '缺少必要字段' };
  }

  if (!['super_admin', 'user'].includes(input.role)) {
    return { success: false, error: '无效的角色类型' };
  }

  await userStore.create({
    username: input.username,
    password: input.password,
    role: input.role,
  });

  return { success: true };
}

export async function adminDeleteUser(input: {
  id: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('users:delete');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  const currentUser = permissionCheck.user!;

  if (currentUser.id === input.id) {
    return { success: false, error: '不能删除自己' };
  }

  const deleted = await userStore.delete(input.id);
  if (!deleted) {
    return { success: false, error: '用户不存在' };
  }

  return { success: true };
}

export async function adminUpdateUserPassword(input: {
  id: string;
  password: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const authCheck = await requireAuth();
  if (!authCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  const currentUser = authCheck.user!;
  const isSelf = currentUser.id === input.id;
  const isSuperAdmin = currentUser.role === 'super_admin';

  if (!input.password) {
    return { success: false, error: '请提供新密码' };
  }

  if (isSuperAdmin) {
    // super_admin 修改其他用户密码需要 users:update 权限
    if (!isSelf) {
      const permCheck = await requirePermission('users:update');
      if (!permCheck.allowed) {
        return { success: false, error: 'unauthorized' };
      }
    }
  } else {
    // 普通用户只能修改自己密码
    if (!isSelf) {
      return { success: false, error: '只能修改自己的信息' };
    }

    const permCheck = await requirePermission('users:updatePassword');
    if (!permCheck.allowed) {
      return { success: false, error: 'unauthorized' };
    }
  }

  const updated = await userStore.update(input.id, {
    password: input.password,
  });
  if (!updated) {
    return { success: false, error: '目标用户不存在' };
  }

  return { success: true };
}
