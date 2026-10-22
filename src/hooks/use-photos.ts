'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getPhotosAction, type PhotosResponse } from '@/actions/app/photos';
import type { PhotoItem } from '@/lib/photos';

/** 分页加载图片的函数，默认读取相册目录 */
type PhotosFetcher = (page: number, limit: number) => Promise<PhotosResponse>;

interface UsePhotosOptions {
  initialPage?: number;
  limit?: number;
  /** 自定义数据源，用于读取其他图片目录 */
  fetcher?: PhotosFetcher;
}

export function usePhotos(options: UsePhotosOptions = {}) {
  const { initialPage = 1, limit = 12, fetcher } = options;

  const [images, setImages] = useState<PhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(initialPage);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadPhotos = fetcher ?? getPhotosAction;

  const fetchPhotos = useCallback(
    async (targetPage: number, isLoadMore = false) => {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const data = await loadPhotos(targetPage, limit);

        if (isLoadMore) {
          setImages((prev) => [...prev, ...data.images]);
        } else {
          setImages(data.images);
        }

        setHasMore(data.pagination.hasMore);
        setPage(targetPage);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [limit, loadPhotos]
  );

  // Initial load
  useEffect(() => {
    fetchPhotos(initialPage, false);
  }, [fetchPhotos, initialPage]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          fetchPhotos(page + 1, true);
        }
      },
      {
        rootMargin: '200px',
        threshold: 0.1,
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [fetchPhotos, hasMore, isLoadingMore, isLoading, page]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore && !isLoading) {
      fetchPhotos(page + 1, true);
    }
  }, [fetchPhotos, hasMore, isLoadingMore, isLoading, page]);

  return {
    images,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    loadMoreRef,
  };
}
