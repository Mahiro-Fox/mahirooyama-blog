import { adminGetAnalyticsLogs } from '@/actions/admin/analytics-actions';

import AnalyticsCharts from '@/app/admin/analytics/analytics-charts';

export default async function AdminPage() {
  const result = await adminGetAnalyticsLogs();
  const logs = result.success ? result.data.logs : [];
  return logs.length > 0 ? <AnalyticsCharts logs={logs} /> : null;
}
