'use server';

import fs from 'fs/promises';
import path from 'path';
import { pathCacheStore } from '@/store/path-cache-store';
import { isPathSafe } from '@/utils/file-utils';

import { requirePermission } from '@/lib/permissions';

const PUBLIC_DIR = path.join(process.cwd(), 'public');

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
export async function adminGetPublicFiles(
  relativePath: string = ''
): Promise<
  { success: true; data: FileListResponse } | { success: false; error: string }
> {
  const permissionCheck = await requirePermission('files:read');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  // 如果没有提供路径，尝试从缓存中获取
  if (!relativePath && permissionCheck.user?.id) {
    const cachedPath = pathCacheStore.get(permissionCheck.user.id);
    if (cachedPath !== null) {
      relativePath = cachedPath;
    }
  }

  try {
    const targetDir = path.join(PUBLIC_DIR, relativePath);

    // 安全检查
    if (!isPathSafe(targetDir, PUBLIC_DIR)) {
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

        // 构建相对 public 的路径
        const itemRelativePath = path.join(relativePath, entry.name);
        const webPath = '/' + itemRelativePath.replace(/\\/g, '/');

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

// 缓存用户当前路径
export async function cachePublicPath(
  path: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const permissionCheck = await requirePermission('files:read');
    if (!permissionCheck.allowed) {
      return { success: false, error: 'unauthorized' };
    }

    if (!permissionCheck.user?.id) {
      return { success: false, error: '用户ID不存在' };
    }

    // 更新用户路径缓存
    pathCacheStore.update(permissionCheck.user.id, path);

    return { success: true };
  } catch (error) {
    console.error('缓存路径失败:', error);
    return { success: false, error: '缓存路径失败' };
  }
}
