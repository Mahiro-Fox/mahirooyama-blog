import fs from 'fs';
import path from 'path';
import { DEFAULT_GALLERY_LIST_LIMIT } from '@/config';
import { isPortraitImage } from '@/utils/image-utils';

import { paginateItems, PaginationResult } from '@/lib/pagination';
import { GALLERY_DIR } from '@/constant';

export type GalleryImage<T = {}> = {
  title: string;
  description: string;
  thumbnail: string;
  lastUpdated: string;
  tags?: string[];
} & T;

export type GalleryImageData<T = {}> = {
  metadata: GalleryImage<T>;
  slug: string;
  isPortrait: boolean;
};

export async function getAllGalleryImages<T = {}>(): Promise<
  GalleryImageData<T>[]
> {
  try {
    await fs.promises.access(GALLERY_DIR);
  } catch {
    return [];
  }

  const files = await getGalleryFiles();
  const images = await Promise.all(
    files.map((file) => readGalleryFile<T>(path.join(GALLERY_DIR, file)))
  );

  return images.sort(
    (a, b) =>
      new Date(b.metadata.lastUpdated).getTime() -
      new Date(a.metadata.lastUpdated).getTime()
  );
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
    (file) => path.extname(file) === '.json'
  );
}

async function readGalleryFile<T>(
  filePath: string
): Promise<GalleryImageData<T>> {
  const rawContent = await fs.promises.readFile(filePath, 'utf-8');
  const data = JSON.parse(rawContent);

  // 判断是否为竖屏图片
  const isPortrait = await isPortraitImage(data.thumbnail);

  return {
    metadata: data as GalleryImage<T>,
    slug: path.basename(filePath, path.extname(filePath)),
    isPortrait,
  };
}
