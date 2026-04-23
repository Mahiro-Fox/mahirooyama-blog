'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';

import {
  resolveImageSrc,
  shouldUnoptimizeImage,
} from '@/lib/client-image-utils';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  sizes?: string;
  aspectRatio?: number;
  blurDataURL?: string;
  unoptimized?: boolean;
}

/**
 * 优化的图片组件
 * - 支持懒加载（非首屏图片）
 * - 渐进加载动画
 * - 模糊占位符
 * - 错误回退
 */
export function OptimizedImage({
  src,
  alt,
  fill = false,
  width,
  height,
  className,
  containerClassName,
  priority = false,
  sizes = '100vw',
  aspectRatio,
  blurDataURL,
  unoptimized,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  // 错误回退
  if (hasError || !src) {
    return (
      <div
        className={cn(
          'bg-muted/50 flex items-center justify-center',
          fill && 'h-full w-full',
          containerClassName
        )}
        style={
          !fill && aspectRatio
            ? { aspectRatio }
            : !fill
              ? { width, height }
              : undefined
        }
      >
        <span className="text-muted-foreground/30 text-4xl">🖼️</span>
      </div>
    );
  }

  const imageProps = fill ? { fill, sizes } : { width, height, sizes };

  // 本地图片通过 API 路由获取，解决生产环境无法访问运行时上传文件的问题
  const resolvedSrc = resolveImageSrc(src);

  // 外部图片或通过 API 路由获取的图片都不需要 Next.js 优化
  const shouldUnoptimize = unoptimized ?? shouldUnoptimizeImage(src);

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        fill && 'h-full w-full',
        containerClassName
      )}
      style={
        aspectRatio ? { aspectRatio } : !fill ? { width, height } : undefined
      }
    >
      {/* 模糊占位符 */}
      {blurDataURL && !isLoaded && (
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center blur-md transition-opacity duration-500"
          style={{ backgroundImage: `url(${blurDataURL})` }}
        />
      )}

      <Image
        src={resolvedSrc}
        alt={alt}
        {...imageProps}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        className={cn(
          'object-contain transition-opacity duration-300',
          !isLoaded && !blurDataURL && 'opacity-0',
          isLoaded && 'opacity-100',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        unoptimized={shouldUnoptimize}
      />
    </div>
  );
}

/**
 * 图片尺寸配置
 * 用于不同布局场景
 */
export const imageSizes = {
  // 画廊网格: 1列(移动) / 2列(平板) / 3列(桌面)
  galleryGrid: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',

  // 博客网格
  blogGrid: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',

  // 轮播/首屏大图
  hero: '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw',

  // 详情页主图
  detail: '(max-width: 896px) 100vw, 896px',

  // 小缩略图 (compact 布局)
  thumbnail: '(max-width: 768px) 20vw, 15vw',

  // 侧边栏/小部件
  sidebar: '(max-width: 768px) 30vw, 20vw',
} as const;
