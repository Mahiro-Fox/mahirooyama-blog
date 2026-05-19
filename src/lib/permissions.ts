import { NextResponse } from 'next/server';
import { rolePermissionStore } from '@/store/role-permission-store';
import {
  PermissionChecker,
  userStore,
  type User,
  type UserRole,
} from '@/store/user-store';

import { verifyAuth } from './auth';

/**
 * RBAC 权限系统
 * 权限命名规范: <模块>:<操作>
 * 模块: users, blog, gallery, files, system
 * 操作: read, create, update, delete, special (特殊操作)
 */
export type Permission =
  // 用户管理权限
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'users:updateRole' // 修改角色（仅super_admin）
  | 'users:updatePassword' // 修改密码
  // 博客管理权限
  | 'blog:read'
  | 'blog:create'
  | 'blog:update'
  | 'blog:delete'
  // 图库管理权限
  | 'gallery:read'
  | 'gallery:create'
  | 'gallery:update'
  | 'gallery:delete'

  // 标签管理权限
  | 'tag:read'
  | 'tag:create'
  | 'tag:update'
  | 'tag:delete'
  | 'tag:reset'

  // 文件管理权限（public files）
  | 'files:read'
  | 'files:upload'
  | 'files:update'
  | 'files:delete'
  | 'files:manageFolder' // 创建/删除文件夹

  // MIDI 文件管理权限
  | 'midi:read'
  | 'midi:create'
  | 'midi:update'
  | 'midi:delete'

  // 碎碎念管理权限
  | 'moments:read'
  | 'moments:create'
  | 'moments:update'
  | 'moments:delete'

  // 留言墙管理权限
  | 'guestbook:read'
  | 'guestbook:create'
  | 'guestbook:update'
  | 'guestbook:delete'
  | 'guestbook:approve' // 审核留言

  // 系统特殊权限
  | 'system:revalidate' // 刷新缓存
  | 'system:convertImages' // 转换图片
  | '*'; // 通配符：所有权限

// 操作到权限的映射（向后兼容）
export type ActionType = 'create' | 'read' | 'update' | 'delete';

/**
 * 默认角色权限映射表（用于初始化）
 * 实际运行时从 data/role-permissions.json 加载
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

    // 标签权限：完整的CRUD
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

    // MIDI 文件权限：完整的CRUD
    'midi:read',
    'midi:create',
    'midi:update',
    'midi:delete',

    // 碎碎念权限：完整的CRUD
    'moments:read',
    'moments:create',
    'moments:update',
    'moments:delete',

    // 留言墙权限：完整的CRUD + 审核
    'guestbook:read',
    'guestbook:create',
    'guestbook:update',
    'guestbook:delete',
    'guestbook:approve',

    // 系统权限：可以刷新缓存
    'system:revalidate',
  ],
};

/**
 * 所有可用的权限列表（用于前端展示和管理界面）
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
    group: 'MIDI文件管理',
    permissions: [
      { value: 'midi:read', label: '查看MIDI', description: '查看MIDI文件列表' },
      { value: 'midi:create', label: '上传MIDI', description: '上传新MIDI文件' },
      { value: 'midi:update', label: '更新MIDI', description: '修改MIDI文件信息' },
      { value: 'midi:delete', label: '删除MIDI', description: '删除MIDI文件' },
    ],
  },
  {
    group: '碎碎念管理',
    permissions: [
      { value: 'moments:read', label: '查看碎碎念', description: '查看碎碎念列表' },
      { value: 'moments:create', label: '发布碎碎念', description: '发布新碎碎念' },
      { value: 'moments:update', label: '更新碎碎念', description: '修改碎碎念内容' },
      { value: 'moments:delete', label: '删除碎碎念', description: '删除碎碎念' },
    ],
  },
  {
    group: '留言墙管理',
    permissions: [
      { value: 'guestbook:read', label: '查看留言', description: '查看留言列表' },
      { value: 'guestbook:create', label: '发布留言', description: '发布新留言' },
      { value: 'guestbook:update', label: '更新留言', description: '修改留言内容' },
      { value: 'guestbook:delete', label: '删除留言', description: '删除留言' },
      { value: 'guestbook:approve', label: '审核留言', description: '审核留言状态' },
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

/**
 * 权限检查工具函数
 * 提供同步权限检查功能（使用默认配置）
 * 异步权限检查应直接使用 rolePermissionStore
 */
export class RBACPermissionChecker {
  /**
   * 检查用户是否拥有指定权限（同步版本，使用默认配置）
   * 注意：这是同步方法，仅使用默认配置，无法读取文件
   * 异步版本应使用 rolePermissionStore.hasPermission
   */
  static hasPermission(user: User, permission: Permission): boolean {
    // super_admin 拥有所有权限
    if (user.role === 'super_admin') {
      return true;
    }

    // 检查用户是否有特定权限（使用默认配置）
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    return rolePermissions.includes(permission);
  }

  /**
   * 检查用户是否拥有多个权限中的任意一个（或关系）
   */
  static hasAnyPermission(user: User, permissions: Permission[]): boolean {
    if (user.role === 'super_admin') {
      return true;
    }

    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    return permissions.some((perm) => rolePermissions.includes(perm));
  }

  /**
   * 检查用户是否拥有所有指定的权限（与关系）
   */
  static hasAllPermissions(user: User, permissions: Permission[]): boolean {
    if (user.role === 'super_admin') {
      return true;
    }

    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    return permissions.every((perm) => rolePermissions.includes(perm));
  }

  /**
   * 获取用户的所有权限列表（同步版本）
   */
  static getUserPermissions(user: User): Permission[] {
    if (user.role === 'super_admin') {
      return ['*'];
    }

    return DEFAULT_ROLE_PERMISSIONS[user.role] || [];
  }

  /**
   * 向后兼容：检查用户是否有基础操作权限
   * 将旧的操作类型映射到新的权限系统
   */
  static hasLegacyPermission(
    user: User,
    action: ActionType,
    module?: string
  ): boolean {
    // 使用旧的PermissionChecker作为后备
    if (!module) {
      return PermissionChecker.hasPermission(user, action);
    }

    const modulePerms = moduleMap[module];
    if (modulePerms) {
      return this.hasPermission(user, modulePerms[action]);
    }

    return PermissionChecker.hasPermission(user, action);
  }
}

/**
 * 权限检查结果接口
 */
export interface PermissionCheckResult {
  allowed: boolean;
  user?: User;
  response?: NextResponse;
}

/**
 * 标准化权限检查函数
 * 低耦合：API路由只需调用此函数，无需关心具体实现
 *
 * @param permission 需要检查的权限
 * @returns PermissionCheckResult 检查结果，包含是否允许和相应的响应
 */
export async function requirePermission(
  permission: Permission
): Promise<PermissionCheckResult> {
  // 1. 验证登录状态
  const payload = await verifyAuth();
  if (!payload) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: '未授权，请先登录' },
        { status: 401 }
      ),
    };
  }

  // 2. 获取用户信息
  const user = await userStore.getById(payload.userId as string);
  if (!user) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: '用户不存在或已被删除' },
        { status: 401 }
      ),
    };
  }

  // 3. 检查权限（从持久化存储加载）
  const hasPerm = await rolePermissionStore.hasPermission(
    user.role,
    permission
  );
  if (!hasPerm) {
    return {
      allowed: false,
      user,
      response: NextResponse.json(
        { error: '没有权限执行此操作', requiredPermission: permission },
        { status: 403 }
      ),
    };
  }

  return { allowed: true, user };
}

/**
 * 多权限检查（或关系）- 拥有任意一个权限即可
 */
export async function requireAnyPermission(
  permissions: Permission[]
): Promise<PermissionCheckResult> {
  const payload = await verifyAuth();
  if (!payload) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: '未授权，请先登录' },
        { status: 401 }
      ),
    };
  }

  const user = await userStore.getById(payload.userId as string);
  if (!user) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: '用户不存在或已被删除' },
        { status: 401 }
      ),
    };
  }

  const userPerms = await rolePermissionStore.getByRole(user.role);
  const hasAnyPerm = permissions.some((perm) => userPerms.includes(perm));
  if (!hasAnyPerm) {
    return {
      allowed: false,
      user,
      response: NextResponse.json(
        { error: '没有权限执行此操作', requiredPermissions: permissions },
        { status: 403 }
      ),
    };
  }

  return { allowed: true, user };
}

/**
 * 简化版权限检查（仅验证登录，不检查具体权限）
 */
export async function requireAuth(): Promise<PermissionCheckResult> {
  const payload = await verifyAuth();
  if (!payload) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: '未授权，请先登录' },
        { status: 401 }
      ),
    };
  }

  const user = await userStore.getById(payload.userId as string);
  if (!user) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: '用户不存在或已被删除' },
        { status: 401 }
      ),
    };
  }

  return { allowed: true, user };
}

// 模块映射（用于向后兼容）
const moduleMap: Record<string, Record<ActionType, Permission>> = {
  blog: {
    read: 'blog:read',
    create: 'blog:create',
    update: 'blog:update',
    delete: 'blog:delete',
  },
  gallery: {
    read: 'gallery:read',
    create: 'gallery:create',
    update: 'gallery:update',
    delete: 'gallery:delete',
  },
  files: {
    read: 'files:read',
    create: 'files:upload',
    update: 'files:update',
    delete: 'files:delete',
  },
  users: {
    read: 'users:read',
    create: 'users:create',
    update: 'users:update',
    delete: 'users:delete',
  },
};
