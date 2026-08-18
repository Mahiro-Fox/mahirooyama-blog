'use server';

import { pathCacheStore } from '@/store/path-cache-store';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { createLogger } from '@/utils/logger';
import { goFetch } from '@/lib/server/api-client';

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

// GET - 获取文件列表（转发到 Go GET /api/upload-files）
export async function adminGetUploadFiles(
  relativePath?: string
): Promise<ActionResponse<FileListResponse>> {
  return withActionPermission('files:read', async (user) => {
    let finalRelativePath = relativePath;

    if (finalRelativePath === undefined && user.id) {
      const cachedPath = pathCacheStore.get(user.id);
      finalRelativePath = cachedPath !== null ? cachedPath : '';
    } else if (finalRelativePath === undefined) {
      finalRelativePath = '';
    }

    try {
      const query = finalRelativePath
        ? `?path=${encodeURIComponent(finalRelativePath)}`
        : '';
      const data = await goFetch<FileListResponse>(
        `/api/upload-files${query}`
      );
      return { success: true, data };
    } catch (error) {
      logger.error('获取文件列表失败', error, { relativePath });
      return { success: false, error: '获取文件列表失败' };
    }
  });
}

// 创建文件夹（转发到 Go POST /api/upload-files/folder）
export async function createFolder(
  relativePath: string,
  folderName: string
): Promise<ActionResponse<{ folderName: string; message: string }>> {
  return withActionPermission('files:manageFolder', async (user) => {
    if (!folderName || folderName.trim() === '') {
      return { success: false, error: '文件夹名称不能为空' };
    }

    try {
      const data = await goFetch<{ message: string; folderName: string }>(
        '/api/upload-files/folder',
        {
          method: 'POST',
          body: JSON.stringify({ relativePath, folderName: folderName.trim() }),
        }
      );
      logger.info('创建文件夹成功', { relativePath, folderName, userId: user.id });
      return { success: true, data };
    } catch (error) {
      logger.error('创建文件夹失败', error, { relativePath, folderName });
      return { success: false, error: '创建文件夹失败' };
    }
  });
}

// 删除文件（转发到 Go DELETE /api/upload-files?path=）
export async function deleteFile(
  filePath: string
): Promise<ActionResponse<{ message: string }>> {
  return withActionPermission('files:delete', async (user) => {
    try {
      const query = `?path=${encodeURIComponent(filePath)}`;
      await goFetch(`/api/upload-files${query}`, { method: 'DELETE' });
      logger.info('删除文件成功', { filePath, userId: user.id });
      return { success: true, data: { message: '删除成功' } };
    } catch (error) {
      logger.error('删除失败', error, { filePath });
      const msg = error instanceof Error ? error.message : '删除失败';
      return { success: false, error: msg };
    }
  });
}

// 重命名文件（转发到 Go PUT /api/upload-files）
export async function renameFile(
  oldPath: string,
  newName: string
): Promise<ActionResponse<{ message: string; newName: string }>> {
  return withActionPermission('files:update', async (user) => {
    if (!newName || newName.trim() === '') {
      return { success: false, error: '新名称不能为空' };
    }

    try {
      const data = await goFetch<{ message: string; newName: string }>(
        '/api/upload-files',
        {
          method: 'PUT',
          body: JSON.stringify({ oldPath, newName: newName.trim() }),
        }
      );
      logger.info('重命名文件成功', { oldPath, newName, userId: user.id });
      return { success: true, data };
    } catch (error) {
      logger.error('重命名失败', error, { oldPath, newName });
      const msg = error instanceof Error ? error.message : '重命名失败';
      return { success: false, error: msg };
    }
  });
}

// 批量转换图片为 WebP（Go 端暂未实现，返回提示）
export async function convertImages(): Promise<
  ActionResponse<{
    message: string;
    convertedFiles: string[];
    errorFiles: string[];
  }>
> {
  return withActionPermission('system:convertImages', async () => {
    return {
      success: false,
      error: '批量转换功能已迁移到 Go 后端，暂未实现',
    };
  });
}

// 缓存用户当前路径（Next.js 内存缓存，不涉及文件操作，保留原逻辑）
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
