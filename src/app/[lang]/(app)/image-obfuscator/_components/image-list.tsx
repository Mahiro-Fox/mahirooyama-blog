'use client';

import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/shadcn-ui/button';
import { useT } from '@/i18n/dictionary-provider';
import { formatSize } from '@/utils/utils';
import type { ImageItem } from '../_lib/types';

interface ImageListProps {
  items: ImageItem[];
  activeId: string | null;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
}

/**
 * 批量图片列表：展示每张图的处理状态与进度，点击切换预览。
 */
export default function ImageList({
  items,
  activeId,
  disabled = false,
  onSelect,
  onRemove,
  onDownload,
}: ImageListProps) {
  const t = useT();

  const truncateName = (name: string): string =>
    name.length > 10
      ? name.slice(0, 10) + '<br>' + truncateName(name.slice(10))
      : name;

  if (items.length === 0) return null;

  return (
    <div className="border-border bg-card max-h-96 overflow-auto rounded-xl border">
      <div className="border-border flex items-center justify-between border-b px-4 py-2.5">
        <span className="text-sm font-medium">
          {t('image-obfuscator.list_title', { count: items.length })}
        </span>
      </div>

      <ul className="divide-border divide-y">
        {items.map((item) => {
          const active = item.id === activeId;

          return (
            <li
              key={item.id}
              className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                active ? 'bg-primary/5' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.name}
                  className={`border-border bg-muted h-12 w-12 shrink-0 rounded-lg border object-cover ${
                    active ? 'ring-2 ring-[var(--primary)]' : ''
                  }`}
                />

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p
                      className="text-foreground truncate text-sm font-medium"
                      dangerouslySetInnerHTML={{
                        __html:
                          window.innerWidth < 764
                            ? truncateName(item.name)
                            : item.name,
                      }}
                    />
                    {item.meta ? (
                      <span className="bg-primary/10 text-primary shrink-0 rounded px-1.5 py-0.5 text-[10px]">
                        {t('image-obfuscator.item_meta_badge')}
                      </span>
                    ) : null}
                  </div>

                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <span>
                      {item.width}×{item.height} · {formatSize(item.size)}
                    </span>
                    {item.status === 'done' && item.result ? (
                      <span className="text-[var(--primary)]">
                        {item.result.mode === 'obfuscate'
                          ? t('image-obfuscator.mode_obfuscate')
                          : t('image-obfuscator.mode_deobfuscate')}
                        {' · '}
                        {item.result.format.toUpperCase()}
                        {' · '}
                        {formatSize(item.result.blob.size)}
                      </span>
                    ) : null}
                  </div>

                  {item.status === 'running' ? (
                    <div className="flex items-center gap-2">
                      <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-150"
                          style={{
                            width: `${Math.min(100, Math.max(0, item.progress * 100))}%`,
                          }}
                        />
                      </div>
                      <span className="text-muted-foreground w-9 shrink-0 text-right font-mono text-[10px]">
                        {Math.round(item.progress * 100)}%
                      </span>
                    </div>
                  ) : item.status === 'error' ? (
                    <p className="text-destructive line-clamp-1 text-xs">
                      {item.errorKey ? t(item.errorKey) : null}
                    </p>
                  ) : null}
                </div>
              </button>

              <span className="shrink-0">
                {item.status === 'pending' ? (
                  <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-[10px]">
                    {t('image-obfuscator.item_pending')}
                  </span>
                ) : item.status === 'running' ? (
                  <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                ) : item.status === 'done' ? (
                  <CheckCircle2 className="h-4 w-4 text-[var(--primary)]" />
                ) : (
                  <AlertCircle className="text-destructive h-4 w-4" />
                )}
              </span>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('image-obfuscator.download')}
                  disabled={!item.result}
                  onClick={() => onDownload(item.id)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('image-obfuscator.remove')}
                  disabled={disabled}
                  onClick={() => onRemove(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
