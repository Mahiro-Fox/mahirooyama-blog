'use server';

import { ALL_PERMISSIONS, Permission } from '@/constant';
import { rolePermissionStore } from '@/store/role-permission-store';
import { UserRole } from '@/store/user-store';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { createLogger } from '@/utils/logger';

const logger = createLogger('RolePermissionActions');

export async function adminGetRolePermissions(): Promise<
  ActionResponse<{
    permissions: Record<UserRole, Permission[]>;
    definitions: typeof ALL_PERMISSIONS;
  }>
> {
  return withActionPermission('users:read', async () => {
    try {
      const permissions = await rolePermissionStore.getAll();
      const definitions = rolePermissionStore.getAllPermissionDefinitions();

      return { success: true, data: { permissions, definitions } };
    } catch {
      return { success: false, error: '获取角色权限失败' };
    }
  });
}

export async function adminUpdateRolePermissions(input: {
  role: UserRole;
  permissions: Permission[];
}): Promise<ActionResponse<void>> {
  return withActionPermission(
    'users:updateRole',
    async (user) => {
      if (!input.role || !Array.isArray(input.permissions)) {
        return {
          success: false,
          error: '缺少必要字段：role 和 permissions',
        };
      }

      if (input.role === 'super_admin') {
        return { success: false, error: '不能修改超级管理员的权限' };
      }

      await rolePermissionStore.updateRole(input.role, input.permissions);

      logger.info('更新角色权限成功', { role: input.role, userId: user.id });
      return { success: true, data: undefined };
    },
    { rateLimitKey: 'role' }
  );
}

export async function adminResetRolePermissions(): Promise<
  ActionResponse<Record<UserRole, Permission[]>>
> {
  return withActionPermission(
    'users:updateRole',
    async (user) => {
      await rolePermissionStore.resetToDefault();
      const permissions = await rolePermissionStore.getAll();

      logger.warn('重置角色权限为默认值', { userId: user.id });
      return { success: true, data: permissions };
    },
    { rateLimitKey: 'role' }
  );
}
