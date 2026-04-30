import fs from 'fs';
import path from 'path';
import { GALLERY_DIR } from '@/constant/dir';
import { DEFAULT_GALLERY_LIST_LIMIT } from '@/constant/limit';
import { isPortraitImage } from '@/utils/image-utils';
import matter from 'gray-matter';

import { paginateItems, PaginationResult } from '@/lib/pagination';

export type GalleryImage<T = {}> = {
  title: string;
  description: string;
  thumbnail: string;
  createdAt: string;
  tags?: string[];
} & T;

export type GalleryImageData<T = {}> = {
  metadata: GalleryImage<T>;
  slug: string;
  isPortrait: boolean;
};

export async function getAllGalleryImages<T = {}>({
  sortBy = 'date',
}: { sortBy?: 'date' | 'slug' } = {}): Promise<GalleryImageData<T>[]> {
  try {
    await fs.promises.access(GALLERY_DIR);
  } catch {
    return [];
  }

  const files = await getGalleryFiles();
  const images = await Promise.all(
    files.map((file) => readGalleryFile<T>(path.join(GALLERY_DIR, file)))
  );

  if (sortBy === 'date') {
    return images.sort((a, b) =>
      b.metadata.createdAt.localeCompare(a.metadata.createdAt)
    );
  }
  return images.sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function getGalleryPostsByTagSlug(
  tagSlug: string
): Promise<GalleryImageData<{}>[] | undefined> {
  const images = await getAllGalleryImages<{}>();
  return images.filter((image) => image.metadata.tags?.includes(tagSlug));
}

export async function getGalleryImages<T = {}>(
  page = 1,
  pageSize = DEFAULT_GALLERY_LIST_LIMIT
): Promise<PaginationResult<GalleryImageData<T>>> {
  const images = await getAllGalleryImages<T>();
  return paginateItems(images, page, pageSize);
}

export async function getGalleryImageBySlug<T = {}>(
  slug: string
): Promise<GalleryImageData<T> | undefined> {
  const images = await getAllGalleryImages<T>();
  return images.find((image) => image.slug === slug);
}

async function getGalleryFiles(): Promise<string[]> {
  return (await fs.promises.readdir(GALLERY_DIR)).filter(
    (file) => path.extname(file) === '.yml' || path.extname(file) === '.yaml'
  );
}

async function readGalleryFile<T>(
  filePath: string
): Promise<GalleryImageData<T>> {
  const rawContent = await fs.promises.readFile(filePath, 'utf-8');
  const { data } = matter(rawContent);

  // 判断是否为竖屏图片
  const isPortrait = await isPortraitImage(data.thumbnail);

  return {
    metadata: data as GalleryImage<T>,
    slug: path.basename(filePath, path.extname(filePath)),
    isPortrait,
  };
}
