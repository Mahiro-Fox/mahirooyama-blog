'use client';

import { Images, Shuffle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/shadcn-ui/button';
import {
  // MAX_FILE_SIZE,
  // MAX_FILES_COUNT,
  MAX_TOTAL_SIZE,
} from '@/constant/file-upload';
import { useT } from '@/i18n/dictionary-provider';
import {
  LARGE_IMAGE_PIXELS,
  MAX_PIXELS,
  MAX_SIDE,
  type ObfuscationMode,
  type ObfuscationStage,
} from '@/lib/image-obfuscator/types';
import { formatSize } from '@/utils/utils';
import ControlPanel from './_components/control-panel';
import GalleryPickerDialog from './_components/gallery-picker-dialog';
import ImageList from './_components/image-list';
import PreviewCard from './_components/preview-card';
import UploadDropzone from './_components/upload-dropzone';
import {
  useObfuscationJob,
  type JobFailure,
} from './_hooks/use-obfuscation-job';
import {
  measureImageFile,
  readObfuscationMetaFromFile,
  type OutputFormat,
} from './_lib/image-codec';
import {
  processImageFile,
  type ProcessingSettings,
} from './_lib/process-image';
import type { ImageItem, ResultImage } from './_lib/types';

const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

/** 批次总像素预算，避免批量导入后内存峰值过高 */
const MAX_BATCH_PIXELS = 150_000_000;

const ERROR_KEYS: Record<string, string> = {
  INVALID_IMAGE: 'image-obfuscator.error_invalid_image',
  INVALID_DIMENSION: 'image-obfuscator.error_invalid_dimension',
  UNSUPPORTED_SIZE: 'image-obfuscator.error_unsupported_size',
  INVALID_STRENGTH: 'image-obfuscator.error_invalid_strength',
  INSECURE_CONTEXT: 'image-obfuscator.error_insecure_context',
  WORKER_ERROR: 'image-obfuscator.error_worker',
  INTERNAL: 'image-obfuscator.error_process',
};

interface ResolvedImageUrl {
  url: string;
  name: string;
  mime: string;
}

function createItemId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * 只接受本站图片链接（相对路径或同源绝对地址）。
 */
function resolveSameSiteImageUrl(raw: string): ResolvedImageUrl | null {
  if (typeof window === 'undefined') return null;

  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (parsed.origin !== window.location.origin) return null;

    const segment = parsed.pathname.split('/').filter(Boolean).pop() ?? 'image';
    const name = decodeURIComponent(segment);
    const extension = name.split('.').pop()?.toLowerCase() ?? '';
    const mime =
      extension === 'png'
        ? 'image/png'
        : extension === 'jpg' || extension === 'jpeg'
          ? 'image/jpeg'
          : extension === 'webp'
            ? 'image/webp'
            : '';

    return {
      url: `${parsed.pathname}${parsed.search}`,
      name,
      mime,
    };
  } catch {
    return null;
  }
}

/**
 * 下载本站图片并包装成 File。外链或下载失败时返回 null。
 */
async function loadImageFileFromUrl(raw: string): Promise<File | null> {
  const resolved = resolveSameSiteImageUrl(raw);
  if (!resolved) return null;

  try {
    const response = await fetch(resolved.url);
    if (!response.ok) return null;

    const blob = await response.blob();
    const type = ACCEPTED_TYPES.has(blob.type)
      ? blob.type
      : resolved.mime || blob.type;

    return new File([blob], resolved.name, {
      type: type || 'application/octet-stream',
    });
  } catch {
    return null;
  }
}

interface ImageObfuscatorClientProps {
  /** 通过 ?url= 传入的本站图片地址，载入后自动进入还原模式 */
  initialUrls?: string[];
}

export default function ImageObfuscatorClient({
  initialUrls = [],
}: ImageObfuscatorClientProps) {
  const t = useT();
  const router = useRouter();
  const { status, error, run, cancel, reset: resetJob } = useObfuscationJob();
  const resultRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<ImageItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<ObfuscationMode>('obfuscate');
  const [password, setPassword] = useState('');
  const [strength, setStrength] = useState(1);
  const [greenBoost, setGreenBoost] = useState(false);
  const [format, setFormat] = useState<OutputFormat>('png');
  const [quality, setQuality] = useState(0.85);
  const [localErrorKey, setLocalErrorKey] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchStage, setBatchStage] = useState<ObfuscationStage>('derive-key');
  const [isZipping, setIsZipping] = useState(false);
  /** 混淆图库弹窗开关 */
  const [pickerOpen, setPickerOpen] = useState(false);

  /** 列表的权威数据源，批量队列按 id 增量更新 */
  const itemsRef = useRef<ImageItem[]>([]);
  const urlsRef = useRef<Set<string>>(new Set());
  /** 批次令牌：取消或重新开始时丢弃过期的异步结果 */
  const batchTokenRef = useRef(0);
  /** 导入令牌：避免并发导入互相覆盖 */
  const importTokenRef = useRef(0);

  const commitItems = useCallback((next: ImageItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const patchItem = useCallback((id: string, patch: Partial<ImageItem>) => {
    const next = itemsRef.current.map((item) =>
      item.id === id ? { ...item, ...patch } : item
    );
    itemsRef.current = next;
    setItems(next);
  }, []);

  const createUrl = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    urlsRef.current.add(url);
    return url;
  }, []);

  const revokeUrl = useCallback((url: string) => {
    URL.revokeObjectURL(url);
    urlsRef.current.delete(url);
  }, []);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  /**
   * 导入文件：校验类型/数量/大小/像素预算，解析元数据后追加到列表。
   */
  const handleImport = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || isBatchRunning) return;

      setLocalErrorKey(null);
      setIsImporting(true);

      const token = importTokenRef.current + 1;
      importTokenRef.current = token;

      const current = itemsRef.current;
      const MAX_FILES_COUNT = 100;
      const slots = Math.max(0, MAX_FILES_COUNT - current.length);
      let totalSize = current.reduce((sum, item) => sum + item.size, 0);
      let totalPixels = current.reduce(
        (sum, item) => sum + item.width * item.height,
        0
      );

      const candidates = files
        .filter((file) => ACCEPTED_TYPES.has(file.type))
        .slice(0, slots);

      const newItems: ImageItem[] = [];
      let largeCount = 0;

      try {
        for (const file of candidates) {
          if (importTokenRef.current !== token) return;
          // 暂时不校验文件大小
          // if (file.size > MAX_FILE_SIZE) continue;
          if (totalSize + file.size > MAX_TOTAL_SIZE) continue;

          try {
            const { width, height } = await measureImageFile(file);
            if (importTokenRef.current !== token) return;

            if (
              width > MAX_SIDE ||
              height > MAX_SIDE ||
              width * height > MAX_PIXELS
            ) {
              continue;
            }
            if (totalPixels + width * height > MAX_BATCH_PIXELS) continue;

            const meta = await readObfuscationMetaFromFile(file);
            if (importTokenRef.current !== token) return;

            totalSize += file.size;
            totalPixels += width * height;
            if (width * height > LARGE_IMAGE_PIXELS) largeCount += 1;

            newItems.push({
              id: createItemId(),
              file,
              url: createUrl(file),
              name: file.name,
              size: file.size,
              width,
              height,
              meta,
              status: 'pending',
              progress: 0,
              stage: 'derive-key',
              result: null,
              errorKey: null,
              sizeNotice: null,
            });
          } catch {
            // 单张解码失败时跳过，不影响其余文件
          }
        }
      } finally {
        if (importTokenRef.current === token) {
          setIsImporting(false);
        }
      }

      if (importTokenRef.current !== token) {
        // 导入被取消/清空：释放尚未提交的预览地址
        newItems.forEach((item) => revokeUrl(item.url));
        return;
      }

      if (newItems.length === 0) {
        toast.error(t('image-obfuscator.import_failed'));
        return;
      }

      commitItems([...itemsRef.current, ...newItems]);
      setActiveId((prev) => prev ?? newItems[0].id);

      const skipped = files.length - newItems.length;
      if (skipped > 0) {
        toast.warning(
          t('image-obfuscator.import_summary', {
            added: newItems.length,
            skipped,
          })
        );
      }

      const metaCount = newItems.filter((item) => item.meta).length;
      if (metaCount > 0) {
        setMode('deobfuscate');
        toast.info(
          t('image-obfuscator.import_meta_notice', { count: metaCount })
        );
      }

      if (largeCount > 0) {
        toast.warning(t('image-obfuscator.large_warning'));
      }
    },
    [commitItems, createUrl, isBatchRunning, revokeUrl, t]
  );

  /** 让 URL / 图库载入流程总是调用最新的导入逻辑 */
  const importRef = useRef(handleImport);
  useEffect(() => {
    importRef.current = handleImport;
  }, [handleImport]);

  const handledUrlRef = useRef<string | null>(null);
  /** 缓存同一 URL 的下载任务，避免开发模式下重复请求 */
  const urlLoadRef = useRef<{
    url: string;
    promise: Promise<File | null>;
  } | null>(null);

  useEffect(() => {
    if (initialUrls.length === 0) return;
    const key = initialUrls.join('|');
    if (handledUrlRef.current === key) return;
    handledUrlRef.current = key;

    const load = (url: string): Promise<File | null> => {
      if (urlLoadRef.current?.url === url) {
        return urlLoadRef.current.promise;
      }
      const promise = loadImageFileFromUrl(url);
      urlLoadRef.current = { url, promise };
      return promise;
    };

    void (async () => {
      const files: File[] = [];
      let hasExternal = false;
      let hasFailed = false;

      for (const raw of initialUrls) {
        const resolved = resolveSameSiteImageUrl(raw);
        if (!resolved) {
          hasExternal = true;
          continue;
        }

        const file = await load(resolved.url);
        if (file) files.push(file);
        else hasFailed = true;
      }

      if (hasExternal) {
        toast.error(t('image-obfuscator.url_external'));
        router.replace(window.location.pathname);
      }
      if (hasFailed) {
        toast.error(t('image-obfuscator.url_failed'));
      }
      if (files.length === 0) {
        if (hasExternal) router.replace(window.location.pathname);
        return;
      }

      setMode('deobfuscate');
      await importRef.current(files);
    })();
  }, [initialUrls, router, t]);

  /** 从混淆图库选中多张图：下载后按统一流程解析元数据 */
  const handlePickFromGallery = useCallback(
    async (sources: string[]) => {
      setPickerOpen(false);

      const files: File[] = [];
      let hasExternal = false;
      let hasFailed = false;

      for (const src of sources) {
        if (!resolveSameSiteImageUrl(src)) {
          hasExternal = true;
          continue;
        }

        const file = await loadImageFileFromUrl(src);
        if (file) files.push(file);
        else hasFailed = true;
      }

      if (hasExternal) {
        toast.error(t('image-obfuscator.url_external'));
      }
      if (hasFailed || files.length === 0) {
        toast.error(t('image-obfuscator.url_failed'));
      }
      if (files.length === 0) return;

      setMode('deobfuscate');
      await importRef.current(files);
    },
    [t]
  );

  /**
   * 串行处理给定列表项：一张完成后才处理下一张，内存峰值只与单图有关。
   */
  const runQueue = useCallback(
    async (targetIds: string[]) => {
      if (targetIds.length === 0) return;

      const token = batchTokenRef.current + 1;
      batchTokenRef.current = token;
      setIsBatchRunning(true);
      setLocalErrorKey(null);
      setBatchStage('derive-key');

      const targetSet = new Set(targetIds);

      // 重新处理的条目先清空旧结果，保持“进度 = 已完成/总数”的一致性
      for (const item of itemsRef.current) {
        if (targetSet.has(item.id) && item.result) {
          revokeUrl(item.result.url);
        }
      }
      const prepared = itemsRef.current.map((item) =>
        targetSet.has(item.id)
          ? {
              ...item,
              status: 'pending' as const,
              progress: 0,
              stage: 'derive-key' as const,
              result: null,
              errorKey: null,
              sizeNotice: null,
            }
          : item
      );
      commitItems(prepared);

      const total = prepared.length;
      let completed = prepared.filter((item) => item.status === 'done').length;
      let failed = 0;
      let alphaCount = 0;

      setBatchProgress(total === 0 ? 0 : completed / total);

      const resolveSettings = (item: ImageItem): ProcessingSettings => ({
        // 带有元数据的图片一律走还原，其余跟随全局模式
        mode: item.meta ? 'deobfuscate' : mode,
        password,
        strength: item.meta?.strength ?? strength,
        enhancement:
          item.meta?.enhancement ?? (greenBoost ? 'green-boost' : 'none'),
        format: item.meta?.format ?? format,
        quality: item.meta?.quality ?? quality,
      });

      try {
        for (const id of targetIds) {
          if (batchTokenRef.current !== token) break;

          const item = itemsRef.current.find((entry) => entry.id === id);
          if (!item) continue;

          const settings = resolveSettings(item);
          patchItem(id, {
            status: 'running',
            progress: 0,
            stage: 'derive-key',
            errorKey: null,
            sizeNotice: null,
          });
          setBatchStage('derive-key');

          try {
            const processed = await processImageFile(
              item.file,
              settings,
              (input) =>
                run(input, {
                  onProgress: (nextStage, ratio) => {
                    if (batchTokenRef.current !== token) return;
                    const progress = Math.min(1, Math.max(0, ratio));
                    patchItem(id, { stage: nextStage, progress });
                    setBatchStage(nextStage);
                    setBatchProgress(
                      total === 0 ? 0 : (completed + progress) / total
                    );
                  },
                })
            );

            if (batchTokenRef.current !== token) break;

            const resultUrl = createUrl(processed.blob);
            if (batchTokenRef.current !== token) {
              revokeUrl(resultUrl);
              break;
            }

            const result: ResultImage = { ...processed, url: resultUrl };
            const rawBytes = processed.width * processed.height * 4;
            const notice =
              settings.mode === 'obfuscate' &&
              settings.format === 'png' &&
              rawBytes > 4 * 1024 * 1024 &&
              processed.blob.size > Math.max(rawBytes * 0.5, item.size * 2)
                ? t('image-obfuscator.size_hint')
                    .replace('{actual}', formatSize(processed.blob.size))
                    .replace('{raw}', formatSize(rawBytes))
                : null;

            patchItem(id, {
              status: 'done',
              progress: 1,
              stage: 'done',
              result,
              sizeNotice: notice,
              errorKey: null,
            });

            if (processed.hadAlpha) alphaCount += 1;
          } catch (cause) {
            if (batchTokenRef.current !== token) break;

            const code = (cause as JobFailure | undefined)?.code;
            if (code === 'ABORTED') break;

            patchItem(id, {
              status: 'error',
              progress: 0,
              errorKey: code
                ? (ERROR_KEYS[code] ?? 'image-obfuscator.error_process')
                : 'image-obfuscator.error_process',
            });
            failed += 1;
          }

          completed += 1;
          setBatchProgress(total === 0 ? 0 : completed / total);
        }
      } finally {
        if (batchTokenRef.current === token) {
          setIsBatchRunning(false);
          setBatchProgress(total === 0 ? 0 : completed / total);
        }
      }

      if (batchTokenRef.current !== token) return;

      if (alphaCount > 0) {
        toast.warning(t('image-obfuscator.alpha_removed'));
      }
      if (failed > 0) {
        toast.warning(
          t('image-obfuscator.batch_summary', {
            done: completed - failed,
            failed,
          })
        );
      }

      if (window.innerWidth < 640) {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    [
      commitItems,
      createUrl,
      format,
      greenBoost,
      mode,
      password,
      patchItem,
      quality,
      revokeUrl,
      run,
      strength,
      t,
    ]
  );

  const handleRunAll = useCallback(() => {
    void runQueue(itemsRef.current.map((item) => item.id));
  }, [runQueue]);

  const handleRetryFailed = useCallback(() => {
    void runQueue(
      itemsRef.current
        .filter((item) => item.status === 'error')
        .map((item) => item.id)
    );
  }, [runQueue]);

  const handleCancel = useCallback(() => {
    batchTokenRef.current += 1;
    importTokenRef.current += 1;
    cancel();

    const hasRunning = itemsRef.current.some(
      (item) => item.status === 'running'
    );
    if (hasRunning) {
      commitItems(
        itemsRef.current.map((item) =>
          item.status === 'running'
            ? { ...item, status: 'pending', progress: 0 }
            : item
        )
      );
    }

    setIsBatchRunning(false);
    setIsImporting(false);

    const total = itemsRef.current.length;
    if (total > 0) {
      setBatchProgress(
        itemsRef.current.filter((item) => item.status === 'done').length / total
      );
    }

    toast.info(t('image-obfuscator.batch_cancelled'));
  }, [cancel, commitItems, t]);

  const handleRemoveItem = useCallback(
    (id: string) => {
      const item = itemsRef.current.find((entry) => entry.id === id);
      if (!item) return;

      revokeUrl(item.url);
      if (item.result) revokeUrl(item.result.url);

      const next = itemsRef.current.filter((entry) => entry.id !== id);
      commitItems(next);
      setActiveId((prev) => {
        if (prev !== id) return prev;
        return next[0]?.id ?? null;
      });

      if (next.length === 0) {
        resetJob();
        setBatchProgress(0);
      } else {
        const done = next.filter((entry) => entry.status === 'done').length;
        setBatchProgress(done / next.length);
      }
    },
    [commitItems, resetJob, revokeUrl]
  );

  const handleDownloadItem = useCallback((id: string) => {
    const item = itemsRef.current.find((entry) => entry.id === id);
    if (!item?.result) return;

    const extension = item.result.format === 'png' ? 'png' : 'jpg';
    const baseName = item.name.replace(/\.[^.]+$/, '') || 'image';
    const suffix = item.result.mode === 'obfuscate' ? 'obfuscated' : 'restored';

    const link = document.createElement('a');
    link.href = item.result.url;
    link.download = `${baseName}-${suffix}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, []);

  const handleDownloadAll = useCallback(async () => {
    if (isZipping) return;

    const results = itemsRef.current.filter((item) => item.result);
    if (results.length === 0) return;

    setIsZipping(true);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const usedNames = new Set<string>();

      for (const item of results) {
        const result = item.result;
        if (!result) continue;

        const extension = result.format === 'png' ? 'png' : 'jpg';
        const baseName = item.name.replace(/\.[^.]+$/, '') || 'image';
        const suffix = result.mode === 'obfuscate' ? 'obfuscated' : 'restored';

        let fileName = `${baseName}-${suffix}.${extension}`;
        let duplicate = 2;
        while (usedNames.has(fileName)) {
          fileName = `${baseName}-${suffix}-${duplicate}.${extension}`;
          duplicate += 1;
        }
        usedNames.add(fileName);

        zip.file(fileName, result.blob);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `image-obfuscator-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch {
      toast.error(t('image-obfuscator.zip_failed'));
    } finally {
      setIsZipping(false);
    }
  }, [isZipping, t]);

  const handleClearAll = useCallback(() => {
    batchTokenRef.current += 1;
    importTokenRef.current += 1;
    cancel();
    resetJob();

    for (const item of itemsRef.current) {
      revokeUrl(item.url);
      if (item.result) revokeUrl(item.result.url);
    }

    commitItems([]);
    setActiveId(null);
    setMode('obfuscate');
    setPassword('');
    setStrength(1);
    setGreenBoost(false);
    setFormat('png');
    setQuality(0.85);
    setLocalErrorKey(null);
    setIsBatchRunning(false);
    setIsImporting(false);
    setBatchProgress(0);
    setBatchStage('derive-key');
  }, [cancel, commitItems, resetJob, revokeUrl]);

  const activeItem = items.find((item) => item.id === activeId) ?? null;
  const isBusy = isImporting || isBatchRunning;

  const counts = {
    total: items.length,
    done: items.filter((item) => item.status === 'done').length,
    failed: items.filter((item) => item.status === 'error').length,
  };

  const panelStatus = isBusy ? 'running' : status;
  const errorMessage = localErrorKey
    ? t(localErrorKey)
    : error
      ? t(ERROR_KEYS[error.code] ?? 'image-obfuscator.error_process')
      : null;

  const sourceMeta = activeItem
    ? `${activeItem.width}×${activeItem.height} · ${formatSize(activeItem.size)}`
    : undefined;

  const resultMeta = activeItem?.result
    ? `${activeItem.result.width}×${activeItem.result.height} · ${activeItem.result.format.toUpperCase()} · ${formatSize(activeItem.result.blob.size)}`
    : undefined;

  return (
    <div className="min-h-screen">
      <div className="border-border border-b">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-xl">
              <Shuffle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {t('image-obfuscator.title')}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {t('image-obfuscator.subtitle')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <div className="flex justify-end">
              <Button
                disabled={isBusy}
                onClick={() => setPickerOpen(true)}
                type="button"
              >
                <Images className="h-3.5 w-3.5" />
                {t('image-obfuscator.gallery_open')}
              </Button>
            </div>

            <UploadDropzone
              count={items.length}
              disabled={isBusy}
              onSelect={handleImport}
            />

            <ImageList
              items={items}
              activeId={activeId}
              disabled={isBusy}
              onSelect={setActiveId}
              onRemove={handleRemoveItem}
              onDownload={handleDownloadItem}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <PreviewCard
                title={t('image-obfuscator.original')}
                src={activeItem?.url ?? null}
                emptyText={t('image-obfuscator.original_empty')}
                meta={sourceMeta}
              />
              <PreviewCard
                ref={resultRef}
                title={t('image-obfuscator.result')}
                src={activeItem?.result?.url ?? null}
                emptyText={t('image-obfuscator.result_empty')}
                meta={resultMeta}
                busy={activeItem?.status === 'running'}
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <ControlPanel
              mode={mode}
              onModeChange={(next) => {
                setMode(next);
                setLocalErrorKey(null);
              }}
              password={password}
              onPasswordChange={setPassword}
              strength={strength}
              onStrengthChange={setStrength}
              greenBoost={greenBoost}
              onGreenBoostChange={setGreenBoost}
              format={format}
              onFormatChange={setFormat}
              quality={quality}
              onQualityChange={setQuality}
              status={panelStatus}
              progress={batchProgress}
              stage={batchStage}
              errorMessage={errorMessage}
              metaNotice={activeItem?.meta ?? null}
              sizeNotice={activeItem?.sizeNotice ?? null}
              counts={counts}
              isDownloading={isZipping}
              canRun={items.length > 0}
              canDownloadAll={counts.done > 0}
              onRun={handleRunAll}
              onCancel={handleCancel}
              onRetryFailed={handleRetryFailed}
              onDownloadAll={handleDownloadAll}
              onReset={handleClearAll}
            />
          </div>
        </div>
      </div>

      <GalleryPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={handlePickFromGallery}
      />
    </div>
  );
}
