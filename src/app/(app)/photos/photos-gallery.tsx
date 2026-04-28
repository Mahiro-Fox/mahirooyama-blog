'use client';

import Masonry from '@/components/content/masonry';
import GalleryImage from '@/components/shared/gallert-image';
import { GalleryImageItem } from '@/lib/public-gallery';

interface PhotosGalleryProps {
  images: GalleryImageItem[];
}

export function PhotosGallery({ images }: PhotosGalleryProps) {
  return (
    <Masonry
      items={images}
      columns={4}
      gutter={16}
      minColumns={1}
      minItemWidth={250}
      itemRender={({ data }) => <GalleryImage data={data} />}
    />
  );
}
