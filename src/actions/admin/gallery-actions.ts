'use server';

import fs from 'fs/promises';
import path from 'path';
import { DEFAULT_GALLERY_LIST_LIMIT } from '@/config/limit';
import { GALLERY_DIR } from '@/constant/dir';
import { AdminGallery, Gallery, getGalleries } from '@/lib/gallery';
import { paginateItems, PaginationResult } from '@/lib/pagination';
import { serverActionRateLimiter } from '@/lib/rate-limit';
import { createUploadAction } from '@/lib/upload-actions';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import {
  checkFileConflict,
  ensureDirectory,
  fileExists,
  validateSlug,
  writeFileAtomic,
} from '@/utils/file-utils';
import { isPortraitImage } from '@/utils/image-utils';
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
    const all = await getGalleries();

    const filtered = tagSlug
      ? all.filter((item) => item.tags?.includes(tagSlug))
      : all;

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
    // 使用 .json 扩展名
    const filePath = path.join(GALLERY_DIR, `${slug}.json`);

    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, data: JSON.parse(content) as Gallery };
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
      const images = (await getGalleries(true)) as AdminGallery[];

      // 按更新时间排序
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

// GET - 获取单个文件内容
export async function adminGetGallery(
  slug: string
): Promise<ActionResponse<AdminGallery>> {
  return withActionPermission('gallery:read', async () => {
    try {
      // 使用 .json 扩展名
      const filePath = path.join(GALLERY_DIR, `${slug}.json`);

      const content = await fs.readFile(filePath, 'utf-8');
      return {
        success: true,
        data: {
          ...JSON.parse(content),
          slug,
        } as AdminGallery,
      };
    } catch (error) {
      logger.error('获取图库文件失败', error, { slug });
      return { success: false, error: '文件不存在或读取失败' };
    }
  });
}

// POST - 创建文件（JSON 格式）
export async function adminCreateGallery(input: {
  slug: string;
  content: string;
}): Promise<ActionResponse<void>> {
  return withActionPermission('gallery:create', async (user) => {
    // 速率限制检查
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

      // 检查文件名是否合法
      const cleanSlug = slug.trim().toLowerCase();
      const nameCheck = validateSlug(cleanSlug);
      if (nameCheck) {
        return { success: false, error: nameCheck.error };
      }

      // 验证 JSON 格式
      let parsed: AdminGallery;
      try {
        parsed = JSON.parse(content);
      } catch {
        return {
          success: false,
          error: 'JSON 格式无效',
        };
      }

      if (!parsed.title || !parsed.thumbnail) {
        return {
          success: false,
          error: 'JSON 内容缺少必需的字段 (title, thumbnail)',
        };
      }

      // 计算图片是否为竖屏
      const isPortrait = await isPortraitImage(parsed.thumbnail);
      parsed.isPortrait = isPortrait;

      const fileName = `${cleanSlug}.json`;
      const filePath = path.join(GALLERY_DIR, fileName);

      // 检查文件是否已存在
      const conflict = await checkFileConflict(filePath);
      if (conflict) {
        return { success: false, error: conflict.error };
      }

      // 确保目录存在
      await ensureDirectory(GALLERY_DIR);

      // 格式化JSON并写入文件
      const formattedContent = JSON.stringify(parsed, null, 2);
      await writeFileAtomic(filePath, formattedContent, { encoding: 'utf-8' });

      logger.info('创建图库文件成功', { slug: input.slug, userId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('创建图库文件失败', error, { slug: input.slug });
      return { success: false, error: '创建失败，请稍后重试' };
    }
  });
}

// PUT - 更新文件内容
export async function adminUpdateGallery(
  slug: string,
  content: string
): Promise<ActionResponse<void>> {
  return withActionPermission('gallery:update', async (user) => {
    // 速率限制检查
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
      // 使用 .json 扩展名
      const filePath = path.join(GALLERY_DIR, `${slug}.json`);

      // 验证JSON格式并格式化
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        return { success: false, error: 'JSON 格式无效' };
      }

      if (!parsed.title || !parsed.thumbnail) {
        return {
          success: false,
          error: 'JSON 内容缺少必需的字段 (title, thumbnail)',
        };
      }
      // 计算图片是否为竖屏
      const isPortrait = await isPortraitImage(parsed.thumbnail);
      parsed.isPortrait = isPortrait;

      const formattedContent = JSON.stringify(parsed, null, 2);
      await writeFileAtomic(filePath, formattedContent, { encoding: 'utf-8' });
      logger.info('更新图库文件成功', { slug, userId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('更新图库文件失败', error, { slug });
      return { success: false, error: '更新失败' };
    }
  });
}

// PATCH - 重命名文件
export async function adminRenameGalleryFile(
  slug: string,
  newSlug: string
): Promise<ActionResponse<void>> {
  return withActionPermission('gallery:update', async (user) => {
    // 速率限制检查
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
      // 检查新文件名是否合法
      const cleanNewSlug = newSlug.trim().toLowerCase();
      const nameCheck = validateSlug(cleanNewSlug);
      if (nameCheck) {
        return { success: false, error: nameCheck.error };
      }

      // 使用 .json 扩展名
      const oldFilePath = path.join(GALLERY_DIR, `${slug}.json`);
      const newFilePath = path.join(GALLERY_DIR, `${cleanNewSlug}.json`);

      // 检查原文件是否存在
      const exists = await fileExists(oldFilePath);

      if (!exists) {
        return { success: false, error: '原文件不存在' };
      }

      // 检查新文件名是否已存在
      const conflictCheck = await checkFileConflict(newFilePath);
      if (conflictCheck) {
        return { success: false, error: conflictCheck.error || '文件已存在' };
      }

      // 重命名文件
      await fs.rename(oldFilePath, newFilePath);

      logger.info('重命名图库文件成功', { slug, newSlug, userId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('重命名图库文件失败', error, { slug, newSlug });
      return { success: false, error: '重命名失败' };
    }
  });
}

// DELETE - 删除文件
export async function adminDeleteGalleryFile(
  slug: string
): Promise<ActionResponse<void>> {
  return withActionPermission('gallery:delete', async (user) => {
    // 速率限制检查
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
      // 使用 .json 扩展名
      const filePath = path.join(GALLERY_DIR, `${slug}.json`);

      await fs.unlink(filePath);
      logger.info('删除图库文件成功', { slug, userId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('删除图库文件失败', error, { slug });
      return { success: false, error: '删除失败' };
    }
  });
}

export const adminUploadGalleryThumbnail = createUploadAction({
  name: '图库缩略图',
  permission: 'gallery:create',
  rateLimitKey: 'gallery:{userId}',
  formField: 'image',
  validation: { kind: 'mime', prefix: 'image/', label: '图片' },
  storage: { kind: 'image', dir: 'images/gallery', quality: 85 },
  result: { kind: 'raw-url', message: '图片上传成功' },
});
