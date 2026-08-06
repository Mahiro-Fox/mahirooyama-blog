import fs from 'fs/promises';
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  type Permission,
} from '@/constant';
import type { UserRole } from '@/store/user-store';
import { DATA_DIR, ROLE_PERMISSIONS_FILE } from '@/constant/dir';
import {
  ensureDirectory,
  ensureFileInitialized,
  writeFileAtomic,
} from '@/utils/file-utils';

/**
 * 角色权限配置存储
 * 管理 data/role-permissions.json 文件
 */

// 内存缓存
let cachedRolePermissions: Record<UserRole, Permission[]> | null = null;

/**
 * 确保数据文件存在
 */
async function ensureDataFile(): Promise<void> {
  await ensureDirectory(DATA_DIR);
  await ensureFileInitialized(
    ROLE_PERMISSIONS_FILE,
    JSON.stringify(DEFAULT_ROLE_PERMISSIONS, null, 2)
  );
}

/**
 * 读取角色权限配置
 */
async function readRolePermissions(): Promise<Record<UserRole, Permission[]>> {
  // 如果有缓存，直接返回
  if (cachedRolePermissions) {
    return cachedRolePermissions;
  }

  await ensureDataFile();
  const data = await fs.readFile(ROLE_PERMISSIONS_FILE, 'utf-8');
  const permissions = JSON.parse(data) as Record<UserRole, Permission[]>;

  // 更新缓存
  cachedRolePermissions = permissions;
  return permissions;
}

/**
 * 写入角色权限配置
 */
async function writeRolePermissions(
  permissions: Record<UserRole, Permission[]>
): Promise<void> {
  await ensureDataFile();
  await writeFileAtomic(
    ROLE_PERMISSIONS_FILE,
    JSON.stringify(permissions, null, 2),
    { encoding: 'utf-8' }
  );

  // 更新缓存
  cachedRolePermissions = permissions;
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

    // super_admin 始终拥有所有权限
    if (role === 'super_admin') {
      return ['*'];
    }

    return permissions[role] || DEFAULT_ROLE_PERMISSIONS[role] || [];
  },

  /**
   * 更新角色权限配置
   * @param role 角色
   * @param permissions 权限列表
   */
  async updateRole(role: UserRole, permissions: Permission[]): Promise<void> {
    // 不能修改 super_admin 的权限（始终为 '*'）
    if (role === 'super_admin') {
      throw new Error('不能修改超级管理员的权限');
    }

    const allPermissions = await readRolePermissions();
    allPermissions[role] = permissions;
    await writeRolePermissions(allPermissions);
  },

  /**
   * 批量更新角色权限配置
   */
  async updateAll(permissions: Record<UserRole, Permission[]>): Promise<void> {
    // 确保 super_admin 始终为 '*'
    const newPermissions = { ...permissions };
    newPermissions.super_admin = ['*'];

    await writeRolePermissions(newPermissions);
  },

  /**
   * 检查角色是否拥有指定权限
   */
  async hasPermission(
    role: UserRole,
    permission: Permission
  ): Promise<boolean> {
    // super_admin 拥有所有权限
    if (role === 'super_admin') {
      return true;
    }

    const permissions = await this.getByRole(role);
    return permissions.includes(permission);
  },

  /**
   * 重置为默认配置
   */
  async resetToDefault(): Promise<void> {
    await writeRolePermissions(DEFAULT_ROLE_PERMISSIONS);
  },

  /**
   * 获取所有可用权限定义（用于前端）
   */
  getAllPermissionDefinitions() {
    return ALL_PERMISSIONS;
  },
};
