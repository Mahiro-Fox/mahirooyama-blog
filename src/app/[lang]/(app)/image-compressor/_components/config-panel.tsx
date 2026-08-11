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
 * 面板标题与重置按钮
 */
function ConfigHeader({
  onReset,
  t,
}: {
  onReset: () => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-[var(--primary)]/10 p-2">
        <Settings className="h-5 w-5 text-[var(--primary)]" />
      </div>
      <h2 className="text-lg font-semibold">
        {t('image-compressor.config_title')}
      </h2>
      <Button onClick={onReset} size="sm" variant="outline" className="ml-auto">
        {t('image-compressor.reset_config')}
      </Button>
    </div>
  );
}

/**
 * 目标格式选择
 */
function FormatSelector({
  targetFormat,
  disabled,
  onSelect,
  t,
}: {
  targetFormat: TargetFormat;
  disabled: boolean;
  onSelect: (format: TargetFormat) => void;
  t: ReturnType<typeof useT>;
}) {
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

  return (
    <div className="space-y-3">
      <span className="text-foreground block text-sm font-medium">
        {t('image-compressor.target_format')}
      </span>
      <div className="grid grid-cols-2 gap-3">
        {FORMAT_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => !disabled && onSelect(option.value)}
            disabled={disabled}
            className={`relative rounded-xl border-2 p-4 transition-all duration-200 ${
              targetFormat === option.value
                ? 'border-[var(--primary)] bg-[var(--primary)]/8'
                : 'border-border hover:border-[var(--primary)]/50'
            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} `}
          >
            <div className="space-y-1 text-center">
              <div
                className={`text-sm font-semibold ${
                  targetFormat === option.value
                    ? 'text-[var(--primary)]'
                    : 'text-foreground'
                } `}
              >
                {option.label}
              </div>
              <div className="text-muted-foreground text-xs">
                {option.description}
              </div>
            </div>

            {targetFormat === option.value && (
              <motion.div
                layoutId="activeFormat"
                className="pointer-events-none absolute inset-0 rounded-xl border-2 border-[var(--primary)]"
                initial={false}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 质量滑条
 */
function QualitySlider({
  quality,
  disabled,
  onChange,
  t,
}: {
  quality: number;
  disabled: boolean;
  onChange: (quality: number) => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label
          htmlFor="quality"
          className="text-foreground block text-sm font-medium"
        >
          {t('image-compressor.quality')}
        </label>
        <span className="text-sm font-semibold text-[var(--primary)]">
          {quality}%
        </span>
      </div>
      <input
        type="range"
        id="quality"
        min="1"
        max="95"
        value={quality}
        onChange={(e) => !disabled && onChange(parseInt(e.target.value))}
        disabled={disabled}
        className={`h-2 w-full cursor-pointer appearance-none rounded-lg ${disabled ? 'cursor-not-allowed opacity-50' : ''} `}
        style={{
          background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${(quality / 95) * 100}%, var(--border) ${(quality / 95) * 100}%, var(--border) 100%)`,
        }}
      />
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>{t('image-compressor.min_size')}</span>
        <span>{t('image-compressor.best_quality')}</span>
      </div>
    </div>
  );
}

/**
 * 高级选项（元数据、动图、调整尺寸）
 */
function AdvancedOptions({
  config,
  updateConfig,
  updateResize,
  disabled,
  t,
}: {
  config: ImageProcessConfig;
  updateConfig: (updates: Partial<ImageProcessConfig>) => void;
  updateResize: (updates: Partial<ResizeOptions>) => void;
  disabled: boolean;
  t: ReturnType<typeof useT>;
}) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const FIT_OPTIONS: { value: ResizeFit; label: string }[] = [
    { value: 'cover', label: t('image-compressor.cover') },
    {
      value: 'contain',
      label: t('image-compressor.contain'),
    },
    { value: 'inside', label: t('image-compressor.inside') },
  ];

  return (
    <div className="border-border border-t pt-4">
      <button
        onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded-lg p-3 transition-colors duration-200 ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-accent'} `}
      >
        <span className="text-foreground text-sm font-medium">
          {t('image-compressor.advanced')}
        </span>
        {isAdvancedOpen ? (
          <ChevronUp className="text-muted-foreground h-5 w-5" />
        ) : (
          <ChevronDown className="text-muted-foreground h-5 w-5" />
        )}
      </button>

      <AnimatePresence>
        {isAdvancedOpen && (
          <motion.div
            initial={{ gridTemplateRows: '0fr', opacity: 0 }}
            animate={{ gridTemplateRows: '1fr', opacity: 1 }}
            exit={{ gridTemplateRows: '0fr', opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'grid' }}
          >
            <div className="min-h-0 space-y-4 overflow-hidden pt-4">
              {/* 元数据处理 */}
              <div className="bg-surface flex items-center justify-between rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[var(--primary)]/10 p-2">
                    <Shield className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <div className="text-foreground text-sm font-medium">
                      {t('image-compressor.strip_metadata')}
                    </div>
                    <div className="text-muted-foreground text-xs">
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
                  aria-label={t('image-compressor.strip_metadata')}
                  className={`relative h-7 w-14 rounded-full transition-colors duration-200 ${
                    !config.keepMetadata ? 'bg-[var(--primary)]' : 'bg-muted'
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
              <div className="bg-surface flex items-center justify-between rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[var(--primary)]/10 p-2">
                    <Film className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <div className="text-foreground text-sm font-medium">
                      {t('image-compressor.convert_animation')}
                    </div>
                    <div className="text-muted-foreground text-xs">
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
                  aria-label={t('image-compressor.convert_animation')}
                  className={`relative h-7 w-14 rounded-full transition-colors duration-200 ${
                    config.convertAnimation ? 'bg-[var(--primary)]' : 'bg-muted'
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
              <div className="bg-surface space-y-4 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[var(--primary)]/10 p-2">
                    <Maximize2 className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <div className="text-foreground text-sm font-medium">
                      {t('image-compressor.resize')}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {t('image-compressor.resize_desc')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="resize-width"
                      className="text-muted-foreground block text-xs font-medium"
                    >
                      {t('image-compressor.width')}
                    </label>
                    <input
                      type="number"
                      id="resize-width"
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
                      className={`bg-background text-foreground border-border w-full rounded-lg border px-3 py-2 text-sm focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none ${disabled ? 'cursor-not-allowed opacity-50' : ''} `}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="resize-height"
                      className="text-muted-foreground block text-xs font-medium"
                    >
                      {t('image-compressor.height')}
                    </label>
                    <input
                      type="number"
                      id="resize-height"
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
                      className={`bg-background text-foreground border-border w-full rounded-lg border px-3 py-2 text-sm focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none ${disabled ? 'cursor-not-allowed opacity-50' : ''} `}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-muted-foreground block text-xs font-medium">
                    {t('image-compressor.fit_mode')}
                  </span>
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
                            ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                            : 'border-border bg-background text-foreground border hover:border-[var(--primary)]/50'
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
  );
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

  return (
    <div className="bg-card border-border space-y-6 rounded-2xl border p-6">
      <ConfigHeader onReset={resetConfig} t={t} />

      <FormatSelector
        targetFormat={config.targetFormat}
        disabled={disabled}
        onSelect={(format) => updateConfig({ targetFormat: format })}
        t={t}
      />

      <QualitySlider
        quality={config.quality}
        disabled={disabled}
        onChange={(quality) => updateConfig({ quality })}
        t={t}
      />

      <AdvancedOptions
        config={config}
        updateConfig={updateConfig}
        updateResize={updateResize}
        disabled={disabled}
        t={t}
      />
    </div>
  );
}
