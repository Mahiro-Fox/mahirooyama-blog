import { Metadata } from 'next';

import { BentoGridClient } from './bento-grid-client';

export const metadata: Metadata = {
  title: '关于我 - About Me',
  description: '了解更多关于 ShiZhongyan 的信息',
  keywords: ['about', '关于我', 'ShiZhongyan', '个人简介'],
};

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-4xl font-bold">关于我</h1>
        <p className="text-muted-foreground">了解更多关于我的故事和兴趣</p>
      </div>
      <BentoGridClient />
    </div>
  );
}
