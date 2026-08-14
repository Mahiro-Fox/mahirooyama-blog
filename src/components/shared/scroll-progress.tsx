'use client';

import { m, useReducedMotion, useScroll, useSpring } from 'motion/react';

/**
 * 顶部滚动进度条 — 固定于视口顶部的朱色细线
 * 随页面滚动进度平滑增长，spring 物理缓冲消除抖动
 */
export function ScrollProgress() {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  if (reduceMotion) return null;

  return (
    <m.div
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-[var(--primary)]"
      style={{ scaleX }}
      aria-hidden="true"
    />
  );
}
