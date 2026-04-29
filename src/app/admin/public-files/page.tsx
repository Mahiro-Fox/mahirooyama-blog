import { adminGetPublicFiles } from '@/actions/admin/public-files-actions';

import PublicFilesClient from './public-files-client';

export default async function PublicFilesAdminPage() {
  const result = await adminGetPublicFiles('');
  const initialData = result.success
    ? result.data
    : { items: [], currentPath: '', breadcrumb: [] };

  return <PublicFilesClient initialData={initialData} />;
}
