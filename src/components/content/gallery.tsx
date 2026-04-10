import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { GalleryImageData } from '@/lib/gallery';
import { BlurFade } from '@/components/shadcn-ui/blur-fade';

interface GalleryCardProps {
  item: {
    slug: string;
    metadata: {
      title: string;
      description?: string;
      src: string;
      tags?: string[];
    };
  };
  index?: number;
}

export function Gallery({ item, index = 0 }: GalleryCardProps) {
  return (
    <BlurFade delay={0.1 * index} inView inViewMargin="-50px">
      <Link
        href={`/gallery/${item.slug}`}
        className="group bg-card relative flex h-full flex-col gap-3 overflow-hidden rounded-lg border transition-shadow hover:shadow-md"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={item.metadata.src}
            alt={item.metadata.title}
            loading="eager"
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
        <div className="flex flex-col gap-1 p-4 pt-0">
          <h3 className="font-medium">{item.metadata.title}</h3>
          {item.metadata.description && (
            <p className="text-muted-foreground line-clamp-2 text-sm">
              {item.metadata.description}
            </p>
          )}
        </div>
      </Link>
    </BlurFade>
  );
}
