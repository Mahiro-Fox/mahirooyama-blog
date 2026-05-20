'use client';

import { useState } from 'react';
import {
  adminGetAnalyticsLogs,
  type AnalyticsLog,
} from '@/actions/admin/analytics-actions';
import { formatDate } from '@/utils/utils';
import { Globe, Smartphone, Monitor } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/shadcn-ui/badge';
import {
  AdminPageLayout,
  createRefreshAction,
} from '@/components/admin/admin-page-layout';
import { Column, DataTable } from '@/components/admin/data-table';

const columns: Column<AnalyticsLog>[] = [
  {
    key: 'timestamp',
    header: '时间',
    width: 'max-w-32',
    render: (log) => formatDate(log.timestamp),
  },
  {
    key: 'event',
    header: '事件',
    width: 'max-w-20',
    render: (log) => (
      <Badge variant="secondary" className="text-xs">
        {log.event}
      </Badge>
    ),
  },
  {
    key: 'url',
    header: '访问页面',
    width: 'max-w-40',
    render: (log) => (
      <span className="text-muted-foreground text-sm truncate" title={log.url}>
        {log.url}
      </span>
    ),
  },
  {
    key: 'referrer',
    header: '来源',
    width: 'max-w-32',
    render: (log) => (
      <span className="text-muted-foreground text-sm truncate" title={log.referrer}>
        {log.referrer || '-'}
      </span>
    ),
  },
  {
    key: 'device',
    header: '设备',
    width: 'max-w-24',
    render: (log) => (
      <div className="flex items-center gap-1">
        {log.device.isMobile ? (
          <Smartphone className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Monitor className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm">{log.device.os}</span>
      </div>
    ),
  },
  {
    key: 'browser',
    header: '浏览器',
    width: 'max-w-24',
    render: (log) => (
      <span className="text-sm">{log.device.browser}</span>
    ),
  },
  {
    key: 'location',
    header: '位置',
    width: 'max-w-28',
    render: (log) => (
      <div className="flex items-center gap-1 text-sm">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span>
          {log.location.country !== 'unknown'
            ? `${log.location.country} - ${log.location.city} - ${log.location.region}`
            : '未知'}
        </span>
      </div>
    ),
  },
  {
    key: 'screen',
    header: '屏幕',
    width: 'max-w-20',
    render: (log) => (
      <span className="text-muted-foreground text-sm">{log.screen}</span>
    ),
  },
];

export default function AnalyticsClient({
  initialLogs,
}: {
  initialLogs: AnalyticsLog[];
}) {
  const [logs, setLogs] = useState<AnalyticsLog[]>(initialLogs);
  const [loading, setLoading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const result = await adminGetAnalyticsLogs();
      if (!result.success) {
        throw new Error(result.error);
      }
      setLogs(result.logs);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取日志失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminPageLayout
      title="访问日志"
      description={`共 ${logs.length} 条访问记录`}
      actions={[createRefreshAction(fetchItems, loading)]}
    >
      <DataTable
        data={logs}
        columns={columns}
        isLoading={loading}
        loadingText="加载访问日志..."
        emptyText="暂无访问日志"
        keyExtractor={(log) => `${log.timestamp}-${log.ip_masked}`}
      />
    </AdminPageLayout>
  );
}
