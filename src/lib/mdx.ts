import fs from 'fs';
import path from 'path';
import { isPortraitImage } from '@/utils/image-utils';
import matter from 'gray-matter';

import { paginateItems, PaginationResult } from '@/lib/pagination';

const blogDir = path.join(process.cwd(), 'src', 'content', 'blog');

export const DEFAULT_BLOG_LIST_LIMIT = 6;

/**
 * Frontmatter类型
 * @template T 扩展字段类型
 */
export type Frontmatter<T = {}> = {
  title: string;
  createdAt: string;
  description: string;
} & T;

/**
 * MDX数据类型
 * @template T 扩展字段类型
 */
export type MDXData<T = {}> = {
  metadata: Frontmatter<T>;
  slug: string;
  content?: React.ReactNode;
  rawContent: string;
  isPortrait?: boolean;
};

/**
 * 博客文章类型
 * @template T 扩展字段类型
 */
export type BlogPost = MDXData<{
  thumbnail?: string;
  tags?: string[];
}>;

/**
 * 获取所有博客文章
 * @returns 博客文章数组
 */
export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const posts = await getMDXData(blogDir);
  return posts.sort(
    (a, b) =>
      new Date(b.metadata.createdAt).getTime() -
      new Date(a.metadata.createdAt).getTime()
  );
}
/**
 * 获取博客文章列表
 * @param page 页码
 * @param pageSize 每页数量
 * @returns 分页结果
 */
export async function getBlogPosts(
  page = 1,
  pageSize = DEFAULT_BLOG_LIST_LIMIT
): Promise<PaginationResult<BlogPost>> {
  const posts = await getAllBlogPosts();
  return paginateItems(posts, page, pageSize);
}

/**
 * 根据标签slug获取博客文章列表
 * @param tagSlug 标签slug
 * @returns 博客文章列表
 */
export async function getBlogPostsByTagSlug(
  tagSlug: string
): Promise<BlogPost[]> {
  const posts = await getAllBlogPosts();
  return posts.filter((post) => post.metadata.tags?.includes(tagSlug));
}

/**
 * 根据slug获取博客文章
 * @param slug 博客文章slug
 * @returns 博客文章
 */
export async function getBlogPostBySlug(slug: string) {
  return getBlogPost((post) => post.slug === slug);
}

/**
 * 根据条件获取博客文章
 * @param predicate 条件函数
 * @returns 博客文章
 */
async function getBlogPost(
  predicate: (post: BlogPost) => boolean
): Promise<BlogPost | undefined> {
  const posts = await getAllBlogPosts();
  return posts.find(predicate);
}

/**
 * 获取MDX文件数据
 * @param dir 目录路径
 * @returns MDX文件数据数组
 */
async function getMDXData<T>(dir: string): Promise<MDXData<T>[]> {
  const files = await getMDXFiles(dir);
  return Promise.all(files.map((file) => readMDXFile<T>(path.join(dir, file))));
}

/**
 * 获取MDX文件
 * @param dir 目录路径
 * @returns MDX文件数组
 */
async function getMDXFiles(dir: string): Promise<string[]> {
  return (await fs.promises.readdir(dir)).filter(
    (file) => path.extname(file) === '.mdx'
  );
}

/**
 * 读取MDX文件
 * @param filePath 文件路径
 * @returns MDX数据
 */
async function readMDXFile<T>(filePath: string): Promise<MDXData<T>> {
  const rawContent = await fs.promises.readFile(filePath, 'utf-8');

  const { data, content } = matter(rawContent);

  const isPortrait = await isPortraitImage(data.thumbnail);

  return {
    metadata: data as Frontmatter<T>,
    slug: path.basename(filePath, path.extname(filePath)),
    rawContent: content,
    isPortrait,
  };
}
