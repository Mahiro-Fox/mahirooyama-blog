"use client";

import { Image as ImageIcon, Plus, Upload } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/dictionary-provider";

interface UploadDropzoneProps {
  /** 当前已导入的图片数量，用于切换紧凑样式 */
  count: number;
  disabled?: boolean;
  onSelect: (files: File[]) => void;
}

/**
 * 多图上传区：支持拖拽、点击与剪贴板粘贴，选中的文件会追加到列表。
 */
export default function UploadDropzone({
  count,
  disabled = false,
  onSelect,
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
      const next = Array.from(files);
      if (next.length > 0) onSelect(next);
    },
    [disabled, onSelect],
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

      const files: File[] = [];
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (!item.type.startsWith("image/")) continue;

        const file = item.getAsFile();
        if (file) files.push(file);
      }

      if (files.length > 0) onSelect(files);
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [disabled, onSelect]);

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {count > 0 ? (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onClick={openPicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
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
          className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm transition-colors ${
            isDragging
              ? "border-[var(--primary)] bg-[var(--primary)]/8"
              : "border-border hover:border-[var(--primary)]/50"
          } ${disabled ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
        >
          <Plus className="h-4 w-4" />
          <span>{t("image-obfuscator.add_more")}</span>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onClick={openPicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
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
              ? "scale-[1.01] border-[var(--primary)] bg-[var(--primary)]/8"
              : "border-border hover:border-[var(--primary)]/50"
          } ${disabled ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
                isDragging ? "bg-[var(--primary)]" : "bg-muted"
              }`}
            >
              <Upload
                className={`h-7 w-7 ${
                  isDragging
                    ? "text-[var(--primary-foreground)]"
                    : "text-muted-foreground"
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-foreground font-semibold">
                {isDragging
                  ? t("image-obfuscator.upload_drag")
                  : t("image-obfuscator.upload_drop")}
              </p>
              <p className="text-muted-foreground text-sm">
                {t("image-obfuscator.upload_hint")}
              </p>
              <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs opacity-70">
                <ImageIcon className="h-3.5 w-3.5" />
                {t("image-obfuscator.paste_hint")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
