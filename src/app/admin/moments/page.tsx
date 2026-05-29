import { redirect } from 'next/navigation';
import { adminGetMoments } from '@/actions/admin/moments-actions';

import { requirePermission } from '@/lib/permissions';

import MomentsClient from './moments-client';

export default async function MomentsAdminPage() {
  const permissionCheck = await requirePermission('moments:read');
  if (!permissionCheck.allowed) {
    redirect('/admin?toast=unauthorized&message=无权限访问碎碎念管理');
  }

  const result = await adminGetMoments();
  const moments = result.success ? result.data : [];

  return <MomentsClient initialMoments={moments} />;
}
