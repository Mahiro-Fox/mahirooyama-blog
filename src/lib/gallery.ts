import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

import { paginateItems, PaginationResult } from '@/lib/pagination';

const galleryDir = path.join(process.cwd(), 'src', 'content', 'gallery');

export const DEFAULT_GALLERY_LIMIT = 6;

export type GalleryImage<T = {}> = {
  title: string;
  description: string;
  src: string;
  createdAt?: string;
  tags?: string[];
} & T;

export type GalleryImageData<T = {}> = {
  metadata: GalleryImage<T>;
  slug: string;
};

export async function getAllGalleryImages<T = {}>(): Promise<
  GalleryImageData<T>[]
> {
  try {
    await fs.promises.access(galleryDir);
  } catch {
    return [];
  }

  const files = await getGalleryFiles();
  const images = await Promise.all(
    files.map((file) => readGalleryFile<T>(path.join(galleryDir, file)))
  );

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
  pageSize = DEFAULT_GALLERY_LIMIT
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
  return (await fs.promises.readdir(galleryDir)).filter(
    (file) => path.extname(file) === '.yml' || path.extname(file) === '.yaml'
  );
}

async function readGalleryFile<T>(
  filePath: string
): Promise<GalleryImageData<T>> {
  const rawContent = await fs.promises.readFile(filePath, 'utf-8');
  const { data } = matter(rawContent);

  return {
    metadata: data as GalleryImage<T>,
    slug: path.basename(filePath, path.extname(filePath)),
  };
}
