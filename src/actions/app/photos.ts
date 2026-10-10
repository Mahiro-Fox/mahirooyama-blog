'use server';

import { cache } from 'react';
import { getPhotos, PhotoItem } from '@/lib/photos';

interface PhotosResponse {
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
  limit: number = 12
): Promise<PhotosResponse> {
  if (page < 1 || limit < 1 || limit > 50) {
    throw new Error('Invalid pagination parameters');
  }

  // 按时间排序
  const allImages = await getPhotos();
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
    const landscapeImages = photos.filter((photo) => photo.ratio > 1.5);
    const portraitImages = photos.filter((photo) => photo.ratio <= 1.5);
    return ratio === 'landscape' ? landscapeImages : portraitImages;
  }
);
