import { getPhotos } from '@/lib/photos';
import { TunnelPreview } from './tunnel-preview';

/** 照片隧道的预览页：取 uploads 里的实拍图当隧道贴图 */
export default async function TestPage() {
  const photos = await getPhotos();

  return (
    <TunnelPreview
      items={photos.map((photo) => ({
        // 本地 dev 由临时取证路由提供（nginx 不在场时 /uploads/* 会 404）
        src: photo.src.replace('/uploads/', '/next-api/dev-assets/'),
        alt: photo.alt,
        title: photo.filename,
      }))}
    />
  );
}
