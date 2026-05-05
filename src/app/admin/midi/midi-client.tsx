'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import {
  adminDeleteMidiFile,
  adminGetMidiFiles,
  adminRenameMidiFile,
  adminUploadMidiFile,
  type MidiAdminFile,
} from '@/actions/admin/midi-actions';
import { formatDate, formatSize } from '@/utils/utils';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/shadcn-ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn-ui/dialog';
import { Input } from '@/components/shadcn-ui/input';
import {
  AdminPageLayout,
  createRefreshAction,
} from '@/components/admin/admin-page-layout';
import { Column, DataTable } from '@/components/admin/data-table';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';

// 表格列定义
const columns: Column<MidiAdminFile>[] = [
  {
    key: 'name',
    header: '文件名',
    width: 'max-w-xs',
    render: (file) => (
      <Link
        href={`/midi?file=${encodeURIComponent(file.fileName)}`}
        className="underline-offset-4 hover:underline"
      >
        {file.name}
      </Link>
    ),
  },
  {
    key: 'size',
    header: '文件大小',
    render: (file) => formatSize(file.size),
  },
  {
    key: 'lastModified',
    header: '修改时间',
    render: (file) => formatDate(file.lastModified),
  },
];

interface MidiClientProps {
  initialFiles: MidiAdminFile[];
}

export default function MidiClient({ initialFiles }: MidiClientProps) {
  const [files, setFiles] = useState<MidiAdminFile[]>(initialFiles);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<MidiAdminFile | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<MidiAdminFile | null>(null);
  const [newName, setNewName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 刷新文件列表
  const refreshFiles = useCallback(async () => {
    const result = await adminGetMidiFiles();
    if (result.success) {
      setFiles(result.files);
    } else {
      toast.error(result.error);
    }
  }, []);

  // 触发文件选择器
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 处理文件选择和上传
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    // 过滤出 .mid 文件
    const midFiles = Array.from(selectedFiles).filter((file) =>
      file.name.toLowerCase().endsWith('.mid')
    );

    if (midFiles.length === 0) {
      toast.error('请选择 .mid 文件');
      return;
    }

    if (midFiles.length !== selectedFiles.length) {
      toast.warning(
        `已过滤 ${selectedFiles.length - midFiles.length} 个非 .mid 文件`
      );
    }

    setIsUploading(true);

    // 并行上传所有文件
    const uploadPromises = midFiles.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const result = await adminUploadMidiFile(formData);
      return { file, result };
    });

    const results = await Promise.all(uploadPromises);
    setIsUploading(false);

    // 统计结果
    const successCount = results.filter((r) => r.result.success).length;
    const failCount = results.length - successCount;

    if (successCount > 0) {
      toast.success(`成功上传 ${successCount} 个文件`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} 个文件上传失败`);
    }

    // 清空 input 以便下次选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // 刷新列表
    await refreshFiles();
  };

  // 删除文件
  const handleDelete = async () => {
    if (!fileToDelete) return;

    setIsDeleting(true);
    const result = await adminDeleteMidiFile(fileToDelete.slug);
    setIsDeleting(false);

    if (result.success) {
      toast.success('文件删除成功');
      setDeleteDialogOpen(false);
      setFileToDelete(null);
      await refreshFiles();
    } else {
      toast.error(result.error);
    }
  };

  // 重命名文件
  const handleRename = async () => {
    if (!fileToRename || !newName.trim()) return;

    const result = await adminRenameMidiFile(fileToRename.slug, newName.trim());
    if (result.success) {
      toast.success('文件重命名成功');
      setRenameDialogOpen(false);
      setFileToRename(null);
      setNewName('');
      await refreshFiles();
    } else {
      toast.error(result.error);
    }
  };

  // 打开删除对话框
  const openDeleteDialog = (file: MidiAdminFile) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  // 打开重命名对话框
  const openRenameDialog = (file: MidiAdminFile) => {
    setFileToRename(file);
    setNewName(file.name);
    setRenameDialogOpen(true);
  };

  return (
    <AdminPageLayout
      title="MIDI 文件管理"
      description="管理 MIDI 音乐文件"
      actions={[
        createRefreshAction(refreshFiles),
        {
          label: '上传mid文件',
          icon: <Plus className="h-4 w-4" />,
          onClick: triggerFileInput,
          disabled: isUploading,
        },
      ]}
    >
      <DataTable
        data={files}
        columns={columns}
        keyExtractor={(file) => file.slug}
        onDelete={openDeleteDialog}
        onEdit={openRenameDialog}
        actions={{ edit: true, delete: true }}
        emptyText="暂无 MIDI 文件"
      />

      {/* 隐藏的文件选择 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mid,.midi"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        title="确认删除"
        description={`确定要删除文件 "${fileToDelete?.name}" 吗？此操作不可撤销。`}
      />

      {/* 重命名对话框 */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名文件</DialogTitle>
            <DialogDescription>
              输入新的文件名（不需要包含 .mid 后缀）
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="新文件名"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenameDialogOpen(false);
                setFileToRename(null);
                setNewName('');
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleRename}
              disabled={
                !newName.trim() || newName.trim() === fileToRename?.name
              }
            >
              确认重命名
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  );
}
