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
 * 清理文件名，移除不安全字符
 * @param fileName 原始文件名
 * @param allowedChars 允许的额外字符（默认只允许字母数字和点）
 * @returns 清理后的文件名
 */
export function sanitizeFileName(
  fileName: string,
  allowedChars: string = '-_'
): string {
  const safePattern = new RegExp(`[^a-zA-Z0-9.${allowedChars}]`, 'g');
  return fileName.replace(safePattern, '-');
}
