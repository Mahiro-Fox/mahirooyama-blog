import { getPublicGalleryImages } from '@/lib/public-gallery';

import { PhotosGallery } from './photos-gallery';

export const metadata = {
  title: 'Photos',
  description: 'Gallery photos showcase',
};

export default async function PhotosPage() {
  const images = await getPublicGalleryImages();

  if (images.length === 0) {
    return (
      <div className="container-wrapper">
        <div className="container flex min-h-[60vh] flex-col items-center justify-center py-20">
          <h1 className="text-2xl font-medium tracking-tight">Photos</h1>
          <p className="text-muted-foreground mt-4">
            No images found in gallery. Add some images to
            public/images/gallery/
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-wrapper">
      <div className="container py-8">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-medium tracking-tight">Photos</h1>
          <p className="text-muted-foreground">
            A collection of moments captured in time
          </p>
        </div>

        <PhotosGallery images={images} />
      </div>
    </div>
  );
}
