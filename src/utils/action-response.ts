import type { UserResponse } from '@/store/user-store';
import type { Permission } from '@/constant/permissions';
import { requirePermission } from '@/lib/permissions';
import { serverActionRateLimiter } from '@/lib/rate-limit';

export type ActionResponse<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string; resetTime?: number };

type ActionHandler<T> = (user: UserResponse) => Promise<ActionResponse<T>>;

type ActionPermissionOptions = {
  /** 限流桶前缀，实际 key 为 `${rateLimitKey}:${user.id}` */
  rateLimitKey?: string;
};

const RATE_LIMIT_ERROR = '操作过于频繁，请稍后再试';

/**
 * 按用户限流。未超限返回 null，超限返回可直接 return 的失败结果。
 * 不走 withActionPermission 的入口（改密、传头像）复用这里。
 */
export async function consumeRateLimit(
  userId: string | undefined,
  rateLimitKey: string
): Promise<Extract<ActionResponse<never>, { success: false }> | null> {
  if (!userId) return null;
  const rateLimit = await serverActionRateLimiter.check(
    `${rateLimitKey}:${userId}`
  );
  if (rateLimit.success) return null;
  return {
    success: false,
    error: RATE_LIMIT_ERROR,
    resetTime: rateLimit.resetTime,
  };
}

/**
 * Server Action 包装器 - 统一认证、权限检查、限流和错误处理
 * @param permission 需要的权限
 * @param handler 业务处理函数
 * @param options.rateLimitKey 传入后按用户限流
 */
export async function withActionPermission<T>(
  permission: Permission,
  handler: ActionHandler<T>,
  options?: ActionPermissionOptions
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

    if (options?.rateLimitKey) {
      const limited = await consumeRateLimit(
        result.user?.id,
        options.rateLimitKey
      );
      if (limited) return limited;
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
