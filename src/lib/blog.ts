import fs from 'fs/promises';
import path from 'path';
import { BLOG_DIR } from '@/constant/dir';
import matter from 'gray-matter';

export interface BlogFile {
  slug: string;
  fileName: string;
  title: string;
  description: string;
  lastUpdated: string;
  tags: string[];
  size: number;
}

export async function getBlogs(): Promise<BlogFile[]> {
  try {
    await fs.access(BLOG_DIR);
  } catch {
    return [];
  }

  const files = await fs.readdir(BLOG_DIR);
  const mdxFiles = files.filter((file) => file.endsWith('.mdx'));

  const posts = await Promise.all(
    mdxFiles.map(async (file) => {
      const filePath = path.join(BLOG_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = matter(content);
      const stats = await fs.stat(filePath);

      return {
        slug: path.basename(file, '.mdx'),
        fileName: file,
        title: parsed.data.title || '无标题',
        description: parsed.data.description || '',
        lastUpdated: parsed.data.lastUpdated || '',
        tags: parsed.data.tags || [],
        size: stats.size,
      };
    })
  );

  return posts;
}
