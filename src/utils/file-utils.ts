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
 * 检查并确保目录存在，如果不存在则创建
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
