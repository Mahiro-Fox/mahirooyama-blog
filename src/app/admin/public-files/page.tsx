import { redirect } from 'next/navigation';
import { adminGetPublicFiles } from '@/actions/admin/public-files-actions';

import { requirePermission } from '@/lib/permissions';

import PublicFilesClient from './public-files-client';

export default async function PublicFilesAdminPage() {
  // Check permission
  const permissionCheck = await requirePermission('files:read');
  if (!permissionCheck.allowed) {
    redirect('/admin?toast=unauthorized&message=无权限访问文件管理');
  }

  const result = await adminGetPublicFiles('');
  const initialData = result.success
    ? result.data
    : { items: [], currentPath: '', breadcrumb: [] };

  return <PublicFilesClient initialData={initialData} />;
}
