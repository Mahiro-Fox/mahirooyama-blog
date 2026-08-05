'use server';

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { DEFAULT_BLOG_LIST_LIMIT } from '@/config/limit';
import { BLOG_DIR } from '@/constant/dir';
import { AdminBlog, Blog, getBlogs } from '@/lib/blog';
import { paginateItems, PaginationResult } from '@/lib/pagination';
import { serverActionRateLimiter } from '@/lib/rate-limit';
import { createUploadAction } from '@/lib/upload-actions';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import {
  checkFileConflict,
  fileExists,
  validateSlug,
  writeFileAtomic,
} from '@/utils/file-utils';
import { createLogger } from '@/utils/logger';

const logger = createLogger('BlogActions');

export interface GetPublicBlogsOptions {
  page?: number;
  pageSize?: number;
  tagSlug?: string;
  all?: boolean;
}

export async function getPublicBlogs(
  options: GetPublicBlogsOptions = {
    page: 1,
    pageSize: DEFAULT_BLOG_LIST_LIMIT,
  }
): Promise<ActionResponse<PaginationResult<Blog>>> {
  try {
    const { page, pageSize = DEFAULT_BLOG_LIST_LIMIT, tagSlug } = options;
    const all = (await getBlogs()) as Blog[];

    const sorted = [...all].sort(
      (a, b) =>
        new Date(b.lastUpdated || 0).getTime() -
        new Date(a.lastUpdated || 0).getTime()
    );

    const filtered = tagSlug
      ? sorted.filter((item) => item.tags?.includes(tagSlug))
      : sorted;

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
      data: paginateItems<Blog>(filtered, page, pageSize),
    };
  } catch (error) {
    logger.error('获取公开博客列表失败', error);
    return { success: false, error: '获取博客列表失败' };
  }
}

export async function getPublicBlog(
  slug: string
): Promise<ActionResponse<Blog>> {
  try {
    const all = (await getBlogs()) as Blog[];
    const post = all.find((item) => item.slug === slug);

    if (!post) {
      return { success: false, error: '博客不存在' };
    }

    return { success: true, data: post };
  } catch (error) {
    logger.error('获取博客详情失败', error, { slug });
    return { success: false, error: '获取博客详情失败' };
  }
}

export async function adminGetBlogs(): Promise<ActionResponse<AdminBlog[]>> {
  return withActionPermission('blog:read', async () => {
    try {
      const posts = (await getBlogs(true)) as AdminBlog[];

      posts.sort(
        (a, b) =>
          new Date(b.lastUpdated || 0).getTime() -
          new Date(a.lastUpdated || 0).getTime()
      );

      return { success: true, data: posts };
    } catch (error) {
      logger.error('获取 MDX 文件列表失败', error);
      return { success: false, error: '获取文件列表失败' };
    }
  });
}

export async function adminGetBlog(
  slug: string
): Promise<ActionResponse<string>> {
  return withActionPermission('blog:read', async () => {
    try {
      const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
      const content = await fs.readFile(filePath, 'utf-8');
      return { success: true, data: content };
    } catch (error) {
      logger.error('获取 MDX 文件失败', error, { slug });
      return { success: false, error: '文件不存在或读取失败' };
    }
  });
}

export async function adminCreateBlog({
  slug,
  content,
}: {
  slug: string;
  content: string;
}): Promise<ActionResponse<void>> {
  return withActionPermission('blog:create', async (user) => {
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(`blog:${user.id}`);
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
    }

    try {
      if (!slug || !content) {
        return { success: false, error: '缺少必需字段 (slug, content)' };
      }
      const cleanSlug = slug.trim().toLowerCase();
      const nameCheck = validateSlug(cleanSlug);
      if (nameCheck) {
        return { success: false, error: nameCheck.error };
      }

      const parsed = matter(content);
      if (!parsed.data.title || !parsed.data.thumbnail) {
        return {
          success: false,
          error: 'mdx 内容缺少必需的字段 (title, thumbnail)',
        };
      }

      const filePath = path.join(BLOG_DIR, `${cleanSlug}.mdx`);

      const conflictCheck = await checkFileConflict(filePath);
      if (conflictCheck) {
        return { success: false, error: conflictCheck.error || '文件已存在' };
      }

      await writeFileAtomic(filePath, content, { encoding: 'utf-8' });
      logger.info('创建 MDX 文件成功', { slug, userId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('创建 MDX 文件失败', error, { slug });
      return { success: false, error: '创建失败' };
    }
  });
}

export async function adminUpdateBlog(
  slug: string,
  content: string
): Promise<ActionResponse<void>> {
  return withActionPermission('blog:update', async (user) => {
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(`blog:${user.id}`);
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
      const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
      await writeFileAtomic(filePath, content, { encoding: 'utf-8' });
      logger.info('更新 MDX 文件成功', { slug, userId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('更新 MDX 文件失败', error, { slug });
      return { success: false, error: '更新失败' };
    }
  });
}

export async function adminRenameBlogFile(
  slug: string,
  newSlug: string
): Promise<ActionResponse<void>> {
  return withActionPermission('blog:update', async (user) => {
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(`blog:${user.id}`);
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

      const oldFilePath = path.join(BLOG_DIR, `${slug}.mdx`);
      const oldExt = '.mdx';
      const exists = await fileExists(oldFilePath);

      if (!exists) {
        return { success: false, error: '原文件不存在' };
      }

      const newFilePath = path.join(BLOG_DIR, `${cleanNewSlug}${oldExt}`);
      const conflictCheck = await checkFileConflict(newFilePath);
      if (conflictCheck) {
        return { success: false, error: conflictCheck.error || '文件已存在' };
      }

      await fs.rename(oldFilePath, newFilePath);
      logger.info('重命名博客文件成功', {
        oldSlug: slug,
        newSlug: cleanNewSlug,
        userId: user.id,
      });

      return { success: true, data: undefined };
    } catch (error) {
      logger.error('重命名博客文件失败', error, { oldSlug: slug, newSlug });
      return { success: false, error: '重命名失败' };
    }
  });
}

export async function adminDeleteBlogFile(
  slug: string
): Promise<ActionResponse<void>> {
  return withActionPermission('blog:delete', async (user) => {
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(`blog:${user.id}`);
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
      const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
      await fs.unlink(filePath);
      logger.info('删除 MDX 文件成功', { slug, userId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('删除 MDX 文件失败', error, { slug });
      return { success: false, error: '删除失败，文件可能不存在' };
    }
  });
}

export const adminUploadBlogThumbnail = createUploadAction({
  name: '博客缩略图',
  permission: 'blog:create',
  rateLimitKey: 'blog:{userId}',
  formField: 'image',
  validation: { kind: 'mime', prefix: 'image/', label: '图片' },
  storage: { kind: 'image', dir: 'images/blog', quality: 85 },
  result: { kind: 'raw-url', message: '图片上传成功' },
});
