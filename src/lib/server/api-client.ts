/**
 * Go 后端 API 客户端
 *
 * 仅供 Server-side 使用（Server Component / Server Action / Route Handler）。
 * 通过环境变量 GO_API_INTERNAL_URL 调用 Go 服务，附带 X-Internal-Secret 共享密钥。
 * 试点阶段不传 JWT，鉴权由 Next.js 侧 withActionPermission 完成后转发用户信息。
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
    cache: 'no-store', // 试点阶段避免 Next 缓存干扰，确保数据实时
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Go API ${path} 返回 ${res.status}: ${body}`);
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
 * @returns Go 返回的 JSON 响应（如 { url, width, height }）
 */
export async function goUploadMultipart<T = unknown>(
  path: string,
  formData: FormData
): Promise<T> {
  const baseUrl = getBaseUrl();
  const internalSecret = getInternalSecret();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'X-Internal-Secret': internalSecret,
    },
    body: formData,
    cache: 'no-store',
  });

  const body = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`Go API ${path} 返回 ${res.status}: ${body}`);
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
