import fs from 'fs/promises';
import path from 'path';
import { DATA_DIR } from '@/constant/dir';
import type { UserRole } from '@/store/user-store';

import type { Permission } from '@/lib/permissions';

/**
 * 角色权限配置存储
 * 管理 data/role-permissions.json 文件
 */

const ROLE_PERMISSIONS_FILE = path.join(DATA_DIR, 'role-permissions.json');

/**
 * 默认角色权限配置
 * 当文件不存在时使用此配置初始化
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: ['*'], // 超级管理员拥有所有权限

  user: [
    // 用户权限：只能查看用户列表和修改自己的密码
    'users:read',
    'users:updatePassword',

    // 博客权限：完整的CRUD
    'blog:read',
    'blog:create',
    'blog:update',
    'blog:delete',

    // 图库权限：完整的CRUD
    'gallery:read',
    'gallery:create',
    'gallery:update',
    'gallery:delete',
    // tag权限：完整的CRUD
    'tag:read',
    'tag:create',
    'tag:update',
    'tag:delete',
    'tag:reset',

    // 文件权限：完整的文件管理
    'files:read',
    'files:upload',
    'files:update',
    'files:delete',
    'files:manageFolder',

    // 系统权限：可以刷新缓存
    'system:revalidate',
  ],
};

/**
 * 所有可用的权限列表（用于前端展示）
 */
export const ALL_PERMISSIONS: {
  group: string;
  permissions: { value: Permission; label: string; description: string }[];
}[] = [
  {
    group: '用户管理',
    permissions: [
      { value: 'users:read', label: '查看用户', description: '查看用户列表' },
      {
        value: 'users:create',
        label: '创建用户',
        description: '创建新用户（仅超级管理员）',
      },
      {
        value: 'users:update',
        label: '修改用户',
        description: '修改其他用户信息',
      },
      {
        value: 'users:delete',
        label: '删除用户',
        description: '删除用户（仅超级管理员）',
      },
      {
        value: 'users:updatePassword',
        label: '修改密码',
        description: '修改自己的密码',
      },
      {
        value: 'users:updateRole',
        label: '修改角色',
        description: '修改用户角色（仅超级管理员）',
      },
    ],
  },
  {
    group: '博客管理',
    permissions: [
      {
        value: 'blog:read',
        label: '查看博客',
        description: '查看博客列表和内容',
      },
      {
        value: 'blog:create',
        label: '创建博客',
        description: '创建新博客文章',
      },
      { value: 'blog:update', label: '更新博客', description: '修改博客文章' },
      { value: 'blog:delete', label: '删除博客', description: '删除博客文章' },
    ],
  },
  {
    group: '图库管理',
    permissions: [
      { value: 'gallery:read', label: '查看图库', description: '查看图库列表' },
      {
        value: 'gallery:create',
        label: '创建图库',
        description: '创建新图库项',
      },
      { value: 'gallery:update', label: '更新图库', description: '修改图库项' },
      { value: 'gallery:delete', label: '删除图库', description: '删除图库项' },
    ],
  },
  {
    group: '标签管理',
    permissions: [
      { value: 'tag:read', label: '查看标签', description: '查看标签列表' },
      { value: 'tag:create', label: '创建标签', description: '创建新标签' },
      { value: 'tag:update', label: '更新标签', description: '修改标签' },
      { value: 'tag:delete', label: '删除标签', description: '删除标签' },
      { value: 'tag:reset', label: '重置标签', description: '重置标签' },
    ],
  },
  {
    group: '文件管理',
    permissions: [
      { value: 'files:read', label: '查看文件', description: '浏览文件列表' },
      { value: 'files:upload', label: '上传文件', description: '上传新文件' },
      {
        value: 'files:update',
        label: '重命名文件',
        description: '重命名文件/文件夹',
      },
      {
        value: 'files:delete',
        label: '删除文件',
        description: '删除文件/文件夹',
      },
      {
        value: 'files:manageFolder',
        label: '管理文件夹',
        description: '创建/删除文件夹',
      },
    ],
  },
  {
    group: '系统权限',
    permissions: [
      {
        value: 'system:revalidate',
        label: '刷新缓存',
        description: '刷新页面缓存',
      },
      {
        value: 'system:convertImages',
        label: '转换图片',
        description: '批量转换图片格式',
      },
    ],
  },
];

// 内存缓存
let cachedRolePermissions: Record<UserRole, Permission[]> | null = null;

/**
 * 确保数据文件存在
 */
async function ensureDataFile(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  try {
    await fs.access(ROLE_PERMISSIONS_FILE);
  } catch {
    // 创建默认配置文件
    await fs.writeFile(
      ROLE_PERMISSIONS_FILE,
      JSON.stringify(DEFAULT_ROLE_PERMISSIONS, null, 2)
    );
  }
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
  await fs.writeFile(
    ROLE_PERMISSIONS_FILE,
    JSON.stringify(permissions, null, 2)
  );

  // 更新缓存
  cachedRolePermissions = permissions;
}

/**
 * 清除缓存（用于强制重新加载）
 */
export function clearRolePermissionsCache(): void {
  cachedRolePermissions = null;
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
