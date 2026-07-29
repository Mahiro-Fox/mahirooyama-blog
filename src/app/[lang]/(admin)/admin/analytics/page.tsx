import { redirect } from 'next/navigation';
import { adminGetAnalyticsLogs } from '@/actions/admin/analytics-actions';

import { requirePermission } from '@/lib/permissions';

import AnalyticsClient from './analytics-client';

export default async function AnalyticsAdminPage() {
  const permissionCheck = await requirePermission('analytics:read');
  if (!permissionCheck.allowed) {
    redirect('/admin?toast=unauthorized&message=无权限访问分析数据');
  }

  const result = await adminGetAnalyticsLogs();
  const logs = result.success ? result.data.logs : [];

  return <AnalyticsClient initialLogs={logs} />;
}
