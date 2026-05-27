'use client';

import React from 'react';
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
  results: ProcessedImageResult[];
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
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;
  const totalSavings = results.reduce((acc, r) => {
    if (r.success && r.metadata) {
      return acc + (r.originalSize - r.metadata.size);
    }
    return acc;
  }, 0);

  if (results.length === 0 && !isProcessing) {
    return null;
  }

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      {/* 处理进度 */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                正在处理图片...
              </span>
            </div>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {progress}%
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <motion.div
              className="h-full rounded-full bg-blue-500"
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
          <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-950/30">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {results.length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              总处理数
            </div>
          </div>

          <div className="rounded-xl bg-green-50 p-4 dark:bg-green-950/30">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {successCount}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">成功</div>
          </div>

          <div className="rounded-xl bg-red-50 p-4 dark:bg-red-950/30">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {failureCount}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">失败</div>
          </div>

          {totalSavings > 0 && (
            <div className="rounded-xl bg-purple-50 p-4 dark:bg-purple-950/30">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatFileSize(totalSavings)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                总节省
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
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-blue-600 py-4 font-medium text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:from-blue-600 hover:to-blue-700 hover:shadow-blue-500/40"
          >
            <Package className="h-5 w-5" />
            打包下载全部 ({successCount} 张)
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
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              处理结果
            </div>

            <div className="max-h-96 space-y-3 overflow-y-auto pr-2">
              {results.map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-xl border p-4 transition-all duration-200 ${
                    result.success
                      ? 'border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-gray-600'
                      : 'border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20'
                  } `}
                >
                  <div className="flex items-start gap-4">
                    {/* 缩略图 */}
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
                      <img
                        src={result.originalPreview}
                        alt={result.originalName}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* 信息 */}
                    <div className="min-w-0 flex-1 shrink-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                          {result.originalName}
                        </p>
                        {result.success ? (
                          <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                        )}
                      </div>

                      {result.success && result.metadata ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                            <span>
                              {result.metadata.width} × {result.metadata.height}
                            </span>
                            <span className="rounded bg-gray-200 px-2 py-0.5 dark:bg-gray-700">
                              {result.metadata.format.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatFileSize(result.originalSize)}
                            </span>
                            <span className="text-gray-400 dark:text-gray-600">
                              →
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatFileSize(result.metadata.size)}
                            </span>

                            {result.metadata.size < result.originalSize && (
                              <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                已节省{' '}
                                {calculateSavings(
                                  result.originalSize,
                                  result.metadata.size
                                )}
                                %
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                          <AlertCircle className="h-4 w-4" />
                          <span>{result.error || '处理失败'}</span>
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    {result.success && (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => onViewComparison(result)}
                          className="rounded-lg bg-gray-200 p-2 transition-colors duration-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                          title="查看对比"
                        >
                          <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => onDownload(result)}
                          className="rounded-lg bg-blue-100 p-2 transition-colors duration-200 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50"
                          title="下载"
                        >
                          <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
