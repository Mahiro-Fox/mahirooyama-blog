import { PhotosGallery } from './photos-gallery';

export const metadata = {
  title: 'Photos',
  description: 'Gallery photos showcase',
};

export default function PhotosPage() {
  return (
    <div className="container-wrapper">
      <div className="container py-8">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-medium tracking-tight">Photos</h1>
          <p className="text-muted-foreground">
            A collection of moments captured in time
          </p>
        </div>

        <PhotosGallery />
      </div>
    </div>
  );
}
