'use client';

import { AnimatePresence, m } from 'framer-motion';
import { Copy, Image as ImageIcon, Trash, Upload } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import React, { useCallback, useRef, useState } from 'react';
import { useT } from '@/i18n/dictionary-provider';
import { formatSize } from '@/utils/utils';

/**
 * 上传的文件信息
 */
export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
}

/**
 * ImageUploader 组件属性
 */
export interface ImageUploaderProps {
  /** 已上传的文件列表 */
  files: UploadedFile[];
  /** 添加文件回调 */
  onFilesAdd: (files: UploadedFile[]) => void;
  /** 移除文件回调 */
  onFileRemove: (id: string) => void;
  /** 清空全部回调 */
  onClearAll: () => void;
  /** 是否禁用上传（处理中） */
  disabled?: boolean;
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 拖拽/点击上传区域（无文件时的空状态）
 */
function EmptyUploadArea({
  disabled,
  inputRef,
  onFiles,
  onClick,
  t,
}: {
  disabled: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | File[] | null) => void;
  onClick: () => void;
  t: ReturnType<typeof useT>;
}) {
  const [isDragging, setIsDragging] = useState(false);

  /**
   * 处理拖拽进入
   */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  /**
   * 处理拖拽离开
   */
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  /**
   * 处理拖拽放置
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!disabled) {
      onFiles(e.dataTransfer.files);
    }
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div
        onClick={onClick}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            onClick();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-300 ease-out ${
          isDragging
            ? 'scale-[1.02] border-[var(--primary)] bg-[var(--primary)]/8'
            : 'border-border bg-card hover:border-[var(--primary)]/50'
        } ${disabled ? 'pointer-events-none cursor-not-allowed opacity-50' : ''} `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => onFiles(e.target.files)}
          className="hidden"
        />

        <m.div
          animate={{
            scale: isDragging ? 1.1 : 1,
          }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center gap-4"
        >
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full ${isDragging ? 'bg-[var(--primary)]' : 'bg-muted'} transition-colors duration-300`}
          >
            <Upload
              className={`h-10 w-10 ${isDragging ? 'text-[var(--primary-foreground)]' : 'text-muted-foreground'} `}
            />
          </div>

          <div className="space-y-2">
            <p className="text-foreground text-lg font-semibold">
              {isDragging
                ? t('image-compressor.drag_to_upload')
                : t('image-compressor.drop_or_click')}
            </p>
            <p className="text-muted-foreground text-sm">
              {t('image-compressor.supported_formats')}
            </p>
            <p className="text-muted-foreground text-xs opacity-70">
              {t('image-compressor.max_size')}
            </p>
            <div className="text-muted-foreground flex items-center justify-center gap-2 text-xs opacity-70">
              <Copy className="h-4 w-4" />
              <span>{t('image-compressor.paste_supported')}</span>
            </div>
          </div>
        </m.div>
      </div>
    </m.div>
  );
}

/**
 * 已上传文件网格
 */
function UploadedFileGrid({
  files,
  disabled,
  inputRef,
  onFiles,
  onRemove,
  onClearAll,
  onClick,
  t,
}: {
  files: UploadedFile[];
  disabled: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | File[] | null) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onClick: () => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* 文件列表头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-[var(--primary)]" />
          <span className="text-foreground font-semibold">
            {t('image-compressor.selected_count', {
              count: files.length,
              size: formatSize(files.reduce((sum, f) => sum + f.size, 0)),
            })}
          </span>
        </div>
        <button
          onClick={onClearAll}
          disabled={disabled}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
            disabled
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
          } `}
        >
          {t('image-compressor.clear_all')}
        </button>
      </div>

      {/* 图片网格 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <AnimatePresence>
          {files.map((file, index) => (
            <m.div
              key={file.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="group relative"
            >
              <div className="border-border bg-muted aspect-square overflow-hidden rounded-xl border">
                <div className="relative h-full w-full">
                  <Image
                    src={file.preview}
                    alt={file.name}
                    fill
                    className="h-full w-full object-cover"
                  />
                  {/* 悬停遮罩 */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(file.id);
                      }}
                      disabled={disabled}
                      aria-label={t('image-compressor.remove')}
                      className={`bg-destructive hover:bg-destructive/90 cursor-pointer rounded-full p-2 text-white transition-colors duration-200 ${disabled ? 'cursor-not-allowed opacity-50' : ''} `}
                    >
                      <Trash className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 文件信息 */}
              <div className="mt-2">
                <p className="text-foreground truncate text-xs font-medium">
                  {file.name}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </m.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 添加更多按钮 */}
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full rounded-xl border-2 border-dashed py-4 transition-all duration-300 ${
          disabled
            ? 'border-border text-muted-foreground cursor-not-allowed'
            : 'border-border text-foreground hover:bg-accent hover:border-[var(--primary)]/50'
        } `}
      >
        <div className="flex items-center justify-center gap-2">
          <Upload className="h-5 w-5" />
          <span>{t('image-compressor.add_more')}</span>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => onFiles(e.target.files)}
        className="hidden"
      />
    </m.div>
  );
}

/**
 * 图片上传组件
 * 支持拖拽上传、点击选择、剪贴板粘贴
 */
export default function ImageUploader({
  files,
  onFilesAdd,
  onFileRemove,
  onClearAll,
  disabled = false,
}: ImageUploaderProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * 处理文件选择
   */
  const handleFiles = useCallback(
    async (fileList: FileList | File[] | null) => {
      const { MAX_FILE_SIZE } = await import('@/constant/file-upload');
      if (!fileList || disabled) return;

      const newFiles: UploadedFile[] = [];
      const filesArray = Array.from(fileList);

      const validTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/avif',
      ];

      filesArray.forEach((file) => {
        // 验证文件类型
        if (!validTypes.includes(file.type)) {
          toast.error(
            t('image-compressor.unsupported_format', { type: file.type })
          );
          return;
        }

        // 验证文件大小
        if (file.size > MAX_FILE_SIZE) {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
          toast.error(
            t('image-compressor.file_too_large', {
              name: file.name,
              size: sizeMB,
            })
          );
          return;
        }

        // 创建预览
        const preview = URL.createObjectURL(file);

        newFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview,
          name: file.name,
          size: file.size,
        });
      });

      if (newFiles.length > 0) {
        onFilesAdd(newFiles);
      }
    },
    [disabled, onFilesAdd, t]
  );

  /**
   * 处理点击选择
   */
  const handleClick = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  }, [disabled]);

  /**
   * 处理剪贴板粘贴
   */
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (disabled) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        handleFiles(imageFiles);
      }
    },
    [disabled, handleFiles]
  );

  // 组件挂载时添加粘贴事件监听
  React.useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  return (
    <div className="w-full">
      {/* 上传区域 */}
      <AnimatePresence mode="wait">
        {files.length === 0 ? (
          <EmptyUploadArea
            disabled={disabled}
            inputRef={inputRef}
            onFiles={handleFiles}
            onClick={handleClick}
            t={t}
          />
        ) : (
          <UploadedFileGrid
            files={files}
            disabled={disabled}
            inputRef={inputRef}
            onFiles={handleFiles}
            onRemove={onFileRemove}
            onClearAll={onClearAll}
            onClick={handleClick}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
