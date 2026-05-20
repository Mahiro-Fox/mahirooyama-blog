'use server';

import { Permission } from '@/constant';
import { rolePermissionStore } from '@/store/role-permission-store';
import type { UserRole } from '@/store/user-store';

import { requirePermission } from '@/lib/permissions';

export async function adminGetRolePermissions() {
  const permissionCheck = await requirePermission('users:read');
  if (!permissionCheck.allowed) {
    return { success: false as const, error: 'unauthorized' };
  }

  const permissions = await rolePermissionStore.getAll();
  const definitions = rolePermissionStore.getAllPermissionDefinitions();

  return { success: true as const, permissions, definitions };
}

export async function adminUpdateRolePermissions(input: {
  role: UserRole;
  permissions: Permission[];
}) {
  const permissionCheck = await requirePermission('users:updateRole');
  if (!permissionCheck.allowed) {
    return { success: false as const, error: 'unauthorized' };
  }

  if (!input.role || !Array.isArray(input.permissions)) {
    return {
      success: false as const,
      error: '缺少必要字段：role 和 permissions',
    };
  }

  if (input.role === 'super_admin') {
    return { success: false as const, error: '不能修改超级管理员的权限' };
  }

  await rolePermissionStore.updateRole(input.role, input.permissions);

  return { success: true as const };
}

export async function adminResetRolePermissions() {
  const permissionCheck = await requirePermission('users:updateRole');
  if (!permissionCheck.allowed) {
    return { success: false as const, error: 'unauthorized' };
  }

  await rolePermissionStore.resetToDefault();
  const permissions = await rolePermissionStore.getAll();

  return { success: true as const, permissions };
}
