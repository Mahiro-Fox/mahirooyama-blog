'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/i18n/dictionary-provider';

/**
 * 全站加载屏
 *
 * 作为 Next.js loading.tsx 渲染的内容，在以下时机自动出现：
 * - 首次进入网站（SSR → hydration 期间）
 * - 路由切换（layout.tsx 变化时）
 *
 * 进度条策略：
 * 1. 自动递增到 ~90% 后保持，模拟"正在加载"的感知
 * 2. 监听 window.load 事件（所有资源加载完成），填满到 100%
 * 3. 填满后延迟 300ms 淡出，交给真实页面
 *
 * 不使用 framer-motion，因为 loading.tsx 需在 MotionConfig 外也能正常渲染。
 * 改用 CSS transition 实现平滑过渡。
 */
export function LoadingScreen() {
  const t = useT();
  const [progress, setProgress] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    let rafId: number;
    let current = 0;

    // 递增进度：前 30% 快速，30%→90% 缓慢，90% 后等待 window.load
    const tick = () => {
      if (fadingOut) return;
      if (current < 30) {
        current += 3;
      } else if (current < 90) {
        current += 0.8;
      }
      setProgress(Math.min(current, 90));
      if (current < 90) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);

    // window.load：所有资源（图片、字体等）加载完成
    const handleLoad = () => {
      if (fadingOut) return;
      // 快速填满到 100%
      setProgress(100);
      // 等进度条动画完成后淡出
      setTimeout(() => setFadingOut(true), 400);
    };

    if (document.readyState === 'complete') {
      // 资源已加载完成（极快的情况），直接填满
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('load', handleLoad);
    };
  }, [fadingOut]);

  return (
    <div
      className={`bg-background fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadingOut ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      aria-hidden={fadingOut}
    >
      {/* loading 动画 */}
      <div className="relative flex h-full w-full flex-col items-center gap-6">
        <img
          src="/loading.gif"
          alt={t('loading.alt')}
          className="h-full w-full object-cover"
          draggable={false}
        />
        <p className="text-muted-foreground text-sm">{t('loading.text')}</p>
      </div>

      {/* 右下角进度条 */}
      <div className="fixed right-6 bottom-6 flex items-center gap-3">
        <span className="text-muted-foreground text-xs tabular-nums">
          {Math.round(progress)}%
        </span>
        <div className="bg-muted h-1.5 w-40 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
