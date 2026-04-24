import { NextResponse } from 'next/server';

import { verifyAuth } from './auth';
import {
  PermissionChecker,
  userStore,
  type User,
  type UserRole,
} from './user-store';

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
  // 文件管理权限（public files）
  | 'files:read'
  | 'files:upload'
  | 'files:update'
  | 'files:delete'
  | 'files:manageFolder' // 创建/删除文件夹
  // 系统特殊权限
  | 'system:revalidate' // 刷新缓存
  | 'system:convertImages' // 转换图片
  | '*'; // 通配符：所有权限

// 操作到权限的映射（向后兼容）
export type ActionType = 'create' | 'read' | 'update' | 'delete';

/**
 * 角色权限映射表
 * 定义每个角色拥有的权限列表
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
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

    // 文件权限：完整的文件管理
    'files:read',
    'files:upload',
    'files:update',
    // 'files:delete',
    'files:manageFolder',

    // 系统权限：可以刷新缓存
    'system:revalidate',
  ],
};

/**
 * 权限检查核心类
 * 高内聚：所有权限逻辑集中在此
 */
export class RBACPermissionChecker {
  /**
   * 检查用户是否拥有指定权限
   */
  static hasPermission(user: User, permission: Permission): boolean {
    // super_admin 拥有所有权限
    if (user.role === 'super_admin') {
      return true;
    }

    // 检查用户是否有特定权限
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    return rolePermissions.includes(permission);
  }

  /**
   * 检查用户是否拥有多个权限中的任意一个（或关系）
   */
  static hasAnyPermission(user: User, permissions: Permission[]): boolean {
    if (user.role === 'super_admin') {
      return true;
    }

    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.some((perm) => rolePermissions.includes(perm));
  }

  /**
   * 检查用户是否拥有所有指定的权限（与关系）
   */
  static hasAllPermissions(user: User, permissions: Permission[]): boolean {
    if (user.role === 'super_admin') {
      return true;
    }

    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.every((perm) => rolePermissions.includes(perm));
  }

  /**
   * 获取用户的所有权限列表
   */
  static getUserPermissions(user: User): Permission[] {
    if (user.role === 'super_admin') {
      return ['*'];
    }

    return ROLE_PERMISSIONS[user.role] || [];
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

    // 映射到新的权限格式
    const permissionMap: Record<string, Record<ActionType, Permission>> = {
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

  // 3. 检查权限
  if (!RBACPermissionChecker.hasPermission(user, permission)) {
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

  if (!RBACPermissionChecker.hasAnyPermission(user, permissions)) {
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
