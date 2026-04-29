import { adminGetGalleryFiles } from '@/actions/admin/gallery-actions';

import GalleryClient from './gallery-client';

export default async function GalleryAdminPage() {
  const result = await adminGetGalleryFiles();
  const files = result.success ? result.files : [];

  return <GalleryClient initialFiles={files} />;
}
