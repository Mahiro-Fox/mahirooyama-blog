'use client';

import { ImageOff, Loader2 } from 'lucide-react';
import { getObfuscatorPhotosAction } from '@/actions/app/photos';
import Masonry from '@/components/content/masonry';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn-ui/dialog';
import { OptimizedImage } from '@/components/shared/optimized-image';
import { usePhotos } from '@/hooks/use-photos';
import { useT } from '@/i18n/dictionary-provider';

interface GalleryPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 选中某张图片时回传其 URL */
  onPick: (src: string) => void;
}

/**
 * 混淆图库弹窗：瀑布流展示 uploads/images/obfuscator 中的图片，
 * 滚动到底部时自动加载下一页。
 */
export default function GalleryPickerDialog({
  open,
  onOpenChange,
  onPick,
}: GalleryPickerDialogProps) {
  // Dialog 关闭时不渲染子树，避免每次都请求图库数据
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <GalleryPickerBody onPick={onPick} onOpenChange={onOpenChange} />
    </Dialog>
  );
}

function GalleryPickerBody({
  onPick,
  onOpenChange,
}: {
  onPick: (src: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const { images, isLoading, isLoadingMore, error, hasMore, loadMoreRef } =
    usePhotos({ limit: 12, fetcher: getObfuscatorPhotosAction });

  return (
    <DialogContent className="relative flex max-h-[85vh] w-full flex-col gap-4 sm:max-w-5xl">
      <DialogClose
        className="cursor-pointer"
        aria-label={t('image-obfuscator.gallery_close')}
        onClick={() => onOpenChange(false)}
      />

      <DialogHeader className="pr-8">
        <DialogTitle>{t('image-obfuscator.gallery_title')}</DialogTitle>
        <DialogDescription>
          {t('image-obfuscator.gallery_desc')}
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <p className="text-muted-foreground text-sm">
              {t('common.load_failed')}: {error}
            </p>
          </div>
        ) : images.length === 0 ? (
          <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3">
            <ImageOff className="text-muted-foreground/40 h-10 w-10" />
            <p className="text-muted-foreground text-sm">
              {t('image-obfuscator.gallery_empty')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <Masonry
              items={images}
              columns={4}
              gutter={12}
              minColumns={2}
              minItemWidth={160}
              itemRender={({ data }) => (
                <button
                  type="button"
                  onClick={() => onPick(data.src)}
                  className="border-border bg-muted group block w-full overflow-hidden rounded-lg border transition-all hover:border-[var(--primary)]/60 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:outline-none"
                >
                  <OptimizedImage
                    src={data.src}
                    alt={data.alt}
                    width={data.width}
                    height={data.height}
                    aspectRatio={data.ratio}
                    sizes="(max-width: 640px) 50vw, 20vw"
                    containerClassName="w-full"
                    className="transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </button>
              )}
            />

            <div ref={loadMoreRef} className="flex justify-center py-2">
              {isLoadingMore && (
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              )}
              {!hasMore && (
                <p className="text-muted-foreground text-sm">
                  {t('image-obfuscator.gallery_all_loaded')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </DialogContent>
  );
}
