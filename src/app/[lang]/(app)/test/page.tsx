import { getPhotos } from '@/lib/photos';
import { TunnelPreview } from './tunnel-preview';

/** 照片隧道的预览页：取 uploads 里的实拍图当隧道贴图 */
export default async function TestPage() {
  const photos = await getPhotos();

  return (
    <TunnelPreview
      items={photos.map((photo) => ({
        src: photo.src,
        alt: photo.alt,
        title: photo.filename,
      }))}
    />
  );
}
