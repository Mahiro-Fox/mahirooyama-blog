/**
 * Go 后端 API 客户端
 *
 * 仅供 Server-side 使用（Server Component / Server Action / Route Handler）。
 * 通过环境变量 GO_API_INTERNAL_URL 调用 Go 服务，附带 X-Internal-Secret 共享密钥。
 * 试点阶段不传 JWT，鉴权由 Next.js 侧 withActionPermission 完成后转发用户信息。
 */

const INTERNAL_SECRET = process.env.GO_API_SHARED_SECRET ?? '';
const BASE_URL = process.env.GO_API_INTERNAL_URL ?? 'http://localhost:8080';

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

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': INTERNAL_SECRET,
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
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'X-Internal-Secret': INTERNAL_SECRET,
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
