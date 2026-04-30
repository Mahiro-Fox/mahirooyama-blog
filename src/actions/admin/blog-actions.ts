'use server';

import fs from 'fs/promises';
import path from 'path';
import { BLOG_DIR } from '@/constant/dir';
import { checkFileConflict } from '@/utils/file-utils';
import matter from 'gray-matter';

import { requirePermission } from '@/lib/permissions';

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
): Promise<{ success: true } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('blog:update');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
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
}): Promise<{ success: true } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('blog:create');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
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
): Promise<{ success: true } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('blog:update');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    if (!newSlug || newSlug.trim() === '') {
      return { success: false, error: '新文件名不能为空' };
    }

    // 清理新文件名
    const cleanNewSlug = newSlug.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();

    // 尝试找到原文件
    let oldFilePath = path.join(BLOG_DIR, `${slug}.mdx`);
    let oldExt = '.mdx';
    try {
      await fs.access(oldFilePath);
    } catch {
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
): Promise<{ success: true } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('blog:delete');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
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
