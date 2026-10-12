'use client';

import dynamic from 'next/dynamic';

// three 体积较大，且 <Canvas> 若参与 SSR 会进入 HTML（存在水合风险），
// 因此只在客户端懒加载，避免拖慢 (app) 各路由的首屏。
const GroundCanvas = dynamic(() => import('./ground-canvas'), { ssr: false });

/**
 * (app) 路由组的全屏着色器背景。
 *
 * 层叠说明：作为 (app)/layout.tsx 根 div（relative z-10，自身构成层叠上下文）的子元素，
 * 负 z-index 会绘制在该 div 自身背景之上、main 内容之下，因此无需改动 body / globals.css。
 * 注意必须保持为该根 div 的后代，不能用 portal 挂到 body。
 */
export function ShaderBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[-10]">
      <GroundCanvas />
      {/* 主题遮罩：用主题背景色压住过饱和的 shader，切主题时由 CSS 变量即时变色 */}
      <div className="absolute inset-0 bg-[color-mix(in_oklab,var(--background)_var(--ground-veil-alpha),transparent)]" />
    </div>
  );
}
