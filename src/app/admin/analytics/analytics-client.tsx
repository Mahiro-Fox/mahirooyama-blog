'use client';

import { useState } from 'react';
import {
  adminGetAnalyticsLogs,
  deleteExpiredAnalyticsLogs,
  type AnalyticsLog,
  type AnalyticsStats,
} from '@/actions/admin/analytics-actions';
import { formatDateWithSecond } from '@/utils/utils';
import { Globe, Monitor, Smartphone, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/shadcn-ui/badge';
import { Button } from '@/components/shadcn-ui/button';
import {
  AdminPageLayout,
  createRefreshAction,
} from '@/components/admin/admin-page-layout';
import { Column, DataTable } from '@/components/admin/data-table';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';

// import AnalyticsCharts from './analytics-charts';

const columns: Column<AnalyticsLog>[] = [
  {
    key: 'timestamp',
    header: '时间',
    width: 'max-w-32',
    render: (log) => formatDateWithSecond(log.timestamp),
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
      <span className="text-muted-foreground truncate text-sm" title={log.url}>
        {log.url}
      </span>
    ),
  },
  {
    key: 'referrer',
    header: '来源',
    width: 'max-w-32',
    render: (log) => (
      <span
        className="text-muted-foreground truncate text-sm"
        title={log.referrer}
      >
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
          <Smartphone className="text-muted-foreground h-4 w-4" />
        ) : (
          <Monitor className="text-muted-foreground h-4 w-4" />
        )}
        <span className="text-sm">{log.device.os}</span>
      </div>
    ),
  },
  {
    key: 'browser',
    header: '浏览器',
    width: 'max-w-24',
    render: (log) => <span className="text-sm">{log.device.browser}</span>,
  },
  {
    key: 'location',
    header: '位置',
    width: 'max-w-28',
    render: (log) => (
      <div className="flex items-center gap-1 text-sm">
        <Globe className="text-muted-foreground h-4 w-4" />
        <span>
          {log.location.country !== 'unknown'
            ? `${log.location.country} - ${log.location.region} - ${log.location.city}`
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
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const result = await adminGetAnalyticsLogs();
      if (!result.success) {
        throw new Error(result.error);
      }
      setLogs(result.data.logs);
      setStats(result.data.stats);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取日志失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpired = async () => {
    setDeleting(true);
    try {
      const result = await deleteExpiredAnalyticsLogs();
      if (!result.success) {
        throw new Error(result.error || '删除失败');
      }
      toast.success(result.message || '删除成功');
      setShowDeleteDialog(false);
      await fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <AdminPageLayout
        title="访问日志"
        description={
          stats
            ? `共 ${stats.totalLogs} 条有效记录 | ${
                stats.expiredFiles > 0
                  ? `⚠️ ${stats.expiredFiles} 个文件已过期（${stats.expiredLogsCount} 条记录）`
                  : '✅ 无过期日志'
              }`
            : `共 ${logs.length} 条访问记录`
        }
        actions={[createRefreshAction(fetchItems, loading)]}
        primaryActions={
          stats && stats.expiredFiles > 0
            ? [
                <Button
                  key="delete-expired"
                  variant="destructive"
                  size="sm"
                  disabled={deleting}
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleting
                    ? '删除中...'
                    : `删除过期日志 (${stats.expiredFiles})`}
                </Button>,
              ]
            : undefined
        }
      >
        <DataTable
          data={logs}
          columns={columns}
          isLoading={loading}
          loadingText="加载访问日志..."
          emptyText="暂无访问日志"
          keyExtractor={(log) => `${log.timestamp}-${log.ip_masked}`}
          virtual={true}
          virtualOptions={{
            estimateSize: 50,
            maxHeight: '65vh',
          }}
        />
        <p className="h-6" />
        {/* {logs.length > 0 && <AnalyticsCharts logs={logs} />} */}
      </AdminPageLayout>

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="确认删除"
        description={
          <>
            确定要删除过期日志文件{' '}
            <strong>{stats?.expiredFiles || 0} 个</strong>？此操作不可恢复。
          </>
        }
        onConfirm={handleDeleteExpired}
        isDeleting={deleting}
      />
    </>
  );
}
