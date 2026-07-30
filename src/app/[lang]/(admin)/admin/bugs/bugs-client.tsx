'use client';

import { type BugReport, type BugStatus } from '@/store/bug-store';
import { CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  adminDeleteBugReport,
  adminGetBugReports,
  adminUpdateBugStatus,
} from '@/actions/admin/bug-actions';
import {
  AdminPageLayout,
  createRefreshAction,
} from '@/components/admin/admin-page-layout';
import { DataTable, type Column } from '@/components/admin/data-table';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Badge } from '@/components/shadcn-ui/badge';
import { Button } from '@/components/shadcn-ui/button';
import { formatDate } from '@/utils/utils';

export default function BugsClient({
  initialBugs,
}: {
  initialBugs: BugReport[];
}) {
  const [bugs, setBugs] = useState<BugReport[]>(initialBugs);
  const [loading, setLoading] = useState(false);
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBugs = async () => {
    setLoading(true);
    try {
      const res = await adminGetBugReports();
      if (res.success) {
        setBugs(res.data);
      } else {
        toast.error(res.error || '获取失败');
      }
    } catch {
      toast.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: BugStatus) => {
    try {
      const res = await adminUpdateBugStatus(id, status);
      if (res.success) {
        toast.success('状态更新成功');
        setBugs((prev) =>
          prev.map((bug) => (bug.id === id ? { ...bug, status } : bug))
        );
      } else {
        toast.error(res.error || '更新失败');
      }
    } catch {
      toast.error('网络错误');
    }
  };

  const handleDelete = async () => {
    if (!selectedBug) return;
    setIsDeleting(true);
    try {
      const res = await adminDeleteBugReport(selectedBug.id);
      if (res.success) {
        toast.success('删除成功');
        setBugs((prev) => prev.filter((bug) => bug.id !== selectedBug.id));
        setIsDeleteDialogOpen(false);
      } else {
        toast.error(res.error || '删除失败');
      }
    } catch {
      toast.error('网络错误');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<BugReport>[] = [
    {
      key: 'createdAt',
      header: '提交时间',
      width: '180px',
      render: (bug) => (
        <span className="whitespace-nowrap">{formatDate(bug.createdAt)}</span>
      ),
    },
    {
      key: 'content',
      header: '报告内容',
      render: (bug) => (
        <div className="flex flex-col gap-1 py-1">
          <div className="max-w-xl text-sm break-words whitespace-pre-wrap">
            {bug.content}
          </div>
          {(bug.url || bug.userAgent) && (
            <div className="text-muted-foreground flex flex-col gap-0.5 text-xs opacity-70">
              {bug.url && (
                <p className="truncate" title={bug.url}>
                  URL: {bug.url}
                </p>
              )}
              {bug.userAgent && (
                <p className="truncate" title={bug.userAgent}>
                  UA: {bug.userAgent}
                </p>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      header: '联系方式',
      width: '150px',
      render: (bug) => bug.contact || '-',
    },
    {
      key: 'status',
      header: '状态',
      width: '120px',
      render: (bug) =>
        bug.status === 'pending' ? (
          <Badge variant="secondary" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            待处理
          </Badge>
        ) : (
          <Badge
            variant="default"
            className="gap-1.5 border-transparent bg-green-500 text-white hover:bg-green-600"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            已处理
          </Badge>
        ),
    },
  ];

  return (
    <AdminPageLayout
      title="BUG 管理"
      description="查看和管理用户提交的 BUG 报告"
      actions={[createRefreshAction(fetchBugs, loading)]}
    >
      <div className="bg-card rounded-md border">
        <DataTable
          data={bugs}
          columns={columns}
          isLoading={loading}
          keyExtractor={(bug) => bug.id}
          onDelete={(bug) => {
            setSelectedBug(bug);
            setIsDeleteDialogOpen(true);
          }}
          actions={{
            custom: (bug) => (
              <>
                {bug.status === 'pending' ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUpdateStatus(bug.id, 'resolved')}
                    title="标记为已处理"
                    className="text-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950"
                  >
                    <CheckCircle className="h-4.5 w-4.5" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUpdateStatus(bug.id, 'pending')}
                    title="标记为待处理"
                    className="text-orange-500 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950"
                  >
                    <Clock className="h-4.5 w-4.5" />
                  </Button>
                )}
              </>
            ),
            delete: true,
          }}
        />
      </div>

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title="删除 BUG 报告"
        description="确定要删除这条 BUG 报告吗？此操作不可撤销。"
        isDeleting={isDeleting}
      />
    </AdminPageLayout>
  );
}
