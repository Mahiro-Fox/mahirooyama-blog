'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Download, X, ZoomIn, ZoomOut } from 'lucide-react';

import { cn } from '@/lib/utils';

interface PreviewImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

interface ImagePreviewContextValue {
  openPreview: (image: PreviewImage) => void;
  closePreview: () => void;
  isOpen: boolean;
}

const ImagePreviewContext = createContext<ImagePreviewContextValue | null>(
  null
);

export function useImagePreview() {
  const context = useContext(ImagePreviewContext);
  if (!context) {
    throw new Error('useImagePreview must be used within ImagePreviewProvider');
  }
  return context;
}

interface ImagePreviewProviderProps {
  children: React.ReactNode;
}

export function ImagePreviewProvider({ children }: ImagePreviewProviderProps) {
  const initScale = 0.75;
  const [isOpen, setIsOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<PreviewImage | null>(null);
  const [scale, setScale] = useState(initScale);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const openPreview = useCallback((image: PreviewImage) => {
    setCurrentImage(image);
    setIsOpen(true);
    setScale(initScale);
    setPosition({ x: 0, y: 0 });
  }, []);

  const closePreview = useCallback(() => {
    setIsOpen(false);
    setScale(initScale);
    setPosition({ x: 0, y: 0 });
    // 延迟清空图片，等动画结束
    setTimeout(() => setCurrentImage(null), 300);
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.5, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((s) => Math.max(s - 0.5, 0.5));
  }, []);

  const handleReset = useCallback(() => {
    setScale(initScale);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale > 1) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      }
    },
    [scale, position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && scale > 1) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart, scale]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 使用原生事件监听阻止页面滚轮
  useEffect(() => {
    if (!isOpen) return;

    const handleNativeWheel = (e: WheelEvent) => {
      // 阻止所有滚轮事件冒泡到页面
      e.preventDefault();
      e.stopPropagation();

      // 应用缩放逻辑
      if (e.deltaY < 0) {
        setScale((s) => Math.min(s + 0.25, 4));
      } else {
        setScale((s) => Math.max(s - 0.25, 0.5));
      }
    };

    // 在 document 级别捕获所有 wheel 事件
    document.addEventListener('wheel', handleNativeWheel, {
      passive: false,
      capture: true,
    });

    // 锁定 body 滚动
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('wheel', handleNativeWheel, {
        capture: true,
      });
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  return (
    <ImagePreviewContext.Provider value={{ openPreview, closePreview, isOpen }}>
      {children}

      {/* 单例预览组件 - 全局唯一 */}
      {isOpen && currentImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={closePreview}
        >
          {/* 蒙层背景 */}
          <div className="animate-in fade-in absolute inset-0 bg-black/90 backdrop-blur-sm duration-200" />

          {/* 顶部工具栏 */}
          <div className="animate-in slide-in-from-top absolute top-0 right-0 left-0 z-10 flex items-center justify-between p-4 duration-200">
            <div className="flex items-center gap-2">
              <span className="max-w-[300px] truncate text-sm text-white/80">
                {currentImage.alt}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoomOut();
                }}
                className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                title="缩小"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="w-16 text-center text-sm text-white/60">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoomIn();
                }}
                className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                title="放大"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                title="重置"
              >
                <span className="text-xs font-medium">1:1</span>
              </button>
              <div className="mx-2 h-5 w-px bg-white/20" />
              <a
                href={currentImage.src}
                download
                onClick={(e) => e.stopPropagation()}
                className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                title="下载原图"
              >
                <Download className="h-5 w-5" />
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closePreview();
                }}
                className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                title="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* 图片容器 */}
          <div
            className={cn(
              'relative z-0 max-h-[90vh] max-w-[95vw] overflow-hidden',
              scale > 1 && 'cursor-grab',
              isDragging && 'cursor-grabbing'
            )}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImage.src}
              alt={currentImage.alt}
              className="animate-in zoom-in-95 max-h-[90vh] max-w-full object-contain duration-200 select-none"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out',
              }}
              draggable={false}
            />
          </div>

          {/* 底部提示 */}
          <div className="animate-in fade-in absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/40 duration-200">
            滚轮缩放 · 点击背景关闭
          </div>
        </div>
      )}
    </ImagePreviewContext.Provider>
  );
}
