'use client';

import React, { useState } from 'react';
import { Download, Package, CheckCircle, XCircle, AlertCircle, Eye, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
      {/* 处理进度 */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                正在处理图片...
              </span>
            </div>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {progress}%
            </span>
          </div>
          
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500 rounded-full"
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
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {results.length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              总处理数
            </div>
          </div>
          
          <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-xl">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {successCount}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              成功
            </div>
          </div>
          
          <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-xl">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {failureCount}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              失败
            </div>
          </div>
          
          {totalSavings > 0 && (
            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-xl">
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
            className="w-full py-4 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
          >
            <Package className="w-5 h-5" />
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
            
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {results.map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onMouseEnter={() => setHoveredId(result.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`
                    p-4 rounded-xl border transition-all duration-200
                    ${result.success
                      ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
                      : 'border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20'
                    }
                  `}
                >
                  <div className="flex items-start gap-4">
                    {/* 缩略图 */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                      <img
                        src={result.originalPreview}
                        alt={result.originalName}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0 space-y-2 shrink-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {result.originalName}
                        </p>
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                        )}
                      </div>

                      {result.success && result.metadata ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                            <span>
                              {result.metadata.width} × {result.metadata.height}
                            </span>
                            <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                              {result.metadata.format.toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatFileSize(result.originalSize)}
                            </span>
                            <span className="text-gray-400 dark:text-gray-600">→</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatFileSize(result.metadata.size)}
                            </span>
                            
                            {result.metadata.size < result.originalSize && (
                              <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                已节省 {calculateSavings(result.originalSize, result.metadata.size)}%
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                          <AlertCircle className="w-4 h-4" />
                          <span>{result.error || '处理失败'}</span>
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    {result.success && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => onViewComparison(result)}
                          className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                          title="查看对比"
                        >
                          <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => onDownload(result)}
                          className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors duration-200"
                          title="下载"
                        >
                          <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
