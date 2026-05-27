'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight, ZoomIn, ZoomOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageCompare from './ImageCompare';

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
  /**
   * 键盘事件处理
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && onPrevious && hasPrevious) {
        onPrevious();
      } else if (e.key === 'ArrowRight' && onNext && hasNext) {
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onPrevious, onNext, hasPrevious, hasNext]);

  if (!result || !result.success || !result.base64) {
    return null;
  }

  const savings = calculateSavings(result.originalSize, result.metadata?.size || 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full h-full max-w-7xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-white">
                  {result.originalName}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="px-2 py-1 bg-gray-800 rounded">
                    {result.metadata?.width} × {result.metadata?.height}
                  </span>
                  <span className="px-2 py-1 bg-gray-800 rounded">
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
                    className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                {onNext && (
                  <button
                    onClick={onNext}
                    disabled={!hasNext}
                    className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 图片对比区域 */}
            <div className="flex-1 relative overflow-hidden bg-gray-950">
              <div className="relative w-full h-full flex items-center justify-center">
                <ImageCompare
                  width={result.metadata?.width || 0}
                  height={result.metadata?.height || 0}
                  before={result.originalPreview}
                  after={result.base64}
                />
              </div>
            </div>

            {/* 底部信息 */}
            <div className="flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur-sm border-t border-gray-800">
              <div className="flex items-center gap-6">
                <div className="text-sm text-gray-400">
                  <span className="text-gray-600">原图:</span>{' '}
                  <span className="text-white font-medium">
                    {formatFileSize(result.originalSize)}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  <span className="text-gray-600">处理后:</span>{' '}
                  <span className="text-white font-medium">
                    {formatFileSize(result.metadata?.size || 0)}
                  </span>
                </div>
                {savings > 0 && (
                  <div className="text-sm">
                    <span className="text-green-400 font-semibold">
                      节省 {savings}%
                    </span>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-500">
                拖动滑块对比 • 滚轮缩放 • 键盘 ← → 切换
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
