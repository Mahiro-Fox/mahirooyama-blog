'use client';

import { AnimatePresence, m } from 'framer-motion';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import React, { useEffect, useEffectEvent } from 'react';
import { useT } from '@/i18n/dictionary-provider';
import ImageCompare from './image-compare';

/**
 * ProcessedImageResult 类型（从 ProcessStatus 导入）
 */
export interface ProcessedImageResult {
  id: string;
  originalName: string;
  originalSize: number;
  originalPreview: string;
  success: boolean;
  error?: string;
  errorCode?: string;
  metadata?: {
    width: number;
    height: number;
    format: string;
    size: number;
    isAnimated: boolean;
  };
  base64?: string;
}

/**
 * ImageSliderView 组件属性
 */
export interface ImageSliderViewProps {
  /** 是否打开 */
  isOpen: boolean;
  /** 处理结果 */
  result: ProcessedImageResult | null;
  /** 关闭回调 */
  onClose: () => void;
  /** 切换到上一张 */
  onPrevious?: () => void;
  /** 切换到下一张 */
  onNext?: () => void;
  /** 是否有上一张 */
  hasPrevious?: boolean;
  /** 是否有下一张 */
  hasNext?: boolean;
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
 * 计算节省百分比
 */
function calculateSavings(original: number, compressed: number): number {
  if (original === 0) return 0;
  return Math.round(((original - compressed) / original) * 100);
}

/**
 * 图片对比滑块组件
 * 支持左右拖动对比原图和处理后的图片
 */
export default function ImageSliderView({
  isOpen,
  result,
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: ImageSliderViewProps) {
  const t = useT();

  /**
   * 键盘事件处理
   * 监听器只注册一次；回调通过 useEffectEvent 读取最新 props，避免随其重建订阅
   */
  const handleKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft' && onPrevious && hasPrevious) {
      onPrevious();
    } else if (e.key === 'ArrowRight' && onNext && hasNext) {
      onNext();
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!result || !result.success || !result.base64) {
    return null;
  }

  const savings = calculateSavings(
    result.originalSize,
    result.metadata?.size || 0
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={onClose}
        >
          <m.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative flex h-full w-full max-w-7xl flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between border-b border-white/10 bg-black/40 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-white">
                  {result.originalName}
                </h3>
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <span className="rounded bg-white/10 px-2 py-1">
                    {result.metadata?.width} × {result.metadata?.height}
                  </span>
                  <span className="rounded bg-white/10 px-2 py-1">
                    {result.metadata?.format.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* 导航按钮 */}
                {onPrevious && (
                  <button
                    onClick={onPrevious}
                    disabled={!hasPrevious}
                    aria-label={t('image-compressor.previous')}
                    className="rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                {onNext && (
                  <button
                    onClick={onNext}
                    disabled={!hasNext}
                    aria-label={t('image-compressor.next')}
                    className="rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </button>
                )}

                <button
                  onClick={onClose}
                  aria-label={t('image-compressor.close')}
                  className="rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* 图片对比区域 */}
            <div className="relative flex-1 overflow-hidden bg-black">
              <div className="relative flex h-full w-full items-center justify-center">
                <ImageCompare
                  width={result.metadata?.width || 0}
                  height={result.metadata?.height || 0}
                  before={result.originalPreview}
                  after={result.base64}
                />
              </div>
            </div>

            {/* 底部信息 */}
            <div className="flex items-center justify-between border-t border-white/10 bg-black/40 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-6">
                <div className="text-sm text-white/60">
                  <span className="text-white/40">
                    {t('image-compressor.compare_original')}:
                  </span>{' '}
                  <span className="font-medium text-white">
                    {formatFileSize(result.originalSize)}
                  </span>
                </div>
                <div className="text-sm text-white/60">
                  <span className="text-white/40">
                    {t('image-compressor.compare_processed')}:
                  </span>{' '}
                  <span className="font-medium text-white">
                    {formatFileSize(result.metadata?.size || 0)}
                  </span>
                </div>
                {savings > 0 && (
                  <div className="text-sm">
                    <span className="font-semibold text-[var(--primary)]">
                      {t('image-compressor.saved', {
                        percent: savings,
                      })}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-xs text-white/40">
                {t('image-compressor.compare_operate_hint')}
              </div>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
