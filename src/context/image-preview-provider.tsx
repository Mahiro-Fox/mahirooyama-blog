'use client';

import {
  ChevronLeft,
  ChevronRight,
  Download,
  FlipHorizontal,
  FlipVertical,
  Loader2,
  Maximize2,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/* -------------------------------- 常量 / 类型 -------------------------------- */

const MIN_SCALE = 0.1;
const MAX_SCALE = 10;
const ZOOM_STEP = 1.25;
const CLICK_SLOP = 6; // 判定为「点击」的最大移动距离(px)

interface Point {
  x: number;
  y: number;
}

interface ViewState {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  flipX: boolean;
  flipY: boolean;
}

const DEFAULT_VIEW: ViewState = {
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
  flipX: false,
  flipY: false,
};

type Gesture =
  | {
      type: 'pan';
      startX: number;
      startY: number;
      startTx: number;
      startTy: number;
    }
  | {
      type: 'pinch';
      startDist: number;
      startScale: number;
      startTx: number;
      startTy: number;
      startMid: Point;
    };

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/* --------------------------------- Context -------------------------------- */

export interface ImagePreviewContextValue {
  /** 打开预览：可传单张或数组，index 为初始下标 */
  open: (images: Image[], index?: number) => void;
  close: () => void;
  isOpen: boolean;
}

const ImagePreviewContext = createContext<ImagePreviewContextValue | null>(
  null
);
export type Image = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

export function useImagePreview(): ImagePreviewContextValue {
  const ctx = useContext(ImagePreviewContext);
  if (!ctx) {
    throw new Error('useImagePreview 必须在 <ImagePreviewProvider> 内部使用');
  }
  return ctx;
}

/* -------------------------------- Provider -------------------------------- */

export interface ImagePreviewProviderProps {
  children?: ReactNode;
}

export function ImagePreviewProvider({ children }: ImagePreviewProviderProps) {
  const [images, setImages] = useState<Image[]>([]);
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback((images: Image[], index?: number) => {
    if (images.length === 0) return;
    setImages(images);
    setIndex(index || 0);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<ImagePreviewContextValue>(
    () => ({ open, close, isOpen }),
    [open, close, isOpen]
  );

  return (
    <ImagePreviewContext.Provider value={value}>
      {children}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <PreviewOverlay
            images={images}
            index={index}
            onIndexChange={setIndex}
            onClose={close}
          />,
          document.body
        )}
    </ImagePreviewContext.Provider>
  );
}

export default ImagePreviewProvider;

/* -------------------------------- Overlay -------------------------------- */

interface PreviewOverlayProps {
  images: Image[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

function PreviewOverlay({
  images,
  index,
  onIndexChange,
  onClose,
}: PreviewOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<ViewState>(DEFAULT_VIEW);
  const viewRef = useRef<ViewState>(DEFAULT_VIEW);

  const [animate, setAnimate] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [dragging, setDragging] = useState(false);

  const pointersRef = useRef<Map<number, Point>>(new Map());
  const gestureRef = useRef<Gesture | null>(null);
  const movedRef = useRef(0);
  const lastPointRef = useRef<Point | null>(null);
  const downTargetRef = useRef<Element | null>(null);

  // 给原生事件监听器提供最新数据
  const latestRef = useRef({ images, index, onIndexChange, onClose });
  useEffect(() => {
    latestRef.current = { images, index, onIndexChange, onClose };
  }, [images, index, onIndexChange, onClose]);

  /* ------------------------------ 视图更新工具 ------------------------------ */

  const patchView = useCallback(
    (patch: Partial<ViewState> | ((v: ViewState) => Partial<ViewState>)) => {
      const prev = viewRef.current;
      const next = {
        ...prev,
        ...(typeof patch === 'function' ? patch(prev) : patch),
      };
      viewRef.current = next;
      setView(next);
    },
    []
  );

  /** 以 anchor(相对容器中心的坐标) 为锚点缩放到 targetScale */
  const applyZoom = useCallback(
    (targetScale: number, anchor: Point = { x: 0, y: 0 }) => {
      const prev = viewRef.current;
      const scale = clamp(targetScale, MIN_SCALE, MAX_SCALE);
      if (Math.abs(scale - prev.scale) < 1e-4) return;
      const k = scale / prev.scale;
      patchView({
        scale,
        x: anchor.x - k * (anchor.x - prev.x),
        y: anchor.y - k * (anchor.y - prev.y),
      });
    },
    [patchView]
  );

  const resetView = useCallback(() => {
    viewRef.current = DEFAULT_VIEW;
    setView(DEFAULT_VIEW);
    setAnimate(true);
  }, []);

  /* ------------------------------ 副作用：切图 / 键盘 / 滚动锁 ------------------------------ */

  useEffect(() => {
    viewRef.current = DEFAULT_VIEW;
    setView(DEFAULT_VIEW);
    setLoaded(false);
    setAnimate(false);
  }, [index]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const {
        images: imgs,
        index: idx,
        onIndexChange: change,
        onClose: close,
      } = latestRef.current;

      switch (e.key) {
        case 'Escape':
          close();
          break;
        case 'ArrowLeft':
          if (imgs.length > 1) change((idx - 1 + imgs.length) % imgs.length);
          break;
        case 'ArrowRight':
          if (imgs.length > 1) change((idx + 1) % imgs.length);
          break;
        case '+':
        case '=':
          setAnimate(true);
          applyZoom(viewRef.current.scale * ZOOM_STEP);
          break;
        case '-':
        case '_':
          setAnimate(true);
          applyZoom(viewRef.current.scale / ZOOM_STEP);
          break;
        case '0':
          resetView();
          break;
        default:
          return;
      }
      e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [applyZoom, resetView]);

  /* ------------------------------ 手势（原生监听） ------------------------------ */

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const getCenter = (): Point => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      const pointers = pointersRef.current;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1) {
        downTargetRef.current = e.target as Element;
        movedRef.current = 0;
        lastPointRef.current = { x: e.clientX, y: e.clientY };
        gestureRef.current = {
          type: 'pan',
          startX: e.clientX,
          startY: e.clientY,
          startTx: viewRef.current.x,
          startTy: viewRef.current.y,
        };
        setAnimate(false);
        setDragging(true);
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const center = getCenter();
        gestureRef.current = {
          type: 'pinch',
          startDist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          startScale: viewRef.current.scale,
          startTx: viewRef.current.x,
          startTy: viewRef.current.y,
          startMid: {
            x: (a.x + b.x) / 2 - center.x,
            y: (a.y + b.y) / 2 - center.y,
          },
        };
        setAnimate(false);
        setDragging(true);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const pointers = pointersRef.current;
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (lastPointRef.current) {
        movedRef.current += Math.hypot(
          e.clientX - lastPointRef.current.x,
          e.clientY - lastPointRef.current.y
        );
      }
      lastPointRef.current = { x: e.clientX, y: e.clientY };

      const g = gestureRef.current;
      if (!g) return;

      if (g.type === 'pan' && pointers.size === 1) {
        patchView({
          x: g.startTx + (e.clientX - g.startX),
          y: g.startTy + (e.clientY - g.startY),
        });
        return;
      }

      if (g.type === 'pinch' && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const center = getCenter();
        const mid = {
          x: (a.x + b.x) / 2 - center.x,
          y: (a.y + b.y) / 2 - center.y,
        };
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const scale = clamp(
          (g.startScale * dist) / g.startDist,
          MIN_SCALE,
          MAX_SCALE
        );
        const k = scale / g.startScale;
        patchView({
          scale,
          x: mid.x - k * (g.startMid.x - g.startTx),
          y: mid.y - k * (g.startMid.y - g.startTy),
        });
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const pointers = pointersRef.current;
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);

      if (pointers.size === 0) {
        gestureRef.current = null;
        lastPointRef.current = null;
        setDragging(false);

        const target = downTargetRef.current;
        const isBlank = !target?.closest(
          '[data-preview-image], [data-preview-ui]'
        );
        if (isBlank && movedRef.current < CLICK_SLOP) {
          latestRef.current.onClose();
        }
        return;
      }

      // 双指松开一根 → 回到单指拖拽
      if (pointers.size === 1) {
        const p = [...pointers.values()][0];
        gestureRef.current = {
          type: 'pan',
          startX: p.x,
          startY: p.y,
          startTx: viewRef.current.x,
          startTy: viewRef.current.y,
        };
        lastPointRef.current = p;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const center = getCenter();
      const anchor = { x: e.clientX - center.x, y: e.clientY - center.y };

      const rawDelta =
        e.deltaMode === 1
          ? e.deltaY * 16
          : e.deltaMode === 2
            ? e.deltaY * 100
            : e.deltaY;
      // 触控板捏合通常带 ctrlKey，给一个更灵敏的系数
      const intensity = e.ctrlKey ? 0.01 : 0.002;
      const factor = Math.exp(-rawDelta * intensity);

      setAnimate(false);
      applyZoom(viewRef.current.scale * factor, anchor);
    };

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, [applyZoom, patchView]);

  /* --------------------------------- 操作 --------------------------------- */

  const zoomIn = () => {
    setAnimate(true);
    applyZoom(viewRef.current.scale * ZOOM_STEP);
  };

  const zoomOut = () => {
    setAnimate(true);
    applyZoom(viewRef.current.scale / ZOOM_STEP);
  };

  const rotate = () => {
    setAnimate(true);
    patchView((v) => ({ rotate: v.rotate + 90 }));
  };

  const toggleFlipX = () => patchView((v) => ({ flipX: !v.flipX }));
  const toggleFlipY = () => patchView((v) => ({ flipY: !v.flipY }));

  const goTo = (target: number) => {
    const total = latestRef.current.images.length;
    if (total <= 1) return;
    latestRef.current.onIndexChange(((target % total) + total) % total);
  };

  const handleDownload = useCallback(async () => {
    const { images: imgs, index: idx } = latestRef.current;
    const image = imgs[idx];
    if (!image) return;
    const { src } = image;

    const fallbackName = `image-${Date.now()}.png`;
    const name = decodeURIComponent(src || '') || fallbackName;

    const triggerDownload = (href: string, filename: string, blank = false) => {
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      if (blank) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    try {
      const res = await fetch(src || '', { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      triggerDownload(url, name);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      // 跨域等原因 fetch 失败时退化为直接下载 / 新窗口打开
      triggerDownload(src || '', name, true);
    }
  }, []);

  /* --------------------------------- 渲染 --------------------------------- */

  const current = images[index];

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      className="fixed inset-0 z-[9999] overflow-hidden bg-black/90 backdrop-blur-sm select-none"
      style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
    >
      {/* 图片 */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 pt-16 pb-28">
        {current && (
          <Image
            key={current.src}
            src={current.src}
            alt=""
            draggable={false}
            data-preview-image
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            className="pointer-events-auto max-h-full max-w-full object-contain will-change-transform"
            style={{
              transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale}) rotate(${view.rotate}deg) scaleX(${
                view.flipX ? -1 : 1
              }) scaleY(${view.flipY ? -1 : 1})`,
              transition: animate
                ? 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)'
                : 'none',
              opacity: loaded ? 1 : 0,
              // userDrag: 'none',
            }}
          />
        )}
      </div>

      {/* 加载中 */}
      {!loaded && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      )}

      {/* 序号 */}
      {images.length > 1 && (
        <div
          data-preview-ui
          className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white/80 tabular-nums backdrop-blur"
        >
          {index + 1} / {images.length}
        </div>
      )}

      {/* 右上角关闭 */}
      <button
        type="button"
        data-preview-ui
        onClick={onClose}
        aria-label="关闭"
        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur transition-colors hover:bg-white/15 hover:text-white"
      >
        <X size={20} />
      </button>

      {/* 上一张 / 下一张 */}
      {images.length > 1 && (
        <>
          <NavButton side="left" onClick={() => goTo(index - 1)} />
          <NavButton side="right" onClick={() => goTo(index + 1)} />
        </>
      )}

      {/* 底部操作栏 */}
      <div
        data-preview-ui
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-black/60 px-2 py-2 text-white shadow-2xl backdrop-blur-md"
      >
        <ToolButton label="缩小" onClick={zoomOut}>
          <ZoomOut size={18} />
        </ToolButton>

        <button
          type="button"
          onClick={resetView}
          title="重置视图"
          aria-label="重置视图"
          className="min-w-[58px] rounded-full px-2 py-1.5 text-xs font-medium text-white/80 tabular-nums transition-colors hover:bg-white/15 hover:text-white"
        >
          {Math.round(view.scale * 100)}%
        </button>

        <ToolButton label="放大" onClick={zoomIn}>
          <ZoomIn size={18} />
        </ToolButton>

        <Divider />

        <ToolButton label="顺时针旋转 90°" onClick={rotate}>
          <RotateCw size={18} />
        </ToolButton>
        <ToolButton label="水平翻转" onClick={toggleFlipX} active={view.flipX}>
          <FlipHorizontal size={18} />
        </ToolButton>
        <ToolButton label="垂直翻转" onClick={toggleFlipY} active={view.flipY}>
          <FlipVertical size={18} />
        </ToolButton>
        <ToolButton label="适应屏幕" onClick={resetView}>
          <Maximize2 size={18} />
        </ToolButton>

        <Divider />

        <ToolButton label="下载" onClick={handleDownload}>
          <Download size={18} />
        </ToolButton>
        <ToolButton label="关闭" onClick={onClose}>
          <X size={18} />
        </ToolButton>
      </div>
    </div>
  );
}

/* -------------------------------- 小组件 -------------------------------- */

function ToolButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
        active
          ? 'bg-white/20 text-white'
          : 'text-white/80 hover:bg-white/15 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-white/15" />;
}

function NavButton({
  side,
  onClick,
}: {
  side: 'left' | 'right';
  onClick: () => void;
}) {
  const isLeft = side === 'left';
  return (
    <button
      type="button"
      data-preview-ui
      onClick={onClick}
      aria-label={isLeft ? '上一张' : '下一张'}
      className={`absolute top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur transition-colors hover:bg-white/15 hover:text-white ${
        isLeft ? 'left-4' : 'right-4'
      }`}
    >
      {isLeft ? <ChevronLeft size={26} /> : <ChevronRight size={26} />}
    </button>
  );
}
