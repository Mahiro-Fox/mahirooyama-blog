'use server';

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

import { checkFileConflict, FileUtils } from '@/utils/file-utils';
import { requirePermission } from '@/lib/permissions';

const BLOG_DIR = path.join(process.cwd(), 'src', 'content', 'blog');

export interface MdxFile {
  slug: string;
  fileName: string;
  title: string;
  description: string;
  createdAt: string;
  tags: string[];
  size: number;
  updatedAt: string;
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
          createdAt: parsed.data.createdAt || '',
          tags: parsed.data.tags || [],
          size: (await fs.stat(filePath)).size,
          updatedAt: (await fs.stat(filePath)).mtime.toISOString(),
        };
      })
    );

    // 按日期排序
    posts.sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    );

    return { success: true, files: posts };
  } catch (error) {
    console.error('获取 MDX 文件列表失败:', error);
    return { success: false, error: '获取文件列表失败' };
  }
}

// GET - 获取单个文件内容
export async function adminGetBlogFile(slug: string): Promise<
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
