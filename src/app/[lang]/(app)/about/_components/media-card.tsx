'use client';

import { m } from 'framer-motion';
import { OptimizedImage } from '@/components/shared/optimized-image';
import { MediaContent } from '@/config/about';
import { useT } from '@/i18n/dictionary-provider';

interface MediaCardProps {
  content: MediaContent;
}

export function MediaCard({ content }: MediaCardProps) {
  const t = useT();
  return (
    <m.div
      className="relative flex h-full w-full overflow-hidden rounded-2xl shadow-lg"
      whileHover={{ scale: 1.02 }}
    >
      <OptimizedImage
        src={content.image}
        alt={t(content.title)}
        fill
        className="object-cover transition-transform duration-500 hover:scale-105"
        unoptimized={true}
        priority={false}
      />

      {/* Overlay with gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Content overlay */}
      <div className="absolute right-0 bottom-0 left-0 p-4">
        <div className="rounded-lg p-3">
          <div className="mb-1 text-xs font-semibold tracking-wider text-white/80 uppercase">
            {t(content.category)}
          </div>
          <div className="text-lg font-bold text-white">{t(content.title)}</div>
          {content.description && (
            <p className="mt-1 line-clamp-2 text-sm text-white/80">
              {t(content.description)}
            </p>
          )}
        </div>
      </div>
    </m.div>
  );
}
