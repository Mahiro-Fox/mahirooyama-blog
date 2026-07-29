'use client';

import { Loader2 } from 'lucide-react';

import { usePhotos } from '@/hooks/use-photos';
import { BlurFade } from '@/components/shadcn-ui/blur-fade';
import Masonry from '@/components/content/masonry';
import { OptimizedImage } from '@/components/shared/optimized-image';

export function PhotosGallery() {
  const { images, isLoading, isLoadingMore, error, hasMore, loadMoreRef } =
    usePhotos({ limit: 8 });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">加载失败: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm"
        >
          重试
        </button>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">暂无图片</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Masonry
        items={images}
        columns={4}
        gutter={16}
        minColumns={1}
        minItemWidth={250}
        itemRender={({ data }) => (
          <BlurFade key={data.src} className="overflow-hidden rounded-md">
            <OptimizedImage
              previewable
              src={data.src}
              alt={data.alt}
              width={data.width}
              height={data.height}
              aspectRatio={data.ratio}
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </BlurFade>
        )}
      />

      {/* 加载更多触发器 */}
      <div ref={loadMoreRef} className="flex justify-center py-4">
        {isLoadingMore && (
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        )}
        {!hasMore && images.length > 0 && (
          <p className="text-muted-foreground text-sm">已加载全部图片</p>
        )}
      </div>
    </div>
  );
}
