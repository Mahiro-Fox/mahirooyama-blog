import { redirect } from 'next/navigation';
import { adminGetGalleryFiles } from '@/actions/admin/gallery-actions';

import { requirePermission } from '@/lib/permissions';

import GalleryClient from './gallery-client';

export default async function GalleryAdminPage() {
  // Check permission
  const permissionCheck = await requirePermission('gallery:read');
  if (!permissionCheck.allowed) {
    redirect('/admin?toast=unauthorized&message=无权限访问图库管理');
  }

  const result = await adminGetGalleryFiles();
  const files = result.success ? result.files : [];

  return <GalleryClient initialFiles={files} />;
}
