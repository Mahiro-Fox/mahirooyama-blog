'use server';

import fs from 'fs/promises';
import path from 'path';
import { BLOG_DIR } from '@/constant/dir';
import {
  checkFileConflict,
  fileExists,
  validateSlug,
} from '@/utils/file-utils';
import { processAndSaveImage } from '@/utils/image-utils';
import matter from 'gray-matter';

import { requirePermission } from '@/lib/permissions';
import { serverActionRateLimiter } from '@/lib/rate-limit';

export interface MdxFile {
  slug: string;
  fileName: string;
  title: string;
  description: string;
  lastUpdated: string;
  tags: string[];
  size: number;
}

// GET - 获取 MDX 文件列表
export async function adminGetBlogFiles(): Promise<
  { success: true; files: MdxFile[] } | { success: false; error: string }
> {
  const permissionCheck = await requirePermission('blog:read');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    const files = await fs.readdir(BLOG_DIR);
    const mdxFiles = files.filter((file) => file.endsWith('.mdx'));

    const posts = await Promise.all(
      mdxFiles.map(async (file) => {
        const filePath = path.join(BLOG_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = matter(content);

        return {
          slug: path.basename(file, '.mdx'),
          fileName: file,
          title: parsed.data.title || '无标题',
          description: parsed.data.description || '',
          lastUpdated: parsed.data.lastUpdated || '',
          tags: parsed.data.tags || [],
          size: (await fs.stat(filePath)).size,
        };
      })
    );

    // 按日期排序
    posts.sort(
      (a, b) =>
        new Date(b.lastUpdated || 0).getTime() -
        new Date(a.lastUpdated || 0).getTime()
    );

    return { success: true, files: posts };
  } catch (error) {
    console.error('获取 MDX 文件列表失败:', error);
    return { success: false, error: '获取文件列表失败' };
  }
}

// GET - 获取单个文件内容
export async function adminGetBlogFile(
  slug: string
): Promise<
  { success: true; content: string } | { success: false; error: string }
> {
  const permissionCheck = await requirePermission('blog:read');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    console.error('获取 MDX 文件失败:', error);
    return { success: false, error: '文件不存在或读取失败' };
  }
}

// PUT - 更新文件内容
export async function adminUpdateBlogFile(
  slug: string,
  content: string
): Promise<
  { success: true } | { success: false; error: string; resetTime?: number }
> {
  const permissionCheck = await requirePermission('blog:update');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  // 速率限制检查
  if (permissionCheck.user?.id) {
    const rateLimit = await serverActionRateLimiter.check(
      `blog:${permissionCheck.user.id}`
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
    const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('更新 MDX 文件失败:', error);
    return { success: false, error: '更新失败' };
  }
}

// POST - 创建新文件
export async function adminCreateBlogFile({
  slug,
  content,
}: {
  slug: string;
  content: string;
}): Promise<
  { success: true } | { success: false; error: string; resetTime?: number }
> {
  const permissionCheck = await requirePermission('blog:create');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  // 速率限制检查
  if (permissionCheck.user?.id) {
    const rateLimit = await serverActionRateLimiter.check(
      `blog:${permissionCheck.user.id}`
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
    if (!slug || !content) {
      return { success: false, error: '缺少必需字段 (slug, content)' };
    }
    // 检查文件名是否合法
    const cleanSlug = slug.trim().toLowerCase();
    const nameCheck = validateSlug(cleanSlug);
    if (nameCheck) {
      return { success: false, error: nameCheck.error };
    }

    // 验证 mdx 格式
    const parsed = matter(content);
    if (!parsed.data.title || !parsed.data.thumbnail) {
      return {
        success: false,
        error: 'mdx 内容缺少必需的字段 (title, thumbnail)',
      };
    }

    const filePath = path.join(BLOG_DIR, `${slug}.mdx`);

    // 检查文件冲突
    const conflictCheck = await checkFileConflict(filePath);
    if (conflictCheck) {
      return { success: false, error: conflictCheck.error || '文件已存在' };
    }

    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('创建 MDX 文件失败:', error);
    return { success: false, error: '创建失败' };
  }
}

// PATCH - 重命名文件
export async function adminRenameBlogFile(
  slug: string,
  newSlug: string
): Promise<
  { success: true } | { success: false; error: string; resetTime?: number }
> {
  const permissionCheck = await requirePermission('blog:update');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  // 速率限制检查
  if (permissionCheck.user?.id) {
    const rateLimit = await serverActionRateLimiter.check(
      `blog:${permissionCheck.user.id}`
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

    // 尝试找到原文件
    const oldFilePath = path.join(BLOG_DIR, `${slug}.mdx`);
    const oldExt = '.mdx';
    const exists = await fileExists(oldFilePath);

    if (!exists) {
      return { success: false, error: '原文件不存在' };
    }

    // 检查新文件名是否已存在
    const newFilePath = path.join(BLOG_DIR, `${cleanNewSlug}${oldExt}`);
    const conflictCheck = await checkFileConflict(newFilePath);
    if (conflictCheck) {
      return { success: false, error: conflictCheck.error || '文件已存在' };
    }

    // 重命名文件
    await fs.rename(oldFilePath, newFilePath);

    return { success: true };
  } catch (error) {
    console.error('重命名博客文件失败:', error);
    return { success: false, error: '重命名失败' };
  }
}

// DELETE - 删除文件
export async function adminDeleteBlogFile(
  slug: string
): Promise<
  { success: true } | { success: false; error: string; resetTime?: number }
> {
  const permissionCheck = await requirePermission('blog:delete');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  // 速率限制检查
  if (permissionCheck.user?.id) {
    const rateLimit = await serverActionRateLimiter.check(
      `blog:${permissionCheck.user.id}`
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
    const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
    await fs.unlink(filePath);
    return { success: true };
  } catch (error) {
    console.error('删除 MDX 文件失败:', error);
    return { success: false, error: '删除失败，文件可能不存在' };
  }
}

// POST - 上传博客缩略图
export async function adminUploadBlogThumbnail(
  formData: FormData
): Promise<
  | { success: true; url: string; message: string }
  | { success: false; error: string; resetTime?: number }
> {
  const permissionCheck = await requirePermission('blog:create');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  // 速率限制检查
  if (permissionCheck.user?.id) {
    const rateLimit = await serverActionRateLimiter.check(
      `blog:${permissionCheck.user.id}`
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
    // 1. 解析上传的文件
    const file = formData.get('image') as File | null;

    if (!file) {
      return { success: false, error: '未提供图片文件' };
    }

    // 2. 验证文件类型
    if (!file.type.startsWith('image/')) {
      return { success: false, error: '只允许上传图片文件' };
    }

    // 3. 验证文件大小 (最大 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: '图片大小不能超过 5MB' };
    }

    // 4. 读取文件并处理
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 5. 处理并保存图片
    const result = await processAndSaveImage(buffer, {
      dir: 'images/blog',
      fileName: file.name,
      quality: 85,
    });

    // 6. 返回图片URL
    return {
      success: true,
      url: result.url,
      message: '图片上传成功',
    };
  } catch (error) {
    console.error('博客缩略图上传失败:', error);
    const errorMessage =
      error instanceof Error ? error.message : '图片上传失败';
    return { success: false, error: errorMessage };
  }
}
