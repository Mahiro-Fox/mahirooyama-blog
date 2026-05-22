'use server';

import fs from 'fs/promises';
import path from 'path';
import { UPLOADS_DIR } from '@/constant/dir';
import {
  checkFileConflict,
  ensureFileInitialized,
  isPathSafe,
} from '@/utils/file-utils';
import sharp from 'sharp';

import { requirePermission } from '@/lib/permissions';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  lastUpdated: string;
  extension?: string;
}

export async function adminGetUploadFiles(relativePath: string = '') {
  try {
    const targetDir = path.join(UPLOADS_DIR, relativePath);

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
        const itemRelativePath = path.join(relativePath, entry.name);
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
    const breadcrumb = relativePath
      ? relativePath.split(/[/\\]/).filter(Boolean)
      : [];

    return {
      success: true,
      data: {
        items,
        currentPath: relativePath,
        breadcrumb,
      },
    };
  } catch (error) {
    console.error('获取文件列表失败:', error);
    return { success: false, error: '获取文件列表失败' };
  }
}

export async function createFolder(relativePath: string, folderName: string) {
  try {
    // 检查权限
    const permissionCheck = await requirePermission('files:manageFolder');
    if (!permissionCheck.allowed) {
      return { success: false, error: '权限不足' };
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

    await ensureFileInitialized(newFolderPath);

    return {
      success: true,
      message: '文件夹创建成功',
      folderName: folderName.trim(),
    };
  } catch (error) {
    console.error('创建文件夹失败:', error);
    return { success: false, error: '创建文件夹失败' };
  }
}

export async function deleteFile(filePath: string) {
  try {
    // 检查权限
    const permissionCheck = await requirePermission('files:delete');
    if (!permissionCheck.allowed) {
      return { success: false, error: '权限不足' };
    }

    const fullPath = path.join(UPLOADS_DIR, filePath.replace(/^\//, ''));

    // 安全检查
    if (!isPathSafe(fullPath, UPLOADS_DIR)) {
      return { success: false, error: '非法路径' };
    }

    // 检查文件是否存在
    try {
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        // 删除目录及其内容
        await fs.rmdir(fullPath, { recursive: true });
      } else {
        // 删除文件
        await fs.unlink(fullPath);
      }
    } catch {
      return { success: false, error: '文件不存在' };
    }

    return { success: true, message: '删除成功' };
  } catch (error) {
    console.error('删除失败:', error);
    return { success: false, error: '删除失败' };
  }
}

export async function renameFile(oldPath: string, newName: string) {
  try {
    // 检查权限
    const permissionCheck = await requirePermission('files:update');
    if (!permissionCheck.allowed) {
      return { success: false, error: '权限不足' };
    }

    if (!newName || newName.trim() === '') {
      return { success: false, error: '新名称不能为空' };
    }

    const fullOldPath = path.join(UPLOADS_DIR, oldPath.replace(/^\//, ''));
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
    const conflict = await checkFileConflict(fullNewPath);
    if (conflict) {
      return { success: false, error: conflict.error };
    }

    // 重命名
    await fs.rename(fullOldPath, fullNewPath);

    return {
      success: true,
      message: '重命名成功',
      newName: newName.trim(),
    };
  } catch (error) {
    console.error('重命名失败:', error);
    return { success: false, error: '重命名失败' };
  }
}

export async function convertImages() {
  try {
    // 检查权限
    const permissionCheck = await requirePermission('system:convertImages');
    if (!permissionCheck.allowed) {
      return { success: false, error: '权限不足' };
    }

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

              // 转换图片为 WebP
              await sharp(fullPath)
                .webp({
                  quality: 80,
                  effort: 4,
                })
                .toFile(webpPath);

              convertedFiles.push(path.relative(UPLOADS_DIR, webpPath));
            } catch (error) {
              console.error(`转换失败: ${entry.name}`, error);
              errorFiles.push(entry.name);
            }
          }
        }
      }
    }

    await processDirectory(UPLOADS_DIR);

    return {
      success: true,
      message: `转换完成: ${convertedFiles.length} 成功, ${errorFiles.length} 失败`,
      convertedFiles,
      errorFiles,
    };
  } catch (error) {
    console.error('批量转换失败:', error);
    return { success: false, error: '批量转换失败' };
  }
}
