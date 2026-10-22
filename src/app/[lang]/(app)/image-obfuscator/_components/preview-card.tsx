'use client';

import { ImageIcon } from 'lucide-react';
import { OptimizedImage } from '@/components/shared/optimized-image';
import { Spinner } from '@/components/shared/spinner';
import { useT } from '@/i18n/dictionary-provider';

interface PreviewCardProps {
  title: string;
  src: string | null;
  emptyText: string;
  meta?: string;
  busy?: boolean;
  badge?: string;
  ref?: React.Ref<HTMLDivElement>;
}

/**
 * 单张图片预览卡片（原图 / 结果）。
 */
export default function PreviewCard({
  title,
  src,
  emptyText,
  meta,
  busy = false,
  badge,
  ref,
}: PreviewCardProps) {
  const t = useT();

  return (
    <div
      className="border-border bg-card scroll-m-16 overflow-hidden rounded-xl border"
      ref={ref}
    >
      <div className="border-border flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-[var(--primary)]" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        {badge ? (
          <span className="text-muted-foreground bg-muted rounded-md px-2 py-0.5 text-xs">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="bg-muted/40 flex aspect-[4/3] items-center justify-center p-3">
        {src ? (
          <OptimizedImage
            src={src}
            alt={title}
            fill
            previewable
            className="max-h-full max-w-full rounded-md object-contain"
          />
        ) : (
          <div className="text-muted-foreground flex flex-col items-center gap-2 text-sm">
            {busy ? <Spinner /> : <ImageIcon className="h-8 w-8 opacity-40" />}
            <span>{busy ? t('image-obfuscator.processing') : emptyText}</span>
          </div>
        )}
      </div>

      {meta ? (
        <p className="text-muted-foreground border-border truncate border-t px-4 py-2 text-xs">
          {meta}
        </p>
      ) : null}
    </div>
  );
}
