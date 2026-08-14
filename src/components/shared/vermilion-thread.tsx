'use client';

import { m, useReducedMotion } from 'motion/react';

/**
 * 朱线 — 页面区块之间的装饰分割线
 * 渐变淡入的陶土红细线，为页面赋予视觉节奏
 * 滚动进入视口时，从中心向两端生长展开
 */
export function VermilionThread({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={className} aria-hidden="true">
      <m.div
        initial={{ scaleX: reduceMotion ? 1 : 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: '-20px' }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="mx-auto h-px w-24 origin-center bg-gradient-to-r from-transparent via-[var(--primary)]/50 to-transparent"
      />
    </div>
  );
}
