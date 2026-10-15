'use client';

import dynamic from 'next/dynamic';
import type { PassageGalleryItem } from './_components/passage-gallery';

// three 体积较大，且 <Canvas> 参与 SSR 会写进 HTML（水合风险），
// 与 shader-background 一致，只在客户端懒加载。
const PassageGallery = dynamic(() => import('./_components/passage-gallery'), {
  ssr: false,
});

export function TunnelPreview({ items }: { items: PassageGalleryItem[] }) {
  return (
    <div className="w-full px-4 py-8">
      <div className="mx-auto h-[72vh] w-full max-w-5xl">
        <PassageGallery items={items} className="rounded-xl" />
      </div>
    </div>
  );
}
