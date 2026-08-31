'use server';

import { pathCacheStore } from '@/store/path-cache-store';
import { goFetch, goUploadMultipart } from '@/lib/server/api-client';
import { appendGoAssetFile } from '@/lib/upload';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { createLogger } from '@/utils/logger';
import { convertImagesWebp } from '../../../scripts/convert-to-webp';

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

// 从 goUploadMultipart 抛出的错误信息中抽取 Go 返回的 error 字段
// 消息形如：`Go API /api/uploads/asset 返回 409: {"error":"已存在"}`
function extractGoError(message: string): string {
  const match = message.match(/返回 \d+: (.+)$/s);
  if (!match) return message;
  try {
    const body = JSON.parse(match[1]);
    if (typeof body?.error === 'string') return body.error;
  } catch {
    // 忽略解析失败，回退到原始消息
  }
  return message;
}

// POST - 上传文件
// 原 Go /api/upload-files 批量上传已移除，改由前端逐文件调用统一上传接口
// /api/uploads/asset 落盘，并聚合出逐文件 results 返回，行为与旧接口一致。
export async function adminUploadFiles(formData: FormData): Promise<
  ActionResponse<{
    message: string;
    results: {
      name: string;
      path: string;
      success: boolean;
      converted?: boolean;
      error?: string;
    }[];
  }>
> {
  return withActionPermission('files:upload', async (user) => {
    try {
      const pathValue = formData.get('path') as string | null;
      const relativePath = pathValue ?? '';
      // 去掉首尾斜杠，作为 /uploads/asset 的 dir
      const dir = relativePath.replace(/^\/+|\/+$/g, '');

      const files = formData.getAll('files') as File[];
      if (files.length === 0) {
        return { success: false, error: '没有提供文件' };
      }

      const results: {
        name: string;
        path: string;
        success: boolean;
        converted?: boolean;
        error?: string;
      }[] = [];

      for (const file of files) {
        try {
          const goFormData = new FormData();
          // 图片转 WebP 并保留源文件；非图片原样转发（由 appendGoAssetFile 统一处理）
          await appendGoAssetFile(goFormData, file, { dir });

          const data = await goUploadMultipart<{ url: string }>(
            '/api/uploads/asset',
            goFormData
          );
          results.push({
            name: file.name,
            path: data.url,
            success: true,
            converted: false,
          });
        } catch (error) {
          results.push({
            name: file.name,
            path: '',
            success: false,
            error:
              error instanceof Error
                ? extractGoError(error.message)
                : '上传失败',
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.length - successCount;

      logger.info('上传文件完成', {
        count: files.length,
        relativePath,
        userId: user.id,
      });
      return {
        success: true,
        data: {
          message: `上传完成: ${successCount} 成功, ${failCount} 失败`,
          results,
        },
      };
    } catch (error) {
      logger.error('转发上传请求失败', error);
      return { success: false, error: '上传失败' };
    }
  });
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
      const data = await goFetch<FileListResponse>(`/api/upload-files${query}`);
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
      logger.info('创建文件夹成功', {
        relativePath,
        folderName,
        userId: user.id,
      });
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
    // 运行命令转换图片为 WebP
    const result = await convertImagesWebp();
    if (result.success) {
      return {
        success: true,
        message: '转换成功',
        data: {
          message: '转换成功',
          convertedFiles: result.data.success,
          errorFiles: result.data.failed,
        },
      };
    }

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
