'use client';

import { ChevronLeft, ChevronRight, Plus, SearchIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useCallback, useState } from 'react';
import {
  adminDeleteMidiFile,
  adminGetMidiFiles,
  adminRenameMidiFile,
  adminUploadMidiFile,
} from '@/actions/admin/midi-actions';
import {
  AdminPageLayout,
  createRefreshAction,
} from '@/components/admin/admin-page-layout';
import { Column, DataTable } from '@/components/admin/data-table';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { FileUploadTrigger } from '@/components/admin/file-upload-trigger';
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
import { Link } from '@/components/shared/link';
import { debounce, formatDate, formatSize } from '@/utils/utils';

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
  initialData: MidiAdminFilesPage;
}

/** 列表每页条数 */
const PAGE_SIZE = 20;

// 创建搜索操作项
const createSearchAction = (search: (query: string) => void) => {
  return {
    label: '',
    icon: (
      <>
        <input
          className="border-none bg-transparent outline-none"
          type="text"
          onChange={(e) => search(e.target.value)}
          placeholder="搜索文件名"
          aria-label="搜索文件名"
        />
        <SearchIcon className="ml-2 h-4 w-4" />
      </>
    ),
    onClick: () => {},
    variant: 'outline' as const,
  };
};

export default function MidiClient({ initialData }: MidiClientProps) {
  const [files, setFiles] = useState<MidiAdminFile[]>(initialData.files);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<MidiAdminFile | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<MidiAdminFile | null>(null);
  const [newName, setNewName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // 按页拉取文件列表（服务端搜索 + 分页）
  const loadPage = useCallback(async (page: number, keyword: string) => {
    setIsLoading(true);
    try {
      const result = await adminGetMidiFiles({
        page,
        limit: PAGE_SIZE,
        search: keyword,
      });
      if (result.success) {
        setFiles(result.data.files);
        setPagination(result.data.pagination);
      } else {
        toast.error(result.error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 刷新当前页（保持当前搜索关键字）
  const refreshFiles = useCallback(async () => {
    await loadPage(pagination.page, searchTerm);
  }, [loadPage, pagination.page, searchTerm]);

  const search = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      setSearchTerm(trimmed);
      loadPage(1, trimmed);
    },
    [loadPage]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounceSearch = useCallback(debounce(search, 300), [search]);

  // 处理文件选择和上传（使用 FileUploadTrigger 组件）
  const handleFileSelect = async (files: FileList) => {
    if (!files || files.length === 0) return;

    // 过滤出 .mid 文件
    const midFiles = Array.from(files).filter((file) =>
      file.name.toLowerCase().endsWith('.mid')
    );

    if (midFiles.length === 0) {
      toast.error('请选择 .mid 文件');
      return;
    }

    if (midFiles.length !== files.length) {
      toast.warning('已过滤非 .mid 文件');
    }

    setIsUploading(true);
    try {
      const uploadPromises = midFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const result = await adminUploadMidiFile(formData);
        return { file, result };
      });

      const results = await Promise.all(uploadPromises);

      const successCount = results.filter(
        ({ result }) => result.success
      ).length;
      const failCount = results.length - successCount;

      if (failCount === 0) {
        toast.success(`成功上传 ${successCount} 个文件`);
      } else {
        toast.warning(`${successCount} 成功, ${failCount} 失败`);
        const errorMessages = results
          .map(({ result, file }) =>
            result.success ? '' : `${file.name}: ${result.error}`
          )
          .filter((msg) => msg !== '')
          .join('\n');
        toast.error(errorMessages);
      }

      await refreshFiles();
    } catch {
      toast.error('上传失败');
    } finally {
      setIsUploading(false);
    }
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
        createSearchAction(debounceSearch),
      ]}
      primaryActions={[
        <FileUploadTrigger
          key="upload"
          id="midi-upload"
          accept=".mid,.midi"
          multiple
          disabled={isUploading}
          onFileSelect={handleFileSelect}
        >
          {isUploading ? '上传中...' : '上传 MIDI 文件'}
          <Plus className="mr-2 h-4 w-4" />
        </FileUploadTrigger>,
      ]}
    >
      <DataTable
        data={files}
        columns={columns}
        isLoading={isLoading}
        keyExtractor={(file) => file.slug}
        onDelete={openDeleteDialog}
        onEdit={openRenameDialog}
        actions={{ edit: true, delete: true }}
        emptyText={searchTerm ? '没有匹配的 MIDI 文件' : '暂无 MIDI 文件'}
        virtual={true}
        virtualOptions={{
          estimateSize: 50,
          maxHeight: '65vh',
        }}
      />

      {/* 分页控制 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted-foreground text-sm">
          共 {pagination.total} 个文件，第 {pagination.page} /{' '}
          {Math.max(1, pagination.totalPages)} 页
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading || pagination.page <= 1}
            onClick={() => loadPage(pagination.page - 1, searchTerm)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            上一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading || !pagination.hasMore}
            onClick={() => loadPage(pagination.page + 1, searchTerm)}
          >
            下一页
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

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
