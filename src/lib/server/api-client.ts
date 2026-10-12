import type { ActionContext } from '@/types/auth';

/**
 * Go 后端 API 客户端
 *
 * 仅供 Server-side 使用（Server Component / Server Action / Route Handler）。
 * 通过环境变量 GO_API_INTERNAL_URL 调用 Go 服务，附带 X-Internal-Secret 共享密钥。
 *
 * 鉴权模型：
 * - X-Internal-Secret：网络层身份确认，确认请求来自同机 Next.js 转发（不再承担用户授权）
 * - Authorization: Bearer <token>：可选，由调用方（action / store）用 withGoAuth(ctx) 附加，
 *   Go 侧 RequireSession 中间件解析 JWT 并写入 userId/role，由 RequirePermission 完成 fail-closed 鉴权
 * 调用方在 options.headers 里传 Authorization 即可被透传到底层 fetch。
 */

// 这两个守卫放在函数体内（运行时才执行），而不是模块顶层。
// 原因：next build 会加载本模块；若在顶层 throw，构建阶段缺少
// GO_API_SHARED_SECRET / GO_API_INTERNAL_URL 会直接构建失败。
// 这两个变量只在运行时（Server Action / Route Handler）才真正使用，
// 因此把检查惰性化，让构建不再依赖它们。
function getInternalSecret(): string {
  if (!process.env.GO_API_SHARED_SECRET) {
    throw new Error('GO_API_SHARED_SECRET 环境变量未配置');
  }
  return process.env.GO_API_SHARED_SECRET;
}

function getBaseUrl(): string {
  if (!process.env.GO_API_INTERNAL_URL) {
    throw new Error('GO_API_INTERNAL_URL 环境变量未配置');
  }
  return process.env.GO_API_INTERNAL_URL;
}

export interface GoFetchOptions extends RequestInit {
  /** 是否解析 JSON 响应（默认 true）。DELETE 返回 204 时设为 false */
  parseJson?: boolean;
}

/**
 * Go 后端返回非 2xx 时抛出的类型化错误。
 * 调用方用 `err.status` / `err.code` 判断即可，无需再解析 Error.message 字符串
 * （历史写法 `msg.includes('返回 401')` 已废弃）。
 * message 仍保留 `Go API <path> 返回 <status>: <body>` 格式，兼容旧调用方。
 */
export class GoApiError extends Error {
  /** HTTP 状态码 */
  readonly status: number;
  /** 请求路径 */
  readonly path: string;
  /** 原始响应体 */
  readonly body: string;
  /** 响应体 JSON 里的 error 字段（可解析时） */
  readonly code?: string;

  constructor(path: string, status: number, body: string) {
    super(`Go API ${path} 返回 ${status}: ${body}`);
    this.name = 'GoApiError';
    this.path = path;
    this.status = status;
    this.body = body;
    this.code = parseGoErrorField(body);
  }
}

// 从 Go 响应体中提取 error 字段
function parseGoErrorField(body: string): string | undefined {
  if (!body) return undefined;
  try {
    const parsed = JSON.parse(body) as { error?: unknown };
    return typeof parsed?.error === 'string' ? parsed.error : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 把身份上下文转成 `Authorization: Bearer <token>` 请求头。
 * 无 token 时返回空对象（未登录/公开端点场景）。
 * 供 goUploadMultipart 这类只接受 headers 的调用点使用。
 */
export function goAuthHeaders(ctx?: ActionContext): Record<string, string> {
  return ctx?.authToken
    ? { Authorization: `Bearer ${ctx.authToken}` }
    : {};
}

/**
 * 在 goFetch 的 options 上附加身份令牌（把 ctx 透传给 Go）。
 * Go 侧 RequireSession 解析该 token 得到 userId/role，RequirePermission 据此授权。
 *
 * 用法：
 * ```ts
 * await goFetch('/api/movies/1', withGoAuth(ctx, { method: 'PUT', body }));
 * ```
 */
export function withGoAuth(
  ctx?: ActionContext,
  options: GoFetchOptions = {}
): GoFetchOptions {
  if (!ctx?.authToken) return options;
  return {
    ...options,
    headers: {
      // 现有调用点均以普通对象传 headers，这里按其语义合并
      ...((options.headers as Record<string, string> | undefined) ?? {}),
      ...goAuthHeaders(ctx),
    },
  };
}

/**
 * 调用 Go 后端 API
 * @param path 路径，如 '/api/movies' 或 '/api/movies/interstellar-2014'
 * @param options fetch 配置
 * @throws Error 当响应非 2xx 时抛出含状态码和响应体的错误
 */
export async function goFetch<T = unknown>(
  path: string,
  options: GoFetchOptions = {}
): Promise<T> {
  const { parseJson = true, ...init } = options;
  const baseUrl = getBaseUrl();
  const internalSecret = getInternalSecret();

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': internalSecret,
      ...(init.headers ?? {}),
    },
    cache: 'no-store', // 避免 Next 缓存干扰，确保数据实时
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new GoApiError(path, res.status, body);
  }

  if (!parseJson || res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

/**
 * 调用 Go 后端 multipart 上传接口（转发二进制数据）
 * 不显式设置 Content-Type，让 fetch 自动生成带 boundary 的 multipart 头。
 * @param path 路径，如 '/api/uploads/asset'
 * @param formData 已构造的 FormData（含文件字段与 width/height/dir 等元数据）
 * @param options.headers 额外请求头（如透传身份的 Authorization）
 * @returns Go 返回的 JSON 响应（如 { url, width, height }）
 */
export async function goUploadMultipart<T = unknown>(
  path: string,
  formData: FormData,
  options: { headers?: HeadersInit } = {}
): Promise<T> {
  const baseUrl = getBaseUrl();
  const internalSecret = getInternalSecret();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'X-Internal-Secret': internalSecret,
      ...(options.headers ?? {}),
    },
    body: formData,
    cache: 'no-store',
  });

  const body = await res.text().catch(() => '');
  if (!res.ok) {
    throw new GoApiError(path, res.status, body);
  }
  return JSON.parse(body || '{}') as T;
}

/**
 * 构造查询字符串（仅包含非空参数）
 */
export function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== ''
  );
  if (entries.length === 0) return '';
  const usp = new URLSearchParams();
  for (const [k, v] of entries) usp.set(k, v as string);
  return `?${usp.toString()}`;
}
