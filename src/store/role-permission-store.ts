import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  type Permission,
} from '@/constant';
import type { UserRole } from '@/store/user-store';
import { goFetch } from '@/lib/server/api-client';

/**
 * 角色权限配置存储
 * 数据持久化由 Go 后端管理，本地保留内存缓存与权限定义常量。
 */

interface RolePermissionRow {
  role: UserRole;
  permissions: Permission[];
}

// 内存缓存
let cachedRolePermissions: Record<UserRole, Permission[]> | null = null;

/**
 * 从 Go 后端加载全部角色权限
 */
async function loadFromGo(): Promise<Record<UserRole, Permission[]>> {
  const rows = await goFetch<RolePermissionRow[]>(
    '/api/admin/role-permissions'
  );
  const result: Record<UserRole, Permission[]> = {
    super_admin: ['*'],
    user: DEFAULT_ROLE_PERMISSIONS.user,
  };
  for (const row of rows) {
    if (row.role === 'super_admin') {
      result.super_admin = ['*'];
    } else {
      result[row.role] = row.permissions;
    }
  }
  return result;
}

/**
 * 读取角色权限配置（带内存缓存）
 */
async function readRolePermissions(): Promise<Record<UserRole, Permission[]>> {
  if (cachedRolePermissions) {
    return cachedRolePermissions;
  }
  try {
    cachedRolePermissions = await loadFromGo();
  } catch {
    // Go 后端不可用时回退默认值
    cachedRolePermissions = { ...DEFAULT_ROLE_PERMISSIONS };
  }
  return cachedRolePermissions;
}

/**
 * 角色权限存储接口
 */
export const rolePermissionStore = {
  /**
   * 获取所有角色权限配置
   */
  async getAll(): Promise<Record<UserRole, Permission[]>> {
    return readRolePermissions();
  },

  /**
   * 获取指定角色的权限
   */
  async getByRole(role: UserRole): Promise<Permission[]> {
    const permissions = await readRolePermissions();

    if (role === 'super_admin') {
      return ['*'];
    }
    return permissions[role] || DEFAULT_ROLE_PERMISSIONS[role] || [];
  },

  /**
   * 更新角色权限配置（写入 Go 后端并刷新缓存）
   * @param role 角色
   * @param permissions 权限列表
   */
  async updateRole(role: UserRole, permissions: Permission[]): Promise<void> {
    if (role === 'super_admin') {
      throw new Error('不能修改超级管理员的权限');
    }
    await goFetch('/api/admin/role-permissions', {
      method: 'PUT',
      body: JSON.stringify({ role, permissions }),
    });
    // 刷新缓存
    cachedRolePermissions = null;
  },

  /**
   * 批量更新角色权限配置
   */
  async updateAll(permissions: Record<UserRole, Permission[]>): Promise<void> {
    const newPermissions = { ...permissions };
    newPermissions.super_admin = ['*'];
    for (const [role, perms] of Object.entries(newPermissions)) {
      if (role === 'super_admin') continue;
      await goFetch('/api/admin/role-permissions', {
        method: 'PUT',
        body: JSON.stringify({ role, permissions: perms }),
      });
    }
    cachedRolePermissions = null;
  },

  /**
   * 检查角色是否拥有指定权限
   */
  async hasPermission(
    role: UserRole,
    permission: Permission
  ): Promise<boolean> {
    if (role === 'super_admin') {
      return true;
    }
    const permissions = await this.getByRole(role);
    return permissions.includes(permission);
  },

  /**
   * 重置为默认配置（删除 Go 端记录，让加载时使用 DEFAULT_ROLE_PERMISSIONS）
   */
  async resetToDefault(): Promise<void> {
    // 逐角色更新为默认值
    for (const [role, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      if (role === 'super_admin') continue;
      await goFetch('/api/admin/role-permissions', {
        method: 'PUT',
        body: JSON.stringify({ role, permissions: perms }),
      });
    }
    cachedRolePermissions = null;
  },

  /**
   * 获取所有可用权限定义（用于前端）
   */
  getAllPermissionDefinitions() {
    return ALL_PERMISSIONS;
  },
};
