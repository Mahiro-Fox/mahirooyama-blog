'use client';

import { m, useMotionValue, useSpring } from 'motion/react';
import { useRef } from 'react';
import { cn } from '@/utils/utils';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  /**
   * 磁吸强度（光标偏移的跟随比例）
   * @default 0.25
   */
  strength?: number;
  /**
   * 最大位移（px），防止按钮过度漂移
   * @default 8
   */
  maxDistance?: number;
}

/**
 * 磁吸按钮 — 鼠标靠近时按钮轻微朝向光标吸附，离开后弹簧归位
 * 使用 motion value + spring，位移动画不触发 React 重渲染
 */
export function MagneticButton({
  children,
  className,
  strength = 0.25,
  maxDistance = 8,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 15, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 200, damping: 15, mass: 0.5 });

  const clamp = (value: number) =>
    Math.max(-maxDistance, Math.min(maxDistance, value));

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set(clamp(relX * strength));
    y.set(clamp(relY * strength));
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <m.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className={cn('inline-block', className)}
    >
      {children}
    </m.div>
  );
}
