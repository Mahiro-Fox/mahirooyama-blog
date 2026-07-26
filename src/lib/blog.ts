import fs from 'fs/promises';
import path from 'path';
import { BLOG_DIR } from '@/constant/dir';
import { ensureDirectory } from '@/utils/file-utils';
import { isPortraitImage } from '@/utils/image-utils';
import matter from 'gray-matter';

export type Blog = {
  slug: string;
  title: string;
  description: string;
  thumbnail?: string;
  isPortrait: boolean;
  lastUpdated: string;
  tags?: string[];
  rawContent: string;
};

export type AdminBlog = Blog & {
  fileName: string;
  size: number;
};

export async function getBlogs(
  isAdmin?: boolean
): Promise<AdminBlog[] | Blog[]> {
  try {
    await fs.access(BLOG_DIR);
  } catch {
    return [];
  }

  await ensureDirectory(BLOG_DIR);
  const files = await fs.readdir(BLOG_DIR);
  const mdxFiles = files.filter((file) => file.endsWith('.mdx'));

  const posts = await Promise.all(
    mdxFiles.map(async (filePath) => {
      const fullPath = path.join(BLOG_DIR, filePath);
      const rawContent = await fs.readFile(fullPath, 'utf-8');
      const { data } = matter(rawContent);
      const slug = path.basename(fullPath, path.extname(fullPath));
      const isPortrait = await isPortraitImage(data.thumbnail);

      const base: Blog = {
        slug,
        title: data.title || '无标题',
        description: data.description || '',
        thumbnail: data.thumbnail || undefined,
        isPortrait,
        lastUpdated: data.lastUpdated || '',
        tags: data.tags || [],
        rawContent,
      };

      if (isAdmin) {
        const stats = await fs.stat(fullPath);
        return {
          ...base,
          fileName: filePath,
          size: stats.size,
        };
      }

      return base;
    })
  );

  return posts;
}
