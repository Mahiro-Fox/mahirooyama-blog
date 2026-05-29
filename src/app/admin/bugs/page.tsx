import { redirect } from 'next/navigation';
import { adminGetBugReports } from '@/actions/admin/bug-actions';

import { requirePermission } from '@/lib/permissions';

import BugsClient from './bugs-client';

export default async function BugsAdminPage() {
  const permissionCheck = await requirePermission('bugs:read');
  if (!permissionCheck.allowed) {
    redirect('/admin?toast=unauthorized&message=无权限访问 BUG 管理');
  }

  const result = await adminGetBugReports();
  const bugs = result.success ? result.data : [];

  return <BugsClient initialBugs={bugs} />;
}
