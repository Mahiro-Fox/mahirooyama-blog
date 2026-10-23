'use server';

import path from 'path';
import { cache } from 'react';
import { OBUSCATOR_PHOTO_DIR, R18_PHOTO_DIR } from '@/constant/dir';
import {
  getPhotoCollections,
  getPhotos,
  PhotoCollection,
  PhotoItem,
} from '@/lib/photos';
import { verifyUserAuth } from '@/lib/user-auth';

export interface PhotosResponse {
  images: PhotoItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export async function getPhotosAction(
  page: number = 1,
  limit: number = 12,
  dir?: string,
  extensions?: string[]
): Promise<PhotosResponse> {
  if (page < 1 || limit < 1 || limit > 50) {
    throw new Error('Invalid pagination parameters');
  }

  // 按时间排序
  const allImages = await getPhotos(dir, extensions);
  const sortedImages = allImages.sort((a, b) =>
    b.lastUpdatedAt.localeCompare(a.lastUpdatedAt)
  );

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedImages = sortedImages.slice(startIndex, endIndex);

  return {
    images: paginatedImages,
    pagination: {
      page,
      limit,
      total: allImages.length,
      totalPages: Math.ceil(allImages.length / limit),
      hasMore: endIndex < allImages.length,
    },
  };
}

/** 混淆图库支持的格式：混淆输出可能是 PNG 或 JPG */
const OBUSCATOR_PHOTO_EXTENSIONS = ['.png', '.jpg'];

/** 作者标识必须是单层目录名，防止通过 ../ 等方式读到图库目录之外 */
function isSafeCollectionName(name: string): boolean {
  if (!name || name === '.' || name === '..') return false;
  if (name.includes('/') || name.includes('\\')) return false;
  return path.basename(name) === name;
}

/** 把作者标识拼成图库下的子目录，同时完成安全校验 */
function resolveCollectionDir(rootDir: string, collection: string): string {
  if (!isSafeCollectionName(collection)) {
    throw new Error('Invalid collection');
  }
  return path.join(rootDir, collection);
}

/** 读取混淆图库的一级分类（按作者分组）摘要 */
export async function getObfuscatorCollectionsAction(): Promise<
  PhotoCollection[]
> {
  return getPhotoCollections(OBUSCATOR_PHOTO_DIR, OBUSCATOR_PHOTO_EXTENSIONS);
}

/** 读取混淆图库中某个作者名下的图片，保持分页 */
export async function getObfuscatorCollectionPhotosAction(
  collection: string,
  page: number = 1,
  limit: number = 12
): Promise<PhotosResponse> {
  return getPhotosAction(
    page,
    limit,
    resolveCollectionDir(OBUSCATOR_PHOTO_DIR, collection),
    OBUSCATOR_PHOTO_EXTENSIONS
  );
}

/** R18 图库支持的格式：pixiv 下载常见为 jpg / png，兼容 webp */
const R18_PHOTO_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

/** R18 图库仅登录后可读，防止未登录直接调用 server action */
async function requireR18Access(): Promise<void> {
  const session = await verifyUserAuth();
  if (!session.success) {
    throw new Error('Not logged in');
  }
}

/** 读取 R18 图库的一级分类（按作者分组）摘要 */
export async function getR18CollectionsAction(): Promise<PhotoCollection[]> {
  await requireR18Access();
  return getPhotoCollections(R18_PHOTO_DIR, R18_PHOTO_EXTENSIONS);
}

/** 读取 R18 图库中某个作者名下的图片，保持分页 */
export async function getR18CollectionPhotosAction(
  collection: string,
  page: number = 1,
  limit: number = 12
): Promise<PhotosResponse> {
  await requireR18Access();
  return getPhotosAction(
    page,
    limit,
    resolveCollectionDir(R18_PHOTO_DIR, collection),
    R18_PHOTO_EXTENSIONS
  );
}

export const getAllPhotos = cache(
  async ({
    ratio = 'landscape',
  }: {
    ratio?: 'landscape' | 'portrait';
  }): Promise<PhotoItem[] | null> => {
    const photos = await getPhotos();

    if (!photos.length) {
      return null;
    }
    const landscapeImages = photos.filter((photo) => photo.ratio > 1);
    const portraitImages = photos.filter((photo) => photo.ratio <= 1);
    return ratio === 'landscape' ? landscapeImages : portraitImages;
  }
);
