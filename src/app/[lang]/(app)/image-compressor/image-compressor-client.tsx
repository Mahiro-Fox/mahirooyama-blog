'use client';

import JSZip from 'jszip';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useRef, useState } from 'react';
import { useT } from '@/i18n/dictionary-provider';
import { trackEvent } from '@/utils/tracker';
import ConfigPanel, { ImageProcessConfig } from './_components/config-panel';
import ImageSliderView from './_components/image-slider-view';
import ImageUploader, { UploadedFile } from './_components/image-uploader';
import ProcessStatus, {
  ProcessedImageResult,
} from './_components/process-status';
import StartProcessButton from './_components/start-process-button';

/**
 * 图片压缩工具客户端组件
 * 管理全局状态和组件集成
 */
export default function ImageCompressorClient() {
  const t = useT();
  const resultsSectionRef = useRef<HTMLDivElement>(null);
  // 上传的文件列表
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // 处理配置
  const [config, setConfig] = useState<ImageProcessConfig>({
    targetFormat: 'webp',
    quality: 80,
    keepMetadata: false,
    convertAnimation: false,
  });

  /**
   * 重置配置
   */
  const resetConfig = () => {
    setConfig({
      targetFormat: 'webp',
      quality: 80,
      keepMetadata: false,
      convertAnimation: false,
    });
    trackEvent('reset_image_config');
  };

  // 处理结果列表
  const [results, setResults] = useState<Array<ProcessedImageResult | null>>(
    []
  );

  // 是否正在处理
  const [isProcessing, setIsProcessing] = useState(false);

  // 处理进度
  const [progress, setProgress] = useState(0);

  // 对比视图状态
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonResult, setComparisonResult] =
    useState<ProcessedImageResult | null>(null);
  const [comparisonIndex, setComparisonIndex] = useState(0);

  /**
   * 添加文件
   */
  const handleFilesAdd = async (newFiles: UploadedFile[]) => {
    const { MAX_TOTAL_SIZE } = await import('@/constant/file-upload');
    const currentTotalSize = uploadedFiles.reduce((sum, f) => sum + f.size, 0);

    let totalSize = currentTotalSize;
    const addedFiles: UploadedFile[] = [];
    let isOverLimit = false;

    for (const file of newFiles) {
      if (totalSize + file.size <= MAX_TOTAL_SIZE) {
        addedFiles.push(file);
        totalSize += file.size;
      } else {
        isOverLimit = true;
      }
    }

    if (isOverLimit) {
      setTimeout(() => {
        toast.error(t('image-compressor.total_size_exceeded'));
      }, 2000);
    }

    if (addedFiles.length > 0) {
      setUploadedFiles([...uploadedFiles, ...addedFiles]);
      // 清空之前的处理结果
      setResults([]);
    }
  };

  /**
   * 移除文件
   */
  const handleFileRemove = (id: string) => {
    setUploadedFiles(uploadedFiles.filter((f) => f.id !== id));
    setResults([]);
  };

  /**
   * 清空全部文件
   */
  const handleClearAll = () => {
    setUploadedFiles([]);
    setResults([]);
  };

  /**
   * 开始处理
   */
  const handleStartProcess = async () => {
    trackEvent('start_image_process', {
      numFiles: uploadedFiles.length,
      config,
    });
    if (uploadedFiles.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    try {
      // 创建 FormData
      const formData = new FormData();

      // 添加文件
      uploadedFiles.forEach((file) => {
        formData.append('files', file.file);
      });

      // 添加配置
      formData.append('options', JSON.stringify(config));

      // 发送请求
      const response = await fetch('/api/image/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('image-compressor.process_failed'));
      }

      // 读取流式响应
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Unable to read response stream');

      const decoder = new TextDecoder();
      let buffer = '';
      const processedResults: ProcessedImageResult[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const data = JSON.parse(line);

          if (data.type === 'start') {
            // 开始处理，初始化结果列表
            setResults(new Array(data.total).fill(null));
          } else if (data.type === 'result') {
            const { index, result } = data;
            const item: ProcessedImageResult = {
              id: uploadedFiles[index].id,
              originalName: uploadedFiles[index].name,
              originalSize: uploadedFiles[index].size,
              originalPreview: uploadedFiles[index].preview,
              success: result.success,
              error: result.error,
              errorCode: result.errorCode,
              metadata: result.metadata,
              base64: result.base64,
            };

            processedResults[index] = item;
            // 实时更新结果列表
            setResults((prev) => {
              const newResults = [...prev];
              newResults[index] = item;
              return newResults;
            });

            // 实时更新进度（基于已完成数量）
            const completedCount = processedResults.filter(Boolean).length;
            const newProgress = Math.round(
              (completedCount / uploadedFiles.length) * 100
            );
            setProgress(newProgress);
          } else if (data.type === 'done') {
            // 全部完成
            setProgress(100);
          } else if (data.type === 'error') {
            throw new Error(data.error);
          }
        }
      }
      scrollToResults();
    } catch (error) {
      console.error('Processing failed:', error);
      alert(
        error instanceof Error
          ? error.message
          : t('image-compressor.process_failed')
      );
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  /**
   * 滚动到结果区域
   */
  const scrollToResults = () => {
    resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  /**
   * 下载单个文件
   */
  const handleDownload = (result: ProcessedImageResult) => {
    trackEvent('download_image_file', {
      fileName: result.originalName,
    });
    if (!result.base64) return;

    const link = document.createElement('a');
    link.href = result.base64;

    // 生成文件名
    const originalName = result.originalName;
    const nameWithoutExt = originalName.substring(
      0,
      originalName.lastIndexOf('.')
    );
    const ext = result.metadata?.format || 'webp';
    link.download = `${nameWithoutExt}_converted.${ext}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * 下载全部文件
   */
  const handleDownloadAll = async () => {
    const successResults = results.filter(
      (r): r is ProcessedImageResult => r !== null && r.success && !!r.base64
    );

    if (successResults.length === 0) return;

    try {
      // 创建 ZIP 实例
      const zip = new JSZip();

      // 将所有成功的图片添加到 ZIP 中
      for (const result of successResults) {
        // 生成文件名
        const originalName = result.originalName;
        const nameWithoutExt = originalName.substring(
          0,
          originalName.lastIndexOf('.')
        );
        const ext = result.metadata?.format || 'webp';
        const fileName = `${nameWithoutExt}_converted.${ext}`;

        // 将 base64 转换为二进制数据
        const base64Data = result.base64!.split(',')[1];
        const binaryData = atob(base64Data);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }

        // 添加到 ZIP
        zip.file(fileName, bytes);
      }

      // 生成 ZIP 文件
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      trackEvent('download_all_images', {
        numFiles: successResults.length,
      });
      // 创建下载链接
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `compressed_images_${Date.now()}.zip`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 释放 URL 对象
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Bundle download failed:', error);
      alert(t('image-compressor.bundle_download_failed'));
    }
  };

  /**
   * 查看对比
   */
  const handleViewComparison = (result: ProcessedImageResult) => {
    const index = results.findIndex((r) => r && r.id === result.id);
    setComparisonIndex(index);
    setComparisonResult(result);
    setComparisonOpen(true);
  };

  /**
   * 切换到上一张
   */
  const handlePreviousComparison = () => {
    if (comparisonIndex > 0) {
      const newIndex = comparisonIndex - 1;
      setComparisonIndex(newIndex);
      setComparisonResult(results[newIndex]);
    }
  };

  /**
   * 切换到下一张
   */
  const handleNextComparison = () => {
    if (comparisonIndex < results.length - 1) {
      const newIndex = comparisonIndex + 1;
      setComparisonIndex(newIndex);
      setComparisonResult(results[newIndex]);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* 头部 */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500 p-2">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {t('image-compressor.page_title')}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('image-compressor.subtitle')}
                </p>
              </div>
            </div>

            <StartProcessButton
              uploadedFiles={uploadedFiles}
              isProcessing={isProcessing}
              progress={progress}
              results={results}
              handleStartProcess={handleStartProcess}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left: Upload area */}
          <div className="lg:col-span-2">
            <ImageUploader
              files={uploadedFiles}
              onFilesAdd={handleFilesAdd}
              onFileRemove={handleFileRemove}
              onClearAll={handleClearAll}
              disabled={isProcessing}
            />
          </div>

          {/* Right: Config panel */}
          <div className="lg:col-span-1">
            <ConfigPanel
              config={config}
              onConfigChange={setConfig}
              resetConfig={resetConfig}
              disabled={isProcessing}
            />
          </div>
        </div>

        {/* Processing status */}
        {results.length > 0 && (
          <div
            className="mt-8 scroll-mt-12 sm:scroll-mt-16"
            ref={resultsSectionRef}
          >
            <ProcessStatus
              results={results}
              isProcessing={isProcessing}
              progress={progress}
              onDownload={handleDownload}
              onDownloadAll={handleDownloadAll}
              onViewComparison={handleViewComparison}
            />
          </div>
        )}
      </div>

      {/* Comparison view */}
      <ImageSliderView
        isOpen={comparisonOpen}
        result={comparisonResult}
        onClose={() => setComparisonOpen(false)}
        onPrevious={handlePreviousComparison}
        onNext={handleNextComparison}
        hasPrevious={comparisonIndex > 0}
        hasNext={comparisonIndex < results.length - 1}
      />

      {/* Footer */}
      <div className="mt-16 border-t border-gray-200 bg-white/50 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <p>{t('image-compressor.privacy_notice')}</p>
            <p>{t('image-compressor.built_with')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
