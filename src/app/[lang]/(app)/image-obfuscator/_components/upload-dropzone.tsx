'use client';

import { Image as ImageIcon, RefreshCw, Trash2, Upload } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n/dictionary-provider';
import { formatSize } from '@/utils/utils';
import type { SourceImage } from '../_lib/types';

interface UploadDropzoneProps {
  source: SourceImage | null;
  disabled?: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
}

/**
 * 单图上传区：支持拖拽、点击与剪贴板粘贴。
 */
export default function UploadDropzone({
  source,
  disabled = false,
  onSelect,
  onRemove,
}: UploadDropzoneProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const openPicker = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleFiles = useCallback(
    (files: FileList | File[] | null) => {
      if (!files || disabled) return;
      const [file] = Array.from(files);
      if (file) onSelect(file);
    },
    [disabled, onSelect]
  );

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (disabled) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (!item.type.startsWith('image/')) continue;

        const file = item.getAsFile();
        if (file) {
          onSelect(file);
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [disabled, onSelect]);

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
      />

      {source ? (
        <div className="border-border bg-card flex gap-2 rounded-xl border p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={source.url}
            alt={source.name}
            className="border-border bg-muted h-16 w-16 rounded-lg border object-cover"
          />

          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm font-medium">
              {source.name}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {source.width}×{source.height} · {formatSize(source.size)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openPicker}
              disabled={disabled}
              className="border-border text-foreground hover:bg-accent flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t('image-obfuscator.change')}
            </button>
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
              aria-label={t('image-obfuscator.remove')}
              className="text-destructive hover:bg-destructive/10 rounded-lg p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onClick={openPicker}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openPicker();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!disabled) setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
            isDragging
              ? 'scale-[1.01] border-[var(--primary)] bg-[var(--primary)]/8'
              : 'border-border hover:border-[var(--primary)]/50'
          } ${disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
                isDragging ? 'bg-[var(--primary)]' : 'bg-muted'
              }`}
            >
              <Upload
                className={`h-7 w-7 ${
                  isDragging
                    ? 'text-[var(--primary-foreground)]'
                    : 'text-muted-foreground'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-foreground font-semibold">
                {isDragging
                  ? t('image-obfuscator.upload_drag')
                  : t('image-obfuscator.upload_drop')}
              </p>
              <p className="text-muted-foreground text-sm">
                {t('image-obfuscator.upload_hint')}
              </p>
              <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs opacity-70">
                <ImageIcon className="h-3.5 w-3.5" />
                {t('image-obfuscator.paste_hint')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
