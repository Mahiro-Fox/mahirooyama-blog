"use client";

import { Check, ImageOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { getObfuscatorPhotosAction } from "@/actions/app/photos";
import Masonry from "@/components/content/masonry";
import { Button } from "@/components/shadcn-ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shadcn-ui/dialog";
import { OptimizedImage } from "@/components/shared/optimized-image";
import { usePhotos } from "@/hooks/use-photos";
import { useT } from "@/i18n/dictionary-provider";

interface GalleryPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 确认选择时回传选中的图片 URL 列表 */
  onPick: (sources: string[]) => void;
}

/**
 * 混淆图库弹窗：瀑布流展示 uploads/images/obfuscator 中的图片，
 * 滚动到底部时自动加载下一页，支持多选后一次加入列表。
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
  onPick: (sources: string[]) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const { images, isLoading, isLoadingMore, error, hasMore, loadMoreRef } =
    usePhotos({ limit: 12, fetcher: getObfuscatorPhotosAction });
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const toggle = (src: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(src)) next.delete(src);
      else next.add(src);
      return next;
    });
  };

  const selectAllLoaded = () => {
    setSelected(new Set(images.map((image) => image.src)));
  };

  return (
    <DialogContent className="relative flex max-h-[85vh] w-full flex-col gap-4 sm:max-w-5xl">
      <DialogClose
        className="cursor-pointer"
        aria-label={t("image-obfuscator.gallery_close")}
        onClick={() => onOpenChange(false)}
      />

      <DialogHeader className="pr-8">
        <DialogTitle>{t("image-obfuscator.gallery_title")}</DialogTitle>
        <DialogDescription>
          {t("image-obfuscator.gallery_desc")}
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
              {t("common.load_failed")}: {error}
            </p>
          </div>
        ) : images.length === 0 ? (
          <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3">
            <ImageOff className="text-muted-foreground/40 h-10 w-10" />
            <p className="text-muted-foreground text-sm">
              {t("image-obfuscator.gallery_empty")}
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
              itemRender={({ data }) => {
                const isSelected = selected.has(data.src);

                return (
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggle(data.src)}
                    className={`group relative block w-full overflow-hidden rounded-lg border transition-all hover:border-[var(--primary)]/60 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:outline-none ${
                      isSelected
                        ? "border-[var(--primary)] ring-2 ring-[var(--primary)]"
                        : "border-border bg-muted"
                    }`}
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
                    <span
                      className={`absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full ${
                        isSelected
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                          : "bg-black/40 text-white opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                  </button>
                );
              }}
            />

            <div ref={loadMoreRef} className="flex justify-center py-2">
              {isLoadingMore && (
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              )}
              {!hasMore && (
                <p className="text-muted-foreground text-sm">
                  {t("image-obfuscator.gallery_all_loaded")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-border flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          {t("image-obfuscator.gallery_selected", { count: selected.size })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={selectAllLoaded}
            disabled={images.length === 0}
          >
            {t("image-obfuscator.gallery_select_all")}
          </Button>
          <Button
            type="button"
            disabled={selected.size === 0}
            onClick={() => {
              const sources = Array.from(selected);
              setSelected(new Set());
              onPick(sources);
              onOpenChange(false);
            }}
          >
            {t("image-obfuscator.gallery_add")}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
