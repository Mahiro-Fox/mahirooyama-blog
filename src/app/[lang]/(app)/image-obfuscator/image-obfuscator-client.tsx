'use client';

import { Lock, Shuffle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCallback, useEffect, useRef, useState } from 'react';
// import { MAX_FILE_SIZE } from '@/constant/file-upload';
import { useT } from '@/i18n/dictionary-provider';
import type { ObfuscationMeta } from '@/lib/image-obfuscator/metadata';
import {
  ALGORITHM_VERSION,
  LARGE_IMAGE_PIXELS,
  MAX_PIXELS,
  MAX_SIDE,
  type ObfuscationMode,
} from '@/lib/image-obfuscator/types';
import { formatSize } from '@/utils/utils';
import ControlPanel from './_components/control-panel';
import PreviewCard from './_components/preview-card';
import UploadDropzone from './_components/upload-dropzone';
import {
  useObfuscationJob,
  type JobFailure,
} from './_hooks/use-obfuscation-job';
import {
  attachObfuscationMeta,
  decodeImageFile,
  encodeImageData,
  measureImageFile,
  readObfuscationMetaFromFile,
  type OutputFormat,
} from './_lib/image-codec';
import type { ResultImage, SourceImage } from './_lib/types';

const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

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

interface ImageObfuscatorClientProps {
  /** 通过 ?url= 传入的本站图片地址，载入后自动进入还原模式 */
  initialUrl?: string;
}

export default function ImageObfuscatorClient({
  initialUrl,
}: ImageObfuscatorClientProps) {
  const t = useT();
  const router = useRouter();
  const {
    status,
    progress,
    stage,
    error,
    run,
    cancel,
    reset: resetJob,
  } = useObfuscationJob();
  const resultRef = useRef<HTMLDivElement>(null);

  const [source, setSource] = useState<SourceImage | null>(null);
  const [result, setResult] = useState<ResultImage | null>(null);
  const [mode, setMode] = useState<ObfuscationMode>('obfuscate');
  const [password, setPassword] = useState('');
  const [strength, setStrength] = useState(1);
  const [greenBoost, setGreenBoost] = useState(false);
  const [format, setFormat] = useState<OutputFormat>('png');
  const [quality, setQuality] = useState(0.85);
  const [localErrorKey, setLocalErrorKey] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  /** 从图片元数据中成功解析出的参数，用于在面板上提示 */
  const [parsedMeta, setParsedMeta] = useState<ObfuscationMeta | null>(null);
  /** 混淆输出的体积提示（PNG 打乱后难以压缩） */
  const [sizeNotice, setSizeNotice] = useState<string | null>(null);

  const urlsRef = useRef<Set<string>>(new Set());
  /** 操作令牌：切换文件/取消后，丢弃过期的异步结果 */
  const opTokenRef = useRef(0);

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

  const handleSelect = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.has(file.type)) {
        setLocalErrorKey('image-obfuscator.error_unsupported_type');
        return;
      }

      // if (file.size > MAX_FILE_SIZE) {
      //   setLocalErrorKey('image-obfuscator.error_too_large');
      //   return;
      // }

      setIsPreparing(true);
      setLocalErrorKey(null);
      setParsedMeta(null);
      setSizeNotice(null);

      const token = opTokenRef.current + 1;
      opTokenRef.current = token;

      try {
        const { width, height } = await measureImageFile(file);

        if (opTokenRef.current !== token) return;

        if (
          width > MAX_SIDE ||
          height > MAX_SIDE ||
          width * height > MAX_PIXELS
        ) {
          setLocalErrorKey('image-obfuscator.error_unsupported_size');
          return;
        }

        if (width * height > LARGE_IMAGE_PIXELS) {
          toast.warning(t('image-obfuscator.large_warning'));
        }

        const meta = await readObfuscationMetaFromFile(file);
        if (opTokenRef.current !== token) return;

        if (meta) {
          setStrength(meta.strength);
          setGreenBoost(meta.enhancement === 'green-boost');
          setFormat(meta.format);
          setQuality(meta.quality);
          setParsedMeta(meta);
          setMode('deobfuscate');
        }

        if (source) revokeUrl(source.url);
        if (result) revokeUrl(result.url);

        setSource({
          file,
          url: createUrl(file),
          name: file.name,
          size: file.size,
          width,
          height,
        });
        setResult(null);
        resetJob();
      } catch {
        if (opTokenRef.current === token) {
          setLocalErrorKey('image-obfuscator.error_decode');
        }
      } finally {
        if (opTokenRef.current === token) {
          setIsPreparing(false);
        }
      }
    },
    [createUrl, resetJob, result, revokeUrl, source, t]
  );

  /** 让 URL 载入流程总是调用最新的 handleSelect，避免依赖抖动 */
  const selectRef = useRef(handleSelect);
  useEffect(() => {
    selectRef.current = handleSelect;
  }, [handleSelect]);

  const handledUrlRef = useRef<string | null>(null);
  /** 缓存同一 URL 的下载任务，避免开发模式下重复请求 */
  const urlLoadRef = useRef<{
    url: string;
    promise: Promise<File | null>;
  } | null>(null);

  useEffect(() => {
    if (!initialUrl || handledUrlRef.current === initialUrl) return;
    handledUrlRef.current = initialUrl;

    const resolved = resolveSameSiteImageUrl(initialUrl);
    if (!resolved) {
      // setLocalErrorKey('image-obfuscator.url_external');
      alert(t('image-obfuscator.url_external'));
      // toast.error(t('image-obfuscator.url_external'));
      // 清除query参数
      router.replace(location.pathname);
      return;
    }

    const load = (): Promise<File | null> => {
      if (urlLoadRef.current?.url === resolved.url) {
        return urlLoadRef.current.promise;
      }

      const promise = (async () => {
        const response = await fetch(resolved.url);
        if (!response.ok) return null;

        const blob = await response.blob();
        const type = ACCEPTED_TYPES.has(blob.type)
          ? blob.type
          : resolved.mime || blob.type;

        return new File([blob], resolved.name, {
          type: type || 'application/octet-stream',
        });
      })().catch(() => null);

      urlLoadRef.current = { url: resolved.url, promise };
      return promise;
    };

    void load().then((file) => {
      if (handledUrlRef.current !== initialUrl) return;

      if (!file) {
        setLocalErrorKey('image-obfuscator.url_failed');
        toast.error(t('image-obfuscator.url_failed'));
        return;
      }

      setMode('deobfuscate');
      void selectRef.current(file);
    });
  }, [initialUrl, router, t]);

  const handleRemove = useCallback(() => {
    opTokenRef.current += 1;
    if (source) revokeUrl(source.url);
    if (result) revokeUrl(result.url);
    setSource(null);
    setResult(null);
    setLocalErrorKey(null);
    setIsPreparing(false);
    setParsedMeta(null);
    setSizeNotice(null);
    resetJob();
  }, [resetJob, result, revokeUrl, source]);

  const handleRun = useCallback(async () => {
    if (!source || isPreparing || status === 'running') return;

    setLocalErrorKey(null);
    setIsPreparing(true);

    const token = opTokenRef.current + 1;
    opTokenRef.current = token;

    try {
      const decoded = await decodeImageFile(source.file);
      if (opTokenRef.current !== token) return;

      const processed = await run({
        image: decoded,
        mode,
        password,
        strength,
        enhancement: greenBoost ? 'green-boost' : 'none',
      });
      if (opTokenRef.current !== token) return;

      const encoded = await encodeImageData(processed, format, quality);
      if (opTokenRef.current !== token) return;

      // 混淆结果写入参数元数据，便于之后直接还原
      const blob =
        mode === 'obfuscate'
          ? await attachObfuscationMeta(encoded.blob, {
              version: ALGORITHM_VERSION,
              strength,
              enhancement: greenBoost ? 'green-boost' : 'none',
              format,
              quality,
            })
          : encoded.blob;
      if (opTokenRef.current !== token) return;

      if (result) revokeUrl(result.url);

      setResult({
        url: createUrl(blob),
        blob,
        format,
        width: processed.width,
        height: processed.height,
        mode,
        hadAlpha: encoded.hadAlpha,
      });

      if (encoded.hadAlpha) {
        toast.warning(t('image-obfuscator.alpha_removed'));
      }

      // PNG 依赖相邻像素相似性压缩，打乱后体积会接近未压缩像素体积
      const rawBytes = processed.width * processed.height * 4;
      const shouldNotice =
        mode === 'obfuscate' &&
        format === 'png' &&
        rawBytes > 4 * 1024 * 1024 &&
        blob.size > Math.max(rawBytes * 0.5, (source?.size ?? 0) * 2);

      setSizeNotice(
        shouldNotice
          ? t('image-obfuscator.size_hint')
              .replace('{actual}', formatSize(blob.size))
              .replace('{raw}', formatSize(rawBytes))
          : null
      );
      // 如果是移动端，滚动到结果卡片
      if (resultRef.current && window.innerWidth < 640) {
        resultRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (cause) {
      const code = (cause as JobFailure | undefined)?.code;

      // 用户主动取消或 Worker 已上报错误时，不再重复提示
      if (opTokenRef.current === token && code !== 'ABORTED' && !code) {
        setLocalErrorKey('image-obfuscator.error_process');
      }
    } finally {
      if (opTokenRef.current === token) {
        setIsPreparing(false);
      }
    }
  }, [
    createUrl,
    format,
    greenBoost,
    isPreparing,
    mode,
    password,
    quality,
    result,
    revokeUrl,
    run,
    source,
    status,
    strength,
    t,
  ]);

  const handleCancel = useCallback(() => {
    opTokenRef.current += 1;
    cancel();
    setIsPreparing(false);
  }, [cancel]);

  const handleDownload = useCallback(() => {
    if (!result || !source) return;

    const extension = result.format === 'png' ? 'png' : 'jpg';
    const baseName = source.name.replace(/\.[^.]+$/, '') || 'image';
    const suffix = result.mode === 'obfuscate' ? 'obfuscated' : 'restored';

    const link = document.createElement('a');
    link.href = result.url;
    link.download = `${baseName}-${suffix}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [result, source]);

  const handleReset = useCallback(() => {
    opTokenRef.current += 1;
    cancel();
    resetJob();

    if (source) revokeUrl(source.url);
    if (result) revokeUrl(result.url);

    setSource(null);
    setResult(null);
    setMode('obfuscate');
    setPassword('');
    setStrength(1);
    setGreenBoost(false);
    setFormat('png');
    setQuality(0.85);
    setLocalErrorKey(null);
    setIsPreparing(false);
    setParsedMeta(null);
  }, [cancel, resetJob, result, revokeUrl, source]);

  const isBusy = isPreparing || status === 'running';
  const panelStatus = isBusy ? 'running' : status;
  const errorMessage = localErrorKey
    ? t(localErrorKey)
    : error
      ? t(ERROR_KEYS[error.code] ?? 'image-obfuscator.error_process')
      : null;

  const sourceMeta = source
    ? `${source.width}×${source.height} · ${formatSize(source.size)}`
    : undefined;

  const resultMeta = result
    ? `${result.width}×${result.height} · ${result.format.toUpperCase()} · ${formatSize(result.blob.size)}`
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
            <UploadDropzone
              source={source}
              disabled={isBusy}
              onSelect={handleSelect}
              onRemove={handleRemove}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <PreviewCard
                title={t('image-obfuscator.original')}
                src={source?.url ?? null}
                emptyText={t('image-obfuscator.original_empty')}
                meta={sourceMeta}
              />
              <PreviewCard
                ref={resultRef}
                title={t('image-obfuscator.result')}
                src={result?.url ?? null}
                emptyText={t('image-obfuscator.result_empty')}
                meta={resultMeta}
                busy={isBusy}
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <ControlPanel
              mode={mode}
              onModeChange={(next) => {
                setMode(next);
                setLocalErrorKey(null);
                setParsedMeta(null);
                setSizeNotice(null);
                resetJob();
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
              progress={progress}
              stage={stage}
              errorMessage={errorMessage}
              metaNotice={parsedMeta}
              sizeNotice={sizeNotice}
              canRun={Boolean(source)}
              canDownload={Boolean(result)}
              onRun={handleRun}
              onCancel={handleCancel}
              onDownload={handleDownload}
              onReset={handleReset}
            />
          </div>
        </div>

        <p className="text-muted-foreground mt-6 flex items-center gap-1.5 text-xs">
          <Lock className="h-3.5 w-3.5" />
          {t('image-obfuscator.privacy_notice')}
        </p>
      </div>
    </div>
  );
}
