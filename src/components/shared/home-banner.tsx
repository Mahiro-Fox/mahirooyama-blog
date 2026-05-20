'use client';

import React from 'react';

import { siteConfig } from '@/config/config';
import { GalleryImageItem } from '@/lib/public-gallery';
import { TextAnimate } from '@/components/shadcn-ui/text-animate';
import { FadeCarousel } from '@/components/shared/fade-carousel';
import {
  imageSizes,
  OptimizedImage,
} from '@/components/shared/optimized-image';

interface HomeBannerImage {
  images: GalleryImageItem[];
}

export const HomeBanner: React.FC<HomeBannerImage> = ({ images }) => {
  return (
    <section className="relative h-[calc(100vh-48px)] w-full md:h-[calc(100vh-64px)]">
      <div className="relative h-full w-full">
        <FadeCarousel
          className="h-full w-full max-w-none rounded-none"
          arrow={false}
          indicator={false}
          autoPlayInterval={10000}
          images={images.map((image) => image.src)}
          itemRender={(image, index) => (
            <OptimizedImage
              key={index}
              src={image}
              alt={siteConfig.name}
              fill
              priority
              sizes={imageSizes.hero}
            />
          )}
        />
        {/* <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-5" /> */}
        <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
          <div className="text-center">
            <TextAnimate
              once
              className="text-4xl font-bold text-white md:text-5xl"
              animation="blurInUp"
              as="h2"
              by="character"
              duration={1}
            >
              有朝一日一定要去追一次极光
            </TextAnimate>
          </div>
        </div>
      </div>
    </section>
  );
};
