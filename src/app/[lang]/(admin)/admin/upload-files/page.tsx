import { redirect } from 'next/navigation';
import { adminGetUploadFiles } from '@/actions/admin/upload-files-actions';
import { requirePermission } from '@/lib/permissions';
import UploadFilesClient from './upload-files-client';

export default async function UploadFilesAdminPage() {
  // Check permission
  const permissionCheck = await requirePermission('files:read');
  if (!permissionCheck.allowed) {
    redirect('/admin?toast=unauthorized&message=无权限访问文件管理');
  }

  // 调用adminGetUploadFiles，自动从缓存中获取路径
  const result = await adminGetUploadFiles();
  const initialData = result.success
    ? result.data
    : { items: [], currentPath: '', breadcrumb: [] };

  return <UploadFilesClient initialData={initialData} />;
}
