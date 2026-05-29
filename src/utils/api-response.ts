import { NextResponse } from 'next/server';
import type { Permission } from '@/constant/permissions';
import type { User } from '@/store/user-store';

import { requirePermission } from '@/lib/permissions';

type APIHandler = (user: User, request: Request) => Promise<NextResponse>;

/**
 * 权限包装器 - 统一认证和权限检查
 * @param permission 需要的权限
 * @param handler 业务处理函数
 */
export async function withPermission(
  permission: Permission,
  handler: APIHandler
): Promise<NextResponse> {
  try {
    const result = await requirePermission(permission);

    if (!result.allowed) {
      return result.response || ApiResponse.unauthorized('权限不足');
    }

    return handler(result.user!, {} as Request);
  } catch (error) {
    return ApiResponse.internalError(
      error instanceof Error ? error.message : '服务器内部错误'
    );
  }
}

/**
 * 统一 API 响应格式
 */
class ApiResponseClass {
  success(data?: unknown, status = 200) {
    return NextResponse.json({ success: true, data }, { status });
  }

  error(message: string, status = 400, code?: string) {
    return NextResponse.json(
      {
        success: false,
        error: message,
        ...(code && { code }),
      },
      { status }
    );
  }

  notFound(message = '资源不存在') {
    return this.error(message, 404, 'NOT_FOUND');
  }

  unauthorized(message = '未授权，请先登录') {
    return this.error(message, 401, 'UNAUTHORIZED');
  }

  forbidden(message = '权限不足') {
    return this.error(message, 403, 'FORBIDDEN');
  }

  internalError(message = '服务器内部错误') {
    return this.error(message, 500, 'INTERNAL_ERROR');
  }

  created(data?: unknown, message = '创建成功') {
    return NextResponse.json(
      {
        success: true,
        message,
        data,
      },
      { status: 201 }
    );
  }

  noContent() {
    return new NextResponse(null, { status: 204 });
  }

  badRequest(message = '请求参数错误', details?: string[]) {
    return NextResponse.json(
      {
        success: false,
        error: message,
        ...(details && { details }),
      },
      { status: 400 }
    );
  }
}

export const ApiResponse = new ApiResponseClass();
