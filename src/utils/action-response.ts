import type { Permission } from '@/constant/permissions';
import type { User } from '@/store/user-store';

import { requirePermission } from '@/lib/permissions';

export type ActionResponse<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string; resetTime?: number };

type ActionHandler<T> = (user: User) => Promise<ActionResponse<T>>;

/**
 * Server Action 包装器 - 统一认证、权限检查和错误处理
 * @param permission 需要的权限
 * @param handler 业务处理函数
 */
export async function withActionPermission<T>(
  permission: Permission,
  handler: ActionHandler<T>
): Promise<ActionResponse<T>> {
  try {
    const result = await requirePermission(permission);

    if (!result.allowed) {
      return {
        success: false,
        error: result.response
          ? ((await result.response.json()) as { error: string }).error
          : '权限不足',
        code: 'FORBIDDEN',
      };
    }

    return await handler(result.user!);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误',
      code: 'INTERNAL_ERROR',
    };
  }
}
