import type { Permission } from '@/constant';
import { rolePermissionStore } from '@/store/role-permission-store';
import { userStore, type User } from '@/store/user-store';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/admin-auth';

/**
 * 权限检查结果接口
 */
interface PermissionCheckResult {
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

