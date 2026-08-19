'use server';

import { DEFAULT_GALLERY_LIST_LIMIT } from '@/config/limit';
import { paginateItems, PaginationResult } from '@/lib/pagination';
import { serverActionRateLimiter } from '@/lib/rate-limit';
import { goFetch } from '@/lib/server/api-client';
import { createGoUploadAction } from '@/lib/upload-actions';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { validateSlug } from '@/utils/file-utils';
import { createLogger } from '@/utils/logger';

const logger = createLogger('GalleryActions');

export interface GetPublicGalleriesOptions {
  page?: number;
  pageSize?: number;
  tagSlug?: string;
  all?: boolean;
}

export async function getPublicGalleries(
  options: GetPublicGalleriesOptions = {
    page: 1,
    pageSize: DEFAULT_GALLERY_LIST_LIMIT,
  }
): Promise<ActionResponse<PaginationResult<Gallery>>> {
  try {
    const { page, pageSize = DEFAULT_GALLERY_LIST_LIMIT, tagSlug } = options;

    const result = await goFetch<{ items: AdminGallery[] }>(
      '/api/gallery-files'
    );
    const all = result.items;

    // 转换为 Gallery 类型
    const galleries: Gallery[] = all.map((item) => ({
      slug: item.slug,
      title: item.title,
      description: item.description,
      thumbnail: item.thumbnail,
      isPortrait: item.isPortrait,
      lastUpdated: item.lastUpdated,
      tags: item.tags,
    }));

    const filtered = tagSlug
      ? galleries.filter((item) => item.tags?.includes(tagSlug))
      : galleries;

    if (options.all)
      return {
        success: true,
        data: {
          items: filtered,
          currentPage: 1,
          totalPages: 1,
          totalItems: filtered.length,
        },
      };

    return {
      success: true,
      data: paginateItems<Gallery>(filtered, page, pageSize),
    };
  } catch (error) {
    logger.error('获取公开图库列表失败', error);
    return { success: false, error: '获取图库列表失败' };
  }
}

export async function getPublicGallery(
  slug: string
): Promise<ActionResponse<Gallery>> {
  try {
    const result = await goFetch<{ data: Gallery }>(
      `/api/gallery-files/${slug}`
    );
    return { success: true, data: { ...result.data, slug } };
  } catch (error) {
    logger.error('获取图库详情失败', error, { slug });
    return { success: false, error: '获取图库详情失败' };
  }
}

export async function adminGetGalleries(): Promise<
  ActionResponse<AdminGallery[]>
> {
  return withActionPermission('gallery:read', async () => {
    try {
      const result = await goFetch<{ items: AdminGallery[] }>(
        '/api/gallery-files'
      );
      const images = result.items;

      images.sort(
        (a, b) =>
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );

      return { success: true, data: images };
    } catch (error) {
      logger.error('获取图库文件列表失败', error);
      return { success: false, error: '获取文件列表失败' };
    }
  });
}

export async function adminGetGallery(
  slug: string
): Promise<ActionResponse<AdminGallery>> {
  return withActionPermission('gallery:read', async () => {
    try {
      const result = await goFetch<{ data: AdminGallery }>(
        `/api/gallery-files/${slug}`
      );
      return {
        success: true,
        data: { ...result.data, slug } as AdminGallery,
      };
    } catch (error) {
      logger.error('获取图库文件失败', error, { slug });
      return { success: false, error: '文件不存在或读取失败' };
    }
  });
}

export async function adminCreateGallery(input: {
  slug: string;
  content: string;
}): Promise<ActionResponse<void>> {
  return withActionPermission('gallery:create', async (user) => {
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(
        `gallery:${user.id}`
      );
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
    }

    try {
      const { slug, content } = input;
      if (!slug || !content) {
        return { success: false, error: '缺少必需字段 (slug, content)' };
      }

      const cleanSlug = slug.trim().toLowerCase();
      const nameCheck = validateSlug(cleanSlug);
      if (nameCheck) {
        return { success: false, error: nameCheck.error };
      }

      await goFetch('/api/gallery-files', {
        method: 'POST',
        body: JSON.stringify({ slug: cleanSlug, content }),
      });

      logger.info('创建图库文件成功', { slug: cleanSlug, userId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('创建图库文件失败', error, { slug: input.slug });
      const message = error instanceof Error ? error.message : '创建失败';
      return { success: false, error: message };
    }
  });
}

export async function adminUpdateGallery(
  slug: string,
  content: string
): Promise<ActionResponse<void>> {
  return withActionPermission('gallery:update', async (user) => {
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(
        `gallery:${user.id}`
      );
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
    }

    try {
      await goFetch(`/api/gallery-files/${slug}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      });

      logger.info('更新图库文件成功', { slug, userId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('更新图库文件失败', error, { slug });
      const message = error instanceof Error ? error.message : '更新失败';
      return { success: false, error: message };
    }
  });
}

export async function adminRenameGalleryFile(
  slug: string,
  newSlug: string
): Promise<ActionResponse<void>> {
  return withActionPermission('gallery:update', async (user) => {
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(
        `gallery:${user.id}`
      );
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
    }

    try {
      const cleanNewSlug = newSlug.trim().toLowerCase();
      const nameCheck = validateSlug(cleanNewSlug);
      if (nameCheck) {
        return { success: false, error: nameCheck.error };
      }

      await goFetch(`/api/gallery-files/${slug}`, {
        method: 'PATCH',
        body: JSON.stringify({ newSlug: cleanNewSlug }),
      });

      logger.info('重命名图库文件成功', {
        slug,
        newSlug: cleanNewSlug,
        userId: user.id,
      });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('重命名图库文件失败', error, { slug, newSlug });
      const message = error instanceof Error ? error.message : '重命名失败';
      return { success: false, error: message };
    }
  });
}

export async function adminDeleteGalleryFile(
  slug: string
): Promise<ActionResponse<void>> {
  return withActionPermission('gallery:delete', async (user) => {
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(
        `gallery:${user.id}`
      );
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
    }

    try {
      const nameCheck = validateSlug(slug);
      if (nameCheck) {
        return { success: false, error: nameCheck.error };
      }

      await goFetch(`/api/gallery-files/${slug}`, {
        method: 'DELETE',
      });

      logger.info('删除图库文件成功', { slug, userId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('删除图库文件失败', error, { slug });
      const message = error instanceof Error ? error.message : '删除失败';
      return { success: false, error: message };
    }
  });
}

// 上传图库 JSON 文件（multipart）- 由 gallery-client.tsx 的上传按钮调用
// 经统一上传接口 /api/uploads/asset 转发，dir=content/gallery（Go 负责落盘）
export const adminUploadGalleryFile = createGoUploadAction({
  name: '图库JSON文件',
  permission: 'gallery:create',
  rateLimitKey: 'gallery:{userId}',
  formField: 'file',
  label: 'JSON文件',
  dir: 'content/gallery',
  target: 'raw',
  result: { kind: 'raw-url', message: 'JSON文件上传成功' },
});

export const adminUploadGalleryThumbnail = createGoUploadAction({
  name: '图库缩略图',
  permission: 'gallery:create',
  rateLimitKey: 'gallery:{userId}',
  formField: 'image',
  label: '图片',
  dir: 'images/gallery',
  target: 'image',
  quality: 85,
  result: { kind: 'raw-url', message: '图片上传成功' },
});
