'use server';

import { cache } from 'react';

import { GalleryImageItem, getPublicGalleryImages } from '@/lib/public-gallery';

export const getHomeBannerImages = cache(
  async (): Promise<GalleryImageItem[] | null> => {
    const galleryImages = await getPublicGalleryImages();

    if (!galleryImages.length) {
      return null;
    }
    const landscapeImages = galleryImages.filter((image) => image.ratio > 1.5);
    return landscapeImages;
  }
);
