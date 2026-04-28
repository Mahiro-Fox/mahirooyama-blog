'use client';

import { GalleryImageItem } from '@/lib/public-gallery';
import Masonry from '@/components/content/masonry';
import { OptimizedImage } from '@/components/shared/optimized-image';

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
      itemRender={({ data }) => (
        <div key={data.src} className="overflow-hidden rounded-md">
          <OptimizedImage
            previewable
            src={data.src}
            alt={data.alt}
            width={data.width}
            height={data.height}
            aspectRatio={data.ratio}
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </div>
      )}
    />
  );
}
