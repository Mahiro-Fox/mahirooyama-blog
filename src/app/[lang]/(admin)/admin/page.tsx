import { adminGetAnalyticsLogs } from '@/actions/admin/analytics-actions';

import { DeviceDetector } from '@/components/admin/device-detector';
import AnalyticsCharts from '@/app/[lang]/(admin)/admin/analytics/analytics-charts';

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
