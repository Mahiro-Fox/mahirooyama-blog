import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE } from '@/constant/auth';
import type { Permission } from '@/constant/permissions';
import { requirePermission } from '@/lib/permissions';
import { serverActionRateLimiter } from '@/lib/rate-limit';
import { GoApiError } from '@/lib/server/api-client';

export type ActionResponse<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string; resetTime?: number };

type ActionHandler<T> = (
  user: UserResponse,
  ctx: ActionContext
) => Promise<ActionResponse<T>>;

type ActionPermissionOptions = {
  /** 限流桶前缀，实际 key 为 `${rateLimitKey}:${user.id}` */
  rateLimitKey?: string;
};

const RATE_LIMIT_ERROR = '操作过于频繁，请稍后再试';

/**
 * 从 admin-session cookie 读取当前登录令牌，构造身份透传上下文。
 * - withActionPermission 鉴权通过后用它构造 ctx 注入 handler；
 * - 不走 withActionPermission 的自定义流程（如改密、传头像）也可直接调用它取 ctx，
 *   再显式传给 store 方法，保持"身份来源唯一"。
 */
export async function getAdminActionContext(): Promise<ActionContext> {
  const cookieStore = await cookies();
  return { authToken: cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? '' };
}

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

// 把 Go 返回的状态码映射为 action 层的机器码与兜底文案
function mapGoError(error: GoApiError): {
  error: string;
  code: string;
} {
  if (error.status === 401) {
    return { error: error.code || '未登录或登录已过期', code: 'UNAUTHORIZED' };
  }
  if (error.status === 403) {
    return { error: error.code || '权限不足', code: 'FORBIDDEN' };
  }
  return { error: error.code || '操作失败，请稍后重试', code: 'GO_API_ERROR' };
}

/**
 * Server Action 包装器 - 统一认证、权限检查、限流和错误处理
 *
 * 定位：**快速失败层**（fail-fast），而非授权权威。
 * 1. requirePermission 在 Next 端做前置拦截（未登录/无权限直接返回，避免无谓转发）
 * 2. 鉴权通过后，从 cookie 读取登录 token 注入 ActionContext
 * 3. handler 调用 goFetch 时用 withGoAuth(ctx, ...) 透传 Authorization: Bearer <token>，
 *    Go 侧 RequireSession + RequirePermission 完成真正的 fail-closed 授权；
 *    Go 返回的 401/403 由 mapGoError 透传为 action 的机器码
 *
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
      const status = result.response?.status ?? 403;
      return {
        success: false,
        error: result.response
          ? ((await result.response.json()) as { error: string }).error
          : '权限不足',
        code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
      };
    }

    if (options?.rateLimitKey) {
      const limited = await consumeRateLimit(
        result.user?.id,
        options.rateLimitKey
      );
      if (limited) return limited;
    }

    // 鉴权通过后读 cookie 取 token，注入 handler 调用上下文
    const ctx = await getAdminActionContext();

    return await handler(result.user!, ctx);
  } catch (error) {
    // Go 侧返回的 401/403 在此透传，不再被折叠成「服务器内部错误」
    if (error instanceof GoApiError) {
      return { success: false, ...mapGoError(error) };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误',
      code: 'INTERNAL_ERROR',
    };
  }
}
