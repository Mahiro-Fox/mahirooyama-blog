'use client';

import { useCallback, useRef } from 'react';
import { cn } from '@/utils/utils';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  /**
   * 光斑半径（px）
   * @default 500
   */
  spotlightSize?: number;
}

/**
 * 鼠标跟随光斑 — 卡片悬停时，以光标为中心的柔和径向光晕
 * 通过 CSS 变量更新光斑位置，避免每帧 React 重渲染
 */
export function SpotlightCard({
  children,
  className,
  spotlightSize = 500,
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--spotlight-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--spotlight-y', `${e.clientY - rect.top}px`);
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={cn('group/spotlight relative', className)}
    >
      {children}
      <div
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover/spotlight:opacity-100"
        style={{
          background: `radial-gradient(${spotlightSize}px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), color-mix(in srgb, var(--primary) 10%, transparent), transparent 60%)`,
        }}
        aria-hidden="true"
      />
    </div>
  );
}
