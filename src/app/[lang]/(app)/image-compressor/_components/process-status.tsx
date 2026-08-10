'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle,
  Download,
  Eye,
  Loader2,
  Package,
  XCircle,
} from 'lucide-react';
import React from 'react';
import { useT } from '@/i18n/dictionary-provider';

/**
 * 处理后的图片元数据
 */
export interface ProcessedImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  isAnimated: boolean;
}

/**
 * 单张图片处理结果
 */
export interface ProcessedImageResult {
  id: string;
  originalName: string;
  originalSize: number;
  originalPreview: string;
  success: boolean;
  error?: string;
  errorCode?: string;
  metadata?: ProcessedImageMetadata;
  base64?: string;
}

/**
 * ProcessStatus 组件属性
 */
export interface ProcessStatusProps {
  /** 处理结果列表 */
  results: (ProcessedImageResult | null)[];
  /** 是否正在处理 */
  isProcessing: boolean;
  /** 处理进度 0-100 */
  progress: number;
  /** 下载单个图片回调 */
  onDownload: (result: ProcessedImageResult) => void;
  /** 下载全部回调 */
  onDownloadAll: () => void;
  /** 查看对比回调 */
  onViewComparison: (result: ProcessedImageResult) => void;
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
 * 处理状态组件
 * 显示处理进度、结果列表和下载选项
 */
export default function ProcessStatus({
  results,
  isProcessing,
  progress,
  onDownload,
  onDownloadAll,
  onViewComparison,
}: ProcessStatusProps) {
  const t = useT();

  const validResults = results.filter(
    (r): r is ProcessedImageResult => r !== null
  );
  const successCount = validResults.filter((r) => r.success).length;
  const failureCount = validResults.filter((r) => !r.success).length;
  const totalSavings = validResults.reduce((acc, r) => {
    if (r.success && r.metadata) {
      return acc + (r.originalSize - r.metadata.size);
    }
    return acc;
  }, 0);

  if (results.length === 0 && !isProcessing) {
    return null;
  }

  return (
    <div className="bg-card space-y-6 rounded-2xl border border-border p-6">
      {/* 处理进度 */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="text-[var(--primary)] h-5 w-5 animate-spin" />
              <span className="text-foreground font-medium">
                {t('image-compressor.processing_images')}
              </span>
            </div>
            <span className="text-[var(--primary)] text-sm font-semibold">
              {progress}%
            </span>
          </div>

          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <motion.div
              className="bg-[var(--primary)] h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>
      )}

      {/* 处理完成统计 */}
      {!isProcessing && results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-4 sm:grid-cols-4"
        >
          <div className="bg-[var(--primary)]/8 rounded-xl p-4">
            <div className="text-[var(--primary)] text-2xl font-bold">
              {results.length}
            </div>
            <div className="text-muted-foreground text-xs">
              {t('image-compressor.total_count')}
            </div>
          </div>

          <div className="bg-green-500/10 rounded-xl p-4">
            <div className="text-green-600 text-2xl font-bold">
              {successCount}
            </div>
            <div className="text-muted-foreground text-xs">
              {t('image-compressor.success')}
            </div>
          </div>

          <div className="bg-destructive/10 rounded-xl p-4">
            <div className="text-destructive text-2xl font-bold">
              {failureCount}
            </div>
            <div className="text-muted-foreground text-xs">
              {t('image-compressor.failed')}
            </div>
          </div>

          {totalSavings > 0 && (
            <div className="bg-[var(--primary)]/8 rounded-xl p-4">
              <div className="text-[var(--primary)] text-2xl font-bold">
                {formatFileSize(totalSavings)}
              </div>
              <div className="text-muted-foreground text-xs">
                {t('image-compressor.total_saved')}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* 下载全部按钮 */}
      {!isProcessing && successCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <button
            onClick={onDownloadAll}
            className="bg-[var(--primary)] flex w-full items-center justify-center gap-2 rounded-xl py-4 font-medium text-[var(--primary-foreground)] shadow-lg shadow-[var(--primary)]/25 transition-all duration-200 hover:bg-[var(--primary)]/90 hover:shadow-[var(--primary)]/40"
          >
            <Package className="h-5 w-5" />
            {t('image-compressor.batch_download', { count: successCount })}
          </button>
        </motion.div>
      )}

      {/* 结果列表 */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="text-foreground text-sm font-medium">
              {t('image-compressor.process_results')}
            </div>

            <div className="max-h-96 space-y-3 overflow-y-auto pr-2">
              {validResults.map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-xl border p-4 transition-all duration-200 ${
                    result.success
                      ? 'border-border bg-surface hover:border-[var(--primary)]/40'
                      : 'border-destructive/30 bg-destructive/5'
                  } `}
                >
                  <div className="flex items-start gap-4">
                    {/* 缩略图 */}
                    <div className="bg-muted h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                      <img
                        src={result.originalPreview}
                        alt={result.originalName}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* 信息 */}
                    <div className="min-w-0 flex-1 shrink-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-foreground truncate text-sm font-medium">
                          {result.originalName}
                        </p>
                        {result.success ? (
                          <CheckCircle className="text-green-500 h-5 w-5 shrink-0" />
                        ) : (
                          <XCircle className="text-destructive h-5 w-5 shrink-0" />
                        )}
                      </div>

                      {result.success && result.metadata ? (
                        <div className="space-y-1">
                          <div className="text-muted-foreground flex items-center gap-4 text-xs">
                            <span>
                              {result.metadata.width} × {result.metadata.height}
                            </span>
                            <span className="bg-muted rounded px-2 py-0.5">
                              {result.metadata.format.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground text-xs">
                              {formatFileSize(result.originalSize)}
                            </span>
                            <span className="text-muted-foreground opacity-50">
                              →
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {formatFileSize(result.metadata.size)}
                            </span>

                            {result.metadata.size < result.originalSize && (
                              <span className="text-green-600 text-xs font-semibold">
                                {t('image-compressor.saved', {
                                  percent: calculateSavings(
                                    result.originalSize,
                                    result.metadata.size
                                  ),
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-destructive flex items-center gap-2 text-xs">
                          <AlertCircle className="h-4 w-4" />
                          <span>
                            {result.error ||
                              t('image-compressor.process_failed_short')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    {result.success && (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => onViewComparison(result)}
                          className="bg-muted hover:bg-accent rounded-lg p-2 transition-colors duration-200"
                          title={t('image-compressor.view_compare')}
                        >
                          <Eye className="text-muted-foreground h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDownload(result)}
                          className="bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 rounded-lg p-2 transition-colors duration-200"
                          title={t('image-compressor.download_single')}
                        >
                          <Download className="text-[var(--primary)] h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
