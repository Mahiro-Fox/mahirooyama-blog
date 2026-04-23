'use client';

import { useState } from 'react';
import Image from 'next/image';

import { isExternalImage, resolveImageSrc } from '@/lib/client-image-utils';
import { cn } from '@/lib/utils';

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  className?: string;
}

export function ImageWithFallback({
  src,
  alt,
  className,
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className="bg-muted/30 flex h-full w-full items-center justify-center">
        <span className="text-muted-foreground/20 text-4xl">🔗</span>
      </div>
    );
  }

  // 本地图片通过 API 路由获取，解决生产环境无法访问运行时上传文件的问题
  const resolvedSrc = resolveImageSrc(src);

  return (
    <Image
      src={resolvedSrc || '/placeholder.svg'}
      alt={alt}
      className={cn('object-cover', className)}
      fill
      sizes="148px"
      onError={() => setError(true)}
      unoptimized={isExternalImage(src)}
    />
  );
}
