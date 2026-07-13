'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/utils/utils';
import { RefreshCw } from 'lucide-react';

import { useImagePreview } from '../../context/image-preview-provider';

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
  hoverScale?: boolean;
  aspectRatio?: number;
  blurDataURL?: string;
  unoptimized?: boolean;
  /** 是否启用点击预览功能 */
  previewable?: boolean;
  /** 是否是竖屏图片 */
  isPortrait?: boolean;
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
  hoverScale = false,
  aspectRatio,
  blurDataURL,
  unoptimized = true,
  previewable = false,
  isPortrait = false,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const { openPreview } = useImagePreview();

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsRetrying(false);
  }, []);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsRetrying(true);
    setIsLoaded(false);
  }, []);

  const handleClick = useCallback(() => {
    if (previewable && src) {
      openPreview({ src, alt, width, height });
    }
  }, [src, previewable, alt, width, height, openPreview]);

  const imageProps = fill ? { fill, sizes } : { width, height, sizes };

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
        <p className="text-muted-foreground/30 flex items-center">
          <span>failed to load image.</span>
          {src && (
            <button
              onClick={handleRetry}
              className={cn(
                'text-muted-foreground/50 hover:text-muted-foreground transition-colors',
                'hover:bg-muted/80 rounded-full p-2',
                'focus:ring-primary/20 focus:ring-2 focus:outline-none'
              )}
              title="重新加载图片"
            >
              <RefreshCw
                className={cn('h-4 w-4', isRetrying && 'animate-spin')}
              />
            </button>
          )}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        fill && 'h-full w-full',
        previewable && 'cursor-zoom-in',
        containerClassName
      )}
      style={
        aspectRatio ? { aspectRatio } : !fill ? { width, height } : undefined
      }
      onClick={handleClick}
    >
      {/* Loading Spinner - 图片加载中显示 */}
      {!isLoaded && (
        <div className="bg-muted/30 absolute inset-0 flex items-center justify-center">
          <div className="border-primary/30 border-t-primary h-8 w-8 animate-spin rounded-full border-2" />
        </div>
      )}

      {/* 模糊占位符 */}
      {blurDataURL && !isLoaded && (
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center blur-md transition-opacity duration-500"
          style={{ backgroundImage: `url(${blurDataURL})` }}
        />
      )}

      <Image
        key={isRetrying ? `retry-${Date.now()}` : src}
        src={src}
        alt={alt}
        {...imageProps}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        className={cn(
          'transition-all duration-300',
          isPortrait ? 'object-contain' : 'object-cover',
          hoverScale && 'hover:scale-105',
          !isLoaded && !blurDataURL && 'opacity-0',
          isLoaded && 'opacity-100',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        unoptimized={unoptimized}
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
