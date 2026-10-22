'use server';

import { cache } from 'react';
import { OBUSCATOR_PHOTO_DIR } from '@/constant/dir';
import { getPhotos, PhotoItem } from '@/lib/photos';

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
const OBUSCATOR_PHOTO_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

/** 读取混淆图库（uploads/images/obfuscator）中的图片 */
export async function getObfuscatorPhotosAction(
  page: number = 1,
  limit: number = 12
): Promise<PhotosResponse> {
  return getPhotosAction(
    page,
    limit,
    OBUSCATOR_PHOTO_DIR,
    OBUSCATOR_PHOTO_EXTENSIONS
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
