'use server';

import matter from 'gray-matter';
import { DEFAULT_BLOG_LIST_LIMIT } from '@/config/limit';
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

    // 从 Go API 获取所有博客
    const result = await goFetch<{ items: AdminBlog[] }>('/api/blog-files');
    const all = result.items;

    // 转换为 Blog 类型（去除 size/fileName 字段）
    const blogs: Blog[] = all.map((item) => ({
      slug: item.slug,
      title: item.title,
      description: item.description,
      thumbnail: item.thumbnail,
      isPortrait: item.isPortrait,
      lastUpdated: item.lastUpdated,
      tags: item.tags,
      rawContent: '',
      renderContent: '',
    }));

    const sorted = [...blogs].sort(
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
    const result = await goFetch<{ content: string }>(
      `/api/blog-files/${slug}`
    );
    const parsed = matter(result.content);

    const blog: Blog = {
      slug,
      rawContent: result.content,
      title: parsed.data.title || '',
      description: parsed.data.description || '',
      thumbnail: parsed.data.thumbnail,
      isPortrait: parsed.data.isPortrait || false,
      lastUpdated: parsed.data.lastUpdated || '',
      tags: parsed.data.tags || [],
      renderContent: parsed.content,
    };

    return { success: true, data: blog };
  } catch (error) {
    logger.error('获取博客详情失败', error, { slug });
    return { success: false, error: '获取博客详情失败' };
  }
}

export async function adminGetBlogs(): Promise<ActionResponse<AdminBlog[]>> {
  return withActionPermission('blog:read', async () => {
    try {
      const result = await goFetch<{ items: AdminBlog[] }>('/api/blog-files');
      const posts = result.items;

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
      const result = await goFetch<{ content: string }>(
        `/api/blog-files/${slug}`
      );
      return { success: true, data: result.content };
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

      // 验证 frontmatter 中 title 和 thumbnail 字段
      const parsed = matter(content);
      if (!parsed.data.title) {
        return {
          success: false,
          error: 'mdx 内容缺少必需的字段 (title, thumbnail)',
        };
      }

      await goFetch(`/api/blog-files`, {
        method: 'POST',
        body: JSON.stringify({ slug: cleanSlug, content }),
      });

      logger.info('创建 MDX 文件成功', { slug: cleanSlug, userId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('创建 MDX 文件失败', error, { slug });
      const message = error instanceof Error ? error.message : '创建失败';
      return { success: false, error: message };
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

      await goFetch(`/api/blog-files/${slug}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      });

      logger.info('更新 MDX 文件成功', { slug, userId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('更新 MDX 文件失败', error, { slug });
      const message = error instanceof Error ? error.message : '更新失败';
      return { success: false, error: message };
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

      await goFetch(`/api/blog-files/${slug}`, {
        method: 'PATCH',
        body: JSON.stringify({ newSlug: cleanNewSlug }),
      });

      logger.info('重命名博客文件成功', {
        oldSlug: slug,
        newSlug: cleanNewSlug,
        userId: user.id,
      });

      return { success: true, data: undefined };
    } catch (error) {
      logger.error('重命名博客文件失败', error, { oldSlug: slug, newSlug });
      const message = error instanceof Error ? error.message : '重命名失败';
      return { success: false, error: message };
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

      await goFetch(`/api/blog-files/${slug}`, {
        method: 'DELETE',
      });

      logger.info('删除 MDX 文件成功', { slug, userId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('删除 MDX 文件失败', error, { slug });
      const message = error instanceof Error ? error.message : '删除失败';
      return { success: false, error: message };
    }
  });
}

// 上传 MDX 文件（multipart）- 由 blog-client.tsx 的上传按钮调用
// 经统一上传接口 /api/uploads/asset 转发，dir=content/blog（Go 负责落盘）
export const adminUploadBlogFile = createGoUploadAction({
  name: '博客MDX文件',
  permission: 'blog:create',
  rateLimitKey: 'blog:{userId}',
  formField: 'file',
  label: 'MDX文件',
  dir: 'content/blog',
  target: 'raw',
  result: { kind: 'raw-url', message: 'MDX文件上传成功' },
});

export const adminUploadBlogThumbnail = createGoUploadAction({
  name: '博客缩略图',
  permission: 'blog:create',
  rateLimitKey: 'blog:{userId}',
  formField: 'image',
  label: '图片',
  dir: 'images/blog',
  target: 'image',
  quality: 85,
  result: { kind: 'raw-url', message: '图片上传成功' },
});
