import type { Permission } from '@/constant';
import { rolePermissionStore } from '@/store/role-permission-store';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/admin-auth';

/**
 * 权限检查结果接口
 */
interface PermissionCheckResult {
  allowed: boolean;
  user?: UserResponse;
  response?: NextResponse;
}

/**
 * 标准化权限检查函数
 *
 * 定位：这是 admin action 的「快速失败层」——提前拦掉未登录/无权限的请求，
 * 避免无谓地转发到 Go，并统一 401/403 文案。**它不再是授权权威**：
 * 真正的授权判定已收敛到 Go 侧（RequireSession + RequirePermission，fail-closed）。
 * 因此这里只做最省成本的判断，不再为拿 role 多打一次 Go。
 *
 * @param permission 需要检查的权限
 * @returns PermissionCheckResult 检查结果，包含是否允许和相应的响应
 */
export async function requirePermission(
  permission: Permission
): Promise<PermissionCheckResult> {
  // 1. 验证登录状态。verifyAuth 已返回 userId/username/avatar/role，
  //    无需再调 userStore.getById（省去一次 Go 往返）。
  const payload = await verifyAuth();
  if (!payload.success || !payload.userId) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: payload.error || '未授权，请先登录' },
        { status: 401 }
      ),
    };
  }

  // 2. 由 verify 返回的身份直接构造用户对象
  const user: UserResponse = {
    id: payload.userId,
    username: payload.username ?? '',
    avatar: payload.avatar ?? '',
    role: (payload.role ?? 'user') as UserRole,
    lastUpdated: '',
    mustChangePassword: payload.mustChangePassword,
  };

  // 3. 检查权限（rolePermissionStore 带内存缓存，不会每次都打 Go）
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
