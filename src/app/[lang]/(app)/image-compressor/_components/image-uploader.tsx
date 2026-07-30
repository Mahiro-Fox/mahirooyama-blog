'use client';

import { AnimatePresence, motion } from 'framer-motion';
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
  const [isDragging, setIsDragging] = useState(false);
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
   * 处理拖拽进入
   */
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  /**
   * 处理拖拽离开
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  /**
   * 处理拖拽放置
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (!disabled) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, handleFiles]
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div
              onClick={handleClick}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-300 ease-out ${
                isDragging
                  ? 'scale-[1.02] border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-gray-600'
              } ${disabled ? 'pointer-events-none cursor-not-allowed opacity-50' : ''} `}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />

              <motion.div
                animate={{
                  scale: isDragging ? 1.1 : 1,
                }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-4"
              >
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-full ${isDragging ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-800'} transition-colors duration-300`}
                >
                  <Upload
                    className={`h-10 w-10 ${isDragging ? 'text-white' : 'text-gray-500 dark:text-gray-400'} `}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    {isDragging
                      ? t('image-compressor.drag_to_upload')
                      : t('image-compressor.drop_or_click')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('image-compressor.supported_formats')}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {t('image-compressor.max_size')}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <Copy className="h-4 w-4" />
                    <span>{t('image-compressor.paste_supported')}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* 文件列表头部 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-blue-500" />
                <span className="font-semibold text-gray-700 dark:text-gray-300">
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
                    ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                    : 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50'
                } `}
              >
                {t('image-compressor.clear_all')}
              </button>
            </div>

            {/* 图片网格 */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              <AnimatePresence>
                {files.map((file, index) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="group relative"
                  >
                    <div className="aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
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
                              onFileRemove(file.id);
                            }}
                            disabled={disabled}
                            className={`cursor-pointer rounded-full bg-red-500 p-2 text-white transition-colors duration-200 hover:bg-red-600 ${disabled ? 'cursor-not-allowed opacity-50' : ''} `}
                          >
                            <Trash className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 文件信息 */}
                    <div className="mt-2">
                      <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* 添加更多按钮 */}
            <button
              onClick={handleClick}
              disabled={disabled}
              className={`w-full rounded-xl border-2 border-dashed py-4 transition-all duration-300 ${
                disabled
                  ? 'cursor-not-allowed border-gray-300 text-gray-400'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-900/50'
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
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
