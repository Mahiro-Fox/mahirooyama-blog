/**
 * 桌面端窗口装饰。
 * 提供顶部标题栏拖拽区域（通过 window.sonicDesktop 调用原生窗口移动）与最小化/最大化/关闭按钮。
 * 仅在桌面宿主环境（window.sonicDesktop.isDesktop）下渲染。
 */
import { Minus, Square, X } from 'lucide-react';
import React, { useRef } from 'react';
import { t, useLanguage } from '../../../lib/i18n/i18n';

/** 桌面端标题栏拖拽区域：按住可拖动原生窗口（非桌面环境返回 null）。 */
export function DesktopTitleDragRegion() {
  const _lang3 = useLanguage();
  const isDraggingWindow = useRef(false);
  const dragFrame = useRef<number | null>(null);

  const pointFromEvent = (
    event: React.PointerEvent<HTMLDivElement> | PointerEvent
  ) => ({
    screenX: event.screenX,
    screenY: event.screenY,
  });

  const endDrag = () => {
    if (!isDraggingWindow.current) return;
    isDraggingWindow.current = false;
    if (dragFrame.current != null) {
      window.cancelAnimationFrame(dragFrame.current);
      dragFrame.current = null;
    }
    window.sonicDesktop?.endWindowDrag();
    window.removeEventListener('pointermove', handleWindowPointerMove);
    window.removeEventListener('pointerup', handleWindowPointerUp);
    window.removeEventListener('blur', endDrag);
  };

  const handleWindowPointerMove = (event: PointerEvent) => {
    if (!isDraggingWindow.current) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    if (dragFrame.current != null)
      window.cancelAnimationFrame(dragFrame.current);
    dragFrame.current = window.requestAnimationFrame(() => {
      window.sonicDesktop?.moveWindowDrag(point);
      dragFrame.current = null;
    });
  };

  const handleWindowPointerUp = () => {
    endDrag();
  };

  const startDrag = async (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    isDraggingWindow.current = true;
    window.sonicDesktop?.startWindowDrag(pointFromEvent(event));
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('blur', endDrag);
  };

  if (!window.sonicDesktop?.isDesktop) return null;

  return (
    <div
      className="desktop-no-drag pointer-events-auto absolute inset-x-0 top-0 z-[20] h-12 cursor-default"
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.001)' }}
      onPointerDown={startDrag}
      aria-hidden="true"
    />
  );
}

/** 桌面端窗口控制按钮组（最小化 / 最大化 / 关闭），悬停时淡入显示。 */
export function DesktopWindowControls() {
  const lang = useLanguage();
  if (!window.sonicDesktop?.isDesktop) return null;

  return (
    <div className="desktop-no-drag group/window-controls pointer-events-auto absolute top-0 right-0 z-[300] flex h-16 w-44 items-start justify-end pt-4 pr-5">
      <div className="flex translate-y-[-2px] items-center gap-2 opacity-0 transition-all duration-200 ease-out group-hover/window-controls:translate-y-0 group-hover/window-controls:opacity-100">
        <button
          type="button"
          onClick={() => window.sonicDesktop?.minimize()}
          className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/35 text-white/55 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md hover:text-white"
          title={t('ui.text.103', lang)}
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          onClick={() => window.sonicDesktop?.toggleMaximize()}
          className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/35 text-white/55 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md hover:text-white"
          title={t('ui.text.104', lang)}
        >
          <Square size={12} />
        </button>
        <button
          type="button"
          onClick={() => window.sonicDesktop?.close()}
          className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/35 text-white/55 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md hover:border-[#ef4444]/50 hover:text-[#ef4444]"
          title={t('ui.text.105', lang)}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
