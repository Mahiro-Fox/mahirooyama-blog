'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Film,
  Maximize2,
  Settings,
  Shield,
} from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '@/components/shadcn-ui/button';
import { useT } from '@/i18n/dictionary-provider';

/**
 * 目标格式类型
 */
export type TargetFormat = 'webp' | 'png' | 'jpeg' | 'avif';

/**
 * 调整尺寸适配模式
 */
export type ResizeFit = 'cover' | 'contain' | 'inside';

/**
 * 调整尺寸配置
 */
export interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: ResizeFit;
}

/**
 * 图片处理配置
 */
export interface ImageProcessConfig {
  /** 目标格式 */
  targetFormat: TargetFormat;
  /** 压缩质量 1-95 */
  quality: number;
  /** 是否保留元数据 */
  keepMetadata: boolean;
  /** 调整尺寸配置 */
  resize?: ResizeOptions;
  /** 是否转换动图 */
  convertAnimation: boolean;
}

/**
 * ConfigPanel 组件属性
 */
export interface ConfigPanelProps {
  /** 当前配置 */
  config: ImageProcessConfig;
  /** 配置变更回调 */
  onConfigChange: (config: ImageProcessConfig) => void;
  /** 重置配置回调 */
  resetConfig: () => void;
  /** 是否禁用（处理中） */
  disabled?: boolean;
}

/**
 * 配置面板组件
 * 提供格式选择、质量控制、高级选项等配置
 */
export default function ConfigPanel({
  config,
  onConfigChange,
  resetConfig,
  disabled = false,
}: ConfigPanelProps) {
  const t = useT();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  /**
   * 更新配置
   */
  const updateConfig = (updates: Partial<ImageProcessConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  /**
   * 更新调整尺寸配置
   */
  const updateResize = (updates: Partial<ResizeOptions>) => {
    updateConfig({
      resize: {
        ...config.resize,
        ...updates,
      },
    });
  };

  const FORMAT_OPTIONS: {
    value: TargetFormat;
    label: string;
    description: string;
  }[] = [
    {
      value: 'webp',
      label: 'WebP',
      description: t('image-compressor.webp_desc'),
    },
    {
      value: 'png',
      label: 'PNG',
      description: t('image-compressor.png_desc'),
    },
    {
      value: 'jpeg',
      label: 'JPEG',
      description: t('image-compressor.jpeg_desc'),
    },
    {
      value: 'avif',
      label: 'AVIF',
      description: t('image-compressor.avif_desc'),
    },
  ];

  const FIT_OPTIONS: { value: ResizeFit; label: string }[] = [
    { value: 'cover', label: t('image-compressor.cover') },
    {
      value: 'contain',
      label: t('image-compressor.contain'),
    },
    { value: 'inside', label: t('image-compressor.inside') },
  ];

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
          <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('image-compressor.config_title')}
        </h2>
        <Button
          onClick={resetConfig}
          size="sm"
          variant="outline"
          className="ml-auto"
        >
          {t('image-compressor.reset_config')}
        </Button>
      </div>

      {/* 格式选择 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('image-compressor.target_format')}
        </label>
        <div className="grid grid-cols-2 gap-3">
          {FORMAT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() =>
                !disabled && updateConfig({ targetFormat: option.value })
              }
              disabled={disabled}
              className={`relative rounded-xl border-2 p-4 transition-all duration-200 ${
                config.targetFormat === option.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} `}
            >
              <div className="space-y-1 text-center">
                <div
                  className={`text-sm font-semibold ${
                    config.targetFormat === option.value
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300'
                  } `}
                >
                  {option.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {option.description}
                </div>
              </div>

              {config.targetFormat === option.value && (
                <motion.div
                  layoutId="activeFormat"
                  className="pointer-events-none absolute inset-0 rounded-xl border-2 border-blue-500"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Quality slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('image-compressor.quality')}
          </label>
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {config.quality}%
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="95"
          value={config.quality}
          onChange={(e) =>
            !disabled && updateConfig({ quality: parseInt(e.target.value) })
          }
          disabled={disabled}
          className={`h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700 ${disabled ? 'cursor-not-allowed opacity-50' : ''} `}
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(config.quality / 95) * 100}%, #e5e7eb ${(config.quality / 95) * 100}%, #e5e7eb 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{t('image-compressor.min_size')}</span>
          <span>{t('image-compressor.best_quality')}</span>
        </div>
      </div>

      {/* 高级选项 */}
      <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
        <button
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          disabled={disabled}
          className={`flex w-full items-center justify-between rounded-lg p-3 transition-colors duration-200 ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'} `}
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('image-compressor.advanced')}
          </span>
          {isAdvancedOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {isAdvancedOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-4">
                {/* 元数据处理 */}
                <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
                      <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('image-compressor.strip_metadata')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t('image-compressor.strip_metadata_desc')}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      !disabled &&
                      updateConfig({ keepMetadata: !config.keepMetadata })
                    }
                    disabled={disabled}
                    className={`relative h-7 w-14 rounded-full transition-colors duration-200 ${
                      !config.keepMetadata
                        ? 'bg-blue-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    } ${disabled ? 'cursor-not-allowed opacity-50' : ''} `}
                  >
                    <motion.div
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md ${!config.keepMetadata ? 'left-8' : 'left-1'} `}
                      layout
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  </button>
                </div>

                {/* 动图转换 */}
                <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                      <Film className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('image-compressor.convert_animation')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t('image-compressor.convert_animation_desc')}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      !disabled &&
                      updateConfig({
                        convertAnimation: !config.convertAnimation,
                      })
                    }
                    disabled={disabled}
                    className={`relative h-7 w-14 rounded-full transition-colors duration-200 ${
                      config.convertAnimation
                        ? 'bg-blue-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    } ${disabled ? 'cursor-not-allowed opacity-50' : ''} `}
                  >
                    <motion.div
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md ${config.convertAnimation ? 'left-8' : 'left-1'} `}
                      layout
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  </button>
                </div>

                {/* 调整尺寸 */}
                <div className="space-y-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
                      <Maximize2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('image-compressor.resize')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t('image-compressor.resize_desc')}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                        {t('image-compressor.width')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={config.resize?.width || ''}
                        onChange={(e) => {
                          const value = e.target.value
                            ? parseInt(e.target.value)
                            : undefined;
                          updateResize({ width: value });
                        }}
                        disabled={disabled}
                        placeholder={t('image-compressor.auto')}
                        className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 ${disabled ? 'cursor-not-allowed opacity-50' : ''} `}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                        {t('image-compressor.height')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={config.resize?.height || ''}
                        onChange={(e) => {
                          const value = e.target.value
                            ? parseInt(e.target.value)
                            : undefined;
                          updateResize({ height: value });
                        }}
                        disabled={disabled}
                        placeholder={t('image-compressor.auto')}
                        className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 ${disabled ? 'cursor-not-allowed opacity-50' : ''} `}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                      {t('image-compressor.fit_mode')}
                    </label>
                    <div className="flex gap-2">
                      {FIT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() =>
                            !disabled && updateResize({ fit: option.value })
                          }
                          disabled={disabled}
                          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                            config.resize?.fit === option.value
                              ? 'bg-blue-500 text-white'
                              : 'border border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-500'
                          } ${disabled ? 'cursor-not-allowed opacity-50' : ''} `}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
