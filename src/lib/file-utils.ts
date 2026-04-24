import fs from 'fs/promises';
import path from 'path';

/**
 * 文件名检查结果
 */
export interface FileCheckResult {
  exists: boolean;
  path: string;
  fileName: string;
}

/**
 * 文件工具类
 * 提供文件操作中常用的通用方法
 */
export class FileUtils {
  /**
   * 检查文件是否已存在
   * @param filePath 完整文件路径
   * @returns 检查结果，包含是否存在、路径和文件名
   */
  static async checkFileExists(filePath: string): Promise<FileCheckResult> {
    const fileName = path.basename(filePath);
    try {
      await fs.access(filePath);
      return { exists: true, path: filePath, fileName };
    } catch {
      return { exists: false, path: filePath, fileName };
    }
  }

  /**
   * 检查并确保目录存在，如果不存在则创建
   * @param dirPath 目录路径
   */
  static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * 清理文件名，移除不安全字符
   * @param fileName 原始文件名
   * @param allowedChars 允许的额外字符（默认只允许字母数字和点）
   * @returns 清理后的文件名
   */
  static sanitizeFileName(
    fileName: string,
    allowedChars: string = '-_'
  ): string {
    const safePattern = new RegExp(`[^a-zA-Z0-9.${allowedChars}]`, 'g');
    return fileName.replace(safePattern, '-');
  }

  /**
   * 生成唯一文件名（如果已存在则添加序号）
   * @param dirPath 目标目录
   * @param fileName 期望的文件名
   * @returns 可用的文件名
   */
  static async generateUniqueFileName(
    dirPath: string,
    fileName: string
  ): Promise<string> {
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    let finalName = fileName;
    let counter = 1;

    while (true) {
      const checkPath = path.join(dirPath, finalName);
      const check = await this.checkFileExists(checkPath);
      if (!check.exists) {
        return finalName;
      }
      // 文件名已存在，添加序号
      finalName = `${baseName}_${counter}${ext}`;
      counter++;

      // 防止无限循环
      if (counter > 1000) {
        throw new Error('无法生成唯一文件名');
      }
    }
  }

  /**
   * 验证文件路径是否在允许的目录范围内
   * @param targetPath 目标路径
   * @param allowedBasePath 允许的基础目录
   * @returns 是否安全
   */
  static isPathSafe(targetPath: string, allowedBasePath: string): boolean {
    const resolvedPath = path.resolve(targetPath);
    const resolvedBase = path.resolve(allowedBasePath);
    return resolvedPath.startsWith(resolvedBase);
  }

  /**
   * 检查文件是否允许上传（文件类型白名单）
   * @param fileName 文件名
   * @param allowedExts 允许的扩展名列表
   * @returns 是否允许
   */
  static isAllowedFileType(
    fileName: string,
    allowedExts: string[]
  ): boolean {
    const ext = path.extname(fileName).toLowerCase();
    return allowedExts.includes(ext);
  }
}

/**
 * 简化的文件存在性检查
 * 直接检查文件是否存在，返回布尔值
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
  const check = await FileUtils.checkFileExists(filePath);
  if (check.exists) {
    return {
      error: `文件 ${check.fileName} 已存在`,
      status: 409,
    };
  }
  return null;
}
