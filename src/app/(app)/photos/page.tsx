import { Metadata } from 'next';

import { PhotosGallery } from './photos-gallery';

export const metadata: Metadata = {
  title:
    "欢迎来到 mahirooyama 的照片墙喵~ - Welcome to mahiooyama's photo wall",
  description: `这里是一些mahiro日常的一些照片... - Here are some photos of Mahiro's daily life...`,
  keywords: ['照片墙','photos', 'mahirooyama', 'mahiooyama', 'daily life', 'contact mahiro'],
};
export default function PhotosPage() {
  return (
    <div className="container-wrapper">
      <div className="container py-8">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-medium tracking-tight">照片墙</h1>
          <p className="text-muted-foreground">
            这里是一些mahiro日常的一些照片...
          </p>
        </div>
        <PhotosGallery />
      </div>
    </div>
  );
}
