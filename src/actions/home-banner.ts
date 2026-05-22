'use server';

import { cache } from 'react';

import { getPhotos, PhotoItem } from '@/lib/photos';

export const getHomeBannerImages = cache(
  async (): Promise<PhotoItem[] | null> => {
    const photos = await getPhotos();

    if (!photos.length) {
      return null;
    }
    const landscapeImages = photos.filter((photo) => photo.ratio > 1.5);
    return landscapeImages;
  }
);
