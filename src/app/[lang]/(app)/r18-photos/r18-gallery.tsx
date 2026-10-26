'use client';

import { useImagePreview } from '@/context/image-preview-provider';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  getR18CollectionPhotosAction,
  getR18CollectionsAction,
} from '@/actions/app/photos';
import Masonry from '@/components/content/masonry';
import { BlurFade } from '@/components/magicui/blur-fade';
import { OptimizedImage } from '@/components/shared/optimized-image';
import { usePhotos } from '@/hooks/use-photos';
import { useT } from '@/i18n/dictionary-provider';
import type { PhotoCollection } from '@/lib/photos';

/**
 * R18 图库：顶部横向排列作者，下方以瀑布流展示当前作者的作品。
 * 数据按作者分目录，切换作者时重新分页拉取。
 */
export function R18Gallery() {
  const t = useT();
  const [collections, setCollections] = useState<PhotoCollection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getR18CollectionsAction()
      .then((data) => {
        if (!active) return;
        setCollections(data);
        setActiveId((prev) => prev ?? data[0]?.id ?? null);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

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
        <p className="text-muted-foreground">
          {t('common.load_failed')}: {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">{t('r18-photos.authors_empty')}</p>
      </div>
    );
  }

  const active =
    collections.find((collection) => collection.id === activeId) ??
    collections[0];

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-medium">{t('r18-photos.authors')}</h2>
          <span className="text-muted-foreground text-xs">
            {t('r18-photos.author_total', { count: collections.length })}
          </span>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {collections.map((collection) => (
            <AuthorChip
              key={collection.id}
              collection={collection}
              active={collection.id === active.id}
              onSelect={() => setActiveId(collection.id)}
            />
          ))}
        </div>
      </section>

      <CollectionPhotos key={active.id} collection={active.id} />
    </div>
  );
}

function AuthorChip({
  collection,
  active,
  onSelect,
}: {
  collection: PhotoCollection;
  active: boolean;
  onSelect: () => void;
}) {
  const t = useT();

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full border py-1 pr-3 pl-1 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:outline-none ${
        active
          ? 'border-[var(--primary)] bg-[var(--primary)]/10'
          : 'border-border hover:bg-muted'
      }`}
    >
      <span className="bg-muted relative h-8 w-8 overflow-hidden rounded-full">
        {collection.cover ? (
          <OptimizedImage
            src={collection.cover}
            alt={collection.name}
            fill
            sizes="32px"
            containerClassName="absolute inset-0"
          />
        ) : null}
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="max-w-[10rem] truncate text-sm font-medium">
          {collection.name}
        </span>
        <span className="text-muted-foreground text-[11px]">
          {t('r18-photos.author_count', { count: collection.count })}
        </span>
      </span>
    </button>
  );
}

function CollectionPhotos({ collection }: { collection: string }) {
  const t = useT();
  const fetcher = useCallback(
    (page: number, limit: number) =>
      getR18CollectionPhotosAction(collection, page, limit),
    [collection]
  );
  const { images, isLoading, isLoadingMore, error, hasMore, loadMoreRef } =
    usePhotos({ limit: 12, fetcher });
  const { open } = useImagePreview();

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
        <p className="text-muted-foreground">
          {t('common.load_failed')}: {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">{t('r18-photos.no_images')}</p>
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
        itemRender={({ data, index }) => (
          <BlurFade key={data.src} className="overflow-hidden rounded-md">
            <OptimizedImage
              previewable
              src={data.src}
              alt={data.alt}
              width={data.width}
              height={data.height}
              aspectRatio={data.ratio}
              onPreview={() => open(images, index)}
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </BlurFade>
        )}
      />

      <div ref={loadMoreRef} className="flex justify-center py-4">
        {isLoadingMore && (
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        )}
        {!hasMore && images.length > 0 && (
          <p className="text-muted-foreground text-sm">
            {t('r18-photos.all_images_loaded')}
          </p>
        )}
      </div>
    </div>
  );
}
