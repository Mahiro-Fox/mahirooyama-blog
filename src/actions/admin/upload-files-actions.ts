'use server';

import fs from 'fs/promises';
import path from 'path';
import { pathCacheStore } from '@/store/path-cache-store';
import { UPLOADS_DIR } from '@/constant/dir';
import { serverActionRateLimiter } from '@/lib/rate-limit';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import {
  checkFileConflict,
  ensureDirectory,
  isPathSafe,
} from '@/utils/file-utils';
import { processAndSaveImage } from '@/lib/image-utils';
import { createLogger } from '@/utils/logger';

const logger = createLogger('UploadFilesActions');

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  lastUpdated: string;
  extension?: string;
}

export interface FileListResponse {
  items: FileItem[];
  currentPath: string;
  breadcrumb: string[];
}

// GET - 获取文件列表
export async function adminGetUploadFiles(
  relativePath?: string
): Promise<ActionResponse<FileListResponse>> {
  return withActionPermission('files:read', async (user) => {
    let finalRelativePath = relativePath;

    // 如果没有提供路径（undefined），尝试从缓存中获取
    if (finalRelativePath === undefined && user.id) {
      const cachedPath = pathCacheStore.get(user.id);
      if (cachedPath !== null) {
        finalRelativePath = cachedPath;
      } else {
        finalRelativePath = '';
      }
    } else if (finalRelativePath === undefined) {
      finalRelativePath = '';
    }

    try {
      const targetDir = path.join(UPLOADS_DIR, finalRelativePath);

      // 安全检查
      if (!isPathSafe(targetDir, UPLOADS_DIR)) {
        return { success: false, error: '非法路径' };
      }

      // 确保目录存在
      try {
        const stats = await fs.stat(targetDir);
        if (!stats.isDirectory()) {
          return { success: false, error: '不是目录' };
        }
      } catch {
        return { success: false, error: '目录不存在' };
      }

      const entries = await fs.readdir(targetDir, { withFileTypes: true });

      const items: FileItem[] = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(targetDir, entry.name);
          const stats = await fs.stat(fullPath);

          // 构建相对 uploads 的路径
          const itemRelativePath = path.join(finalRelativePath, entry.name);
          const webPath = '/uploads/' + itemRelativePath.replace(/\\/g, '/');

          return {
            name: entry.name,
            path: webPath,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            lastUpdated: stats.birthtime.toISOString(),
            extension: entry.isDirectory()
              ? undefined
              : path.extname(entry.name).toLowerCase(),
          };
        })
      );

      // 排序：文件夹在前，然后按名称排序
      items.sort((a, b) => {
        if (a.type === 'directory' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
      });

      // 获取面包屑
      const breadcrumb = finalRelativePath
        ? finalRelativePath.split(/[/\\]/).filter(Boolean)
        : [];

      return {
        success: true,
        data: {
          items,
          currentPath: finalRelativePath,
          breadcrumb,
        },
      };
    } catch (error) {
      logger.error('获取文件列表失败', error, { relativePath });
      return { success: false, error: '获取文件列表失败' };
    }
  });
}

export async function createFolder(
  relativePath: string,
  folderName: string
): Promise<ActionResponse<{ folderName: string; message: string }>> {
  return withActionPermission('files:manageFolder', async (user) => {
    try {
      // 速率限制检查
      if (user.id) {
        const rateLimit = await serverActionRateLimiter.check(
          `file-op:${user.id}`
        );
        if (!rateLimit.success) {
          return {
            success: false,
            error: '文件操作过于频繁，请稍后再试',
            resetTime: rateLimit.resetTime,
          };
        }
      }

      if (!folderName || folderName.trim() === '') {
        return { success: false, error: '文件夹名称不能为空' };
      }

      const targetDir = path.join(UPLOADS_DIR, relativePath);

      // 安全检查
      if (!isPathSafe(targetDir, UPLOADS_DIR)) {
        return { success: false, error: '非法路径' };
      }

      const newFolderPath = path.join(targetDir, folderName.trim());

      // 安全检查
      if (!isPathSafe(newFolderPath, UPLOADS_DIR)) {
        return { success: false, error: '非法文件夹名称' };
      }

      // 检查文件夹是否已存在
      const conflict = await checkFileConflict(newFolderPath);
      if (conflict) {
        return { success: false, error: conflict.error };
      }

      await ensureDirectory(newFolderPath);

      logger.info('创建文件夹成功', {
        relativePath,
        folderName,
        userId: user.id,
      });
      return {
        success: true,
        data: {
          message: '文件夹创建成功',
          folderName: folderName.trim(),
        },
      };
    } catch (error) {
      logger.error('创建文件夹失败', error, { relativePath, folderName });
      return { success: false, error: '创建文件夹失败' };
    }
  });
}

export async function deleteFile(
  filePath: string
): Promise<ActionResponse<{ message: string }>> {
  return withActionPermission('files:delete', async (user) => {
    try {
      // 速率限制检查
      if (user.id) {
        const rateLimit = await serverActionRateLimiter.check(
          `file-op:${user.id}`
        );
        if (!rateLimit.success) {
          return {
            success: false,
            error: '文件操作过于频繁，请稍后再试',
            resetTime: rateLimit.resetTime,
          };
        }
      }

      // 处理路径，确保它是相对于 UPLOADS_DIR 的路径
      let relativePath = filePath;
      if (relativePath.startsWith('/uploads/')) {
        relativePath = relativePath.substring(9);
      } else if (relativePath.startsWith('uploads/')) {
        relativePath = relativePath.substring(8);
      } else {
        relativePath = relativePath.replace(/^\//, '');
      }

      const fullPath = path.join(UPLOADS_DIR, relativePath);

      // 安全检查
      if (!isPathSafe(fullPath, UPLOADS_DIR)) {
        return { success: false, error: '非法路径' };
      }

      // 检查文件是否存在
      try {
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
          // 删除目录及其内容
          await fs.rm(fullPath, { recursive: true, force: true });
        } else {
          // 删除文件
          await fs.unlink(fullPath);
        }
        logger.info('删除文件成功', { filePath, userId: user.id });
        return { success: true, data: { message: '删除成功' } };
      } catch (error) {
        logger.error('删除失败', error, { filePath });
        return { success: false, error: '文件不存在' };
      }
    } catch (error) {
      logger.error('删除失败', error, { filePath });
      return { success: false, error: '删除失败' };
    }
  });
}

export async function renameFile(
  oldPath: string,
  newName: string
): Promise<ActionResponse<{ message: string; newName: string }>> {
  return withActionPermission('files:update', async (user) => {
    try {
      // 速率限制检查
      if (user.id) {
        const rateLimit = await serverActionRateLimiter.check(
          `file-op:${user.id}`
        );
        if (!rateLimit.success) {
          return {
            success: false,
            error: '文件操作过于频繁，请稍后再试',
            resetTime: rateLimit.resetTime,
          };
        }
      }

      if (!newName || newName.trim() === '') {
        return { success: false, error: '新名称不能为空' };
      }

      // 处理旧路径
      let cleanOldPath = oldPath;
      if (cleanOldPath.startsWith('/uploads/')) {
        cleanOldPath = cleanOldPath.substring(1);
      } else if (cleanOldPath.startsWith('uploads/')) {
        // OK
      } else {
        cleanOldPath = path.join('uploads', cleanOldPath.replace(/^\//, ''));
      }

      const fullOldPath = path.resolve(process.cwd(), cleanOldPath);
      const dirPath = path.dirname(fullOldPath);
      const fullNewPath = path.join(dirPath, newName.trim());

      // 安全检查
      if (
        !isPathSafe(fullOldPath, UPLOADS_DIR) ||
        !isPathSafe(fullNewPath, UPLOADS_DIR)
      ) {
        return { success: false, error: '非法路径' };
      }

      // 检查新名称是否已存在
      const exists = await fs
        .access(fullNewPath)
        .then(() => true)
        .catch(() => false);
      if (exists) {
        return { success: false, error: `名称 ${newName} 已存在` };
      }

      // 重命名
      await fs.rename(fullOldPath, fullNewPath);

      logger.info('重命名文件成功', { oldPath, newName, userId: user.id });
      return {
        success: true,
        data: {
          message: '重命名成功',
          newName: newName.trim(),
        },
      };
    } catch (error) {
      logger.error('重命名失败', error, { oldPath, newName });
      return { success: false, error: '重命名失败' };
    }
  });
}

export async function convertImages(): Promise<
  ActionResponse<{
    message: string;
    convertedFiles: string[];
    errorFiles: string[];
  }>
> {
  return withActionPermission('system:convertImages', async (user) => {
    try {
      // 递归查找所有图片文件
      const convertibleImageExts = ['.png', '.jpg', '.jpeg'];
      const convertedFiles: string[] = [];
      const errorFiles: string[] = [];

      async function processDirectory(dirPath: string) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isDirectory()) {
            await processDirectory(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();

            if (convertibleImageExts.includes(ext)) {
              try {
                const baseName = path.basename(entry.name, ext);
                const webpName = `${baseName}.webp`;
                const webpPath = path.join(dirPath, webpName);

                // 检查 WebP 文件是否已存在
                try {
                  await fs.access(webpPath);
                  // 已存在，跳过
                  continue;
                } catch {
                  // 不存在，继续转换
                }

                // 转换图片为 WebP 格式
                const buffer = await fs.readFile(fullPath);
                const compressedBuffer = await processAndSaveImage(buffer, {
                  dir: dirPath,
                  fileName: webpName,
                });
                convertedFiles.push(compressedBuffer.url);
              } catch (error) {
                logger.error(`转换失败: ${entry.name}`, error);
                errorFiles.push(entry.name);
              }
            }
          }
        }
      }

      await processDirectory(UPLOADS_DIR);

      const message = `转换完成: ${convertedFiles.length} 成功, ${errorFiles.length} 失败`;
      logger.info(message, { userId: user.id });
      return {
        success: true,
        data: {
          message,
          convertedFiles,
          errorFiles,
        },
      };
    } catch (error) {
      logger.error('批量转换失败', error);
      return { success: false, error: '批量转换失败' };
    }
  });
}

// 缓存用户当前路径
export async function cacheUploadPath(
  path: string
): Promise<ActionResponse<void>> {
  return withActionPermission('files:read', async (user) => {
    try {
      if (user.id) {
        pathCacheStore.update(user.id, path);
      }
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('缓存路径失败', error, { path });
      return { success: false, error: '缓存路径失败' };
    }
  });
}
