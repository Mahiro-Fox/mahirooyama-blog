import { DEFAULT_ROLE_PERMISSIONS, type Permission } from '@/constant';
import { rolePermissionStore } from '@/store/role-permission-store';
import { PermissionChecker, userStore, type User } from '@/store/user-store';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/admin-auth';

// 操作到权限的映射（向后兼容）
export type ActionType = 'create' | 'read' | 'update' | 'delete';

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
  if (!payload.success) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: payload.error || '未授权，请先登录' },
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
      response: NextResponse.json(
        { error: `权限不足，需要 ${permission} 权限` },
        { status: 403 }
      ),
    };
  }

  return { allowed: true, user };
}

/**
 * 验证管理员权限的辅助函数 (Next.js Middleware 或 Server Action 中使用)
 * 这是一个简化的包装，适用于大多数情况
 */
export async function validateAdmin(): Promise<User | null> {
  const payload = await verifyAuth();
  if (!payload.success) return null;

  const user = await userStore.getById(payload.userId as string);
  if (!user) return null;

  return user;
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
  tag: {
    read: 'tag:read',
    create: 'tag:create',
    update: 'tag:update',
    delete: 'tag:delete',
  },
};
