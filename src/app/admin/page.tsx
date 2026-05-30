import { adminGetAnalyticsLogs } from '@/actions/admin/analytics-actions';

import AnalyticsCharts from '@/app/admin/analytics/analytics-charts';
import { DeviceDetector } from '@/components/admin/device-detector';

export default async function AdminPage() {
  const result = await adminGetAnalyticsLogs();
  const logs = result.success ? result.data.logs : [];
  return (
    <>
      <DeviceDetector />
      {logs.length > 0 ? <AnalyticsCharts logs={logs} /> : null}
    </>
  );
}
