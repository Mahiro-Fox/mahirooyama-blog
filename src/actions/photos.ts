'use server';

import { GalleryImageItem, getPublicGalleryImages } from '@/lib/public-gallery';

interface PhotosResponse {
  images: GalleryImageItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export async function getPhotos(
  page: number = 1,
  limit: number = 12
): Promise<PhotosResponse> {
  if (page < 1 || limit < 1 || limit > 50) {
    throw new Error('Invalid pagination parameters');
  }

  const allImages = await getPublicGalleryImages();

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedImages = allImages.slice(startIndex, endIndex);

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
