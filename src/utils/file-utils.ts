import fs from 'fs/promises';
import path from 'path';

/**
 * 验证文件路径是否在允许的目录范围内（防止目录遍历攻击）
 * @param targetPath 目标路径
 * @param allowedBasePath 允许的基础目录
 * @returns 是否安全
 */
export function isPathSafe(
  targetPath: string,
  allowedBasePath: string
): boolean {
  const resolvedPath = path.resolve(targetPath);
  const resolvedBase = path.resolve(allowedBasePath);
  return resolvedPath.startsWith(resolvedBase);
}

/**
 * 确保目录存在，如果不存在则创建
 * @param dirPath 目录路径
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * 检查文件是否已存在
 * @param filePath 完整文件路径
 * @returns 是否存在
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
/**
 * 确保文件已初始化，如果不存在则创建
 * @param filePath 完整文件路径
 * @param defaultContent 默认内容
 * @param defaultOptions 默认选项
 */
export async function ensureFileInitialized(
  filePath: string,
  defaultContent: string = '[]',
  defaultOptions?: { encoding?: 'utf-8'; flag?: 'wx' }
) {
  try {
    // 尝试直接读取（生产环境通常总会先读取或追加）
    await fs.readFile(filePath, defaultOptions?.encoding || 'utf-8');
  } catch (error) {
    // 只有当错误码是 ENOENT（文件或目录不存在）时，才去创建它
    if (isFileNotFoundError(error)) {
      try {
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

        // 使用 wx 模式：如果文件在这一瞬间被其他请求创建了，这里会报错而不会覆盖老数据
        await fs.writeFile(filePath, defaultContent, defaultOptions);
      } catch (writeError) {
        // 如果报 EEXIST 说明别的请求已经抢先创建好了，直接忽略即可
        if (!isFileExistsError(writeError)) throw writeError;
      }
    } else {
      // 如果是权限等其他错误，原样抛出，不要盲目初始化
      throw error;
    }
  }
}

/**
 * 检查错误是否为文件不存在错误
 */
export function isFileNotFoundError(
  error: unknown
): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

/**
 * 检查错误是否为文件已存在错误
 */
function isFileExistsError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'EEXIST';
}

/**
 * 原子写入文件：先写同目录临时文件再 rename 替换，避免写入中途崩溃损坏目标文件。
 * @param filePath 目标文件完整路径
 * @param data 写入内容（字符串或二进制）
 * @param options 编码选项
 */
let tmpCounter = 0;
export async function writeFileAtomic(
  filePath: string,
  data: string | Uint8Array,
  options?: { encoding?: BufferEncoding }
): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDirectory(dir);
  const tmpPath = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${tmpCounter++}.tmp`
  );
  try {
    await fs.writeFile(tmpPath, data, options?.encoding ?? 'utf-8');
    // 同目录 rename 是原子替换（Windows 下 Node 用 MoveFileEx REPLACE_EXISTING）
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    try {
      await fs.unlink(tmpPath);
    } catch {
      // 清理失败可忽略，临时文件残留不影响数据完整性
    }
    throw error;
  }
}

/**
 * 解析内容文件的合法路径（防止路径穿越）。
 * @param dir 允许的基础目录
 * @param slug URL/表单传入的文件标识
 * @param ext 文件扩展名
 * @returns 合法路径；slug 非法或逃逸出目录时返回 null
 */
export function resolveContentPath(
  dir: string,
  slug: string,
  ext: '.mdx' | '.json'
): string | null {
  if (validateSlug(slug)) return null;
  const filePath = path.join(dir, `${slug}${ext}`);
  if (!isPathSafe(filePath, dir)) return null;
  return filePath;
}

/**
 * 检查文件名冲突并返回错误信息
 * @param filePath 完整文件路径
 * @returns 如果文件存在返回错误对象，否则返回 null
 */
export async function checkFileConflict(
  filePath: string
): Promise<{ error: string; status: number } | null> {
  const fileName = path.basename(filePath);
  const exists = await fileExists(filePath);
  if (exists) {
    return {
      error: `文件 ${fileName} 已存在`,
      status: 409,
    };
  }
  return null;
}

/**
 * 验证 slug 是否合法
 * @param slug 原始 slug
 * @param options 验证选项
 * @returns 如果 slug 非法返回错误对象，否则返回 null
 */
export function validateSlug(
  slug: string,
  options?: {
    allowUnderscore?: boolean;
    maxLength?: number;
  }
): { error: string } | null {
  const { allowUnderscore = false, maxLength = 100 } = options || {};

  if (!slug || slug.trim() === '') {
    return { error: 'slug 不能为空' };
  }

  // 1. 长度限制
  if (slug.length > maxLength) {
    return { error: `slug 长度不能超过 ${maxLength}` };
  }

  // 2. 必须是小写（强约束，避免 SEO/路径问题）
  if (slug !== slug.toLowerCase()) {
    return { error: 'slug 只能包含小写字母' };
  }

  // 3. 基础字符校验
  const basePattern = allowUnderscore ? /^[a-z0-9-_]+$/ : /^[a-z0-9-]+$/;

  if (!basePattern.test(slug)) {
    return { error: 'slug 只能包含小写字母、数字和连接符(-)' };
  }

  // 4. 不能以 - 或 _ 开头/结尾
  if (/^[-_]|[-_]$/.test(slug)) {
    return { error: 'slug 不能以分隔符开头或结尾' };
  }

  // 5. 不能连续分隔符
  if (allowUnderscore) {
    if (/[-_]{2,}/.test(slug)) {
      return { error: 'slug 不能包含连续的分隔符 (-- 或 __)' };
    }
  } else {
    if (/--/.test(slug)) {
      return { error: 'slug 不能包含连续的 --' };
    }
  }

  return null;
}
