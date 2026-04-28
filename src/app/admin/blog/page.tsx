'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import {
  FolderOpen,
  ImageIcon,
  Pencil,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useCrud } from '@/hooks/use-crud';
import { Badge } from '@/components/shadcn-ui/badge';
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
  createAddAction,
  createRefreshAction,
} from '@/components/admin/admin-page-layout';
import { Column, DataTable } from '@/components/admin/data-table';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';

interface MdxFile {
  slug: string;
  fileName: string;
  title: string;
  description: string;
  createdAt: string;
  tags: string[];
  size: number;
  updatedAt: string;
}

// 格式化文件大小
const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN');
};

// 表格列定义
const columns: Column<MdxFile>[] = [
  {
    key: 'title',
    header: '标题',
    width: 'max-w-20',
    render: (file) => (
      <Link
        href={`/blog/${file.slug}`}
        className="underline-offset-4 hover:underline"
      >
        {file.title}
      </Link>
    ),
  },
  {
    key: 'fileName',
    header: '文件名',
    width: 'max-w-20',
    render: (file) => (
      <span className="text-muted-foreground">{file.fileName}</span>
    ),
  },
  {
    key: 'createdAt',
    header: '日期',
    render: (file) => formatDate(file.createdAt),
  },
  {
    key: 'tags',
    header: '标签',
    render: (file) => (
      <div className="flex flex-wrap gap-1">
        {file.tags?.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        )) || '-'}
      </div>
    ),
  },
  {
    key: 'size',
    header: '大小',
    render: (file) => (
      <span className="text-muted-foreground">{formatSize(file.size)}</span>
    ),
  },
];

export default function BlogAdminPage() {
  // CRUD 状态管理
  const {
    items: files,
    isLoading: loading,
    isSubmitting,
    fetchItems,
    deleteItem,
  } = useCrud<MdxFile>({
    apiPath: '/api/mdx-files',
    idField: 'slug',
  });

  // 本地状态
  const [selectedFile, setSelectedFile] = useState<MdxFile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 获取文件列表
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // 保存编辑
  const handleSave = useCallback(async () => {
    if (!selectedFile) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/mdx-files/${selectedFile.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });
      if (!response.ok) throw new Error('保存失败');
      toast.success('文件保存成功');
      setIsEditDialogOpen(false);
      fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  }, [selectedFile, editContent, fetchItems]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedFile) return;
      if (e.ctrlKey && e.code === 'KeyS') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSave, selectedFile, editContent]);

  // 编辑文件
  const handleEdit = async (file: MdxFile) => {
    try {
      const response = await fetch(`/api/mdx-files/${file.slug}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '获取失败');
      }
      const data = await response.json();
      setSelectedFile(file);
      setEditContent(data.content);
      console.log(data.content);
      setIsEditDialogOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取文件内容失败');
    }
  };

  // 上传文件
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.mdx')) {
      toast.error('只支持 .mdx 文件');
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/mdx-files', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('上传失败');
      toast.success('文件上传成功');
      fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '上传失败');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // 打开删除对话框
  const openDelete = (file: MdxFile) => {
    setSelectedFile(file);
    setIsDeleteDialogOpen(true);
  };

  // 执行删除
  const handleDelete = async () => {
    if (!selectedFile) return;
    await deleteItem(selectedFile.slug);
    setIsDeleteDialogOpen(false);
    setSelectedFile(null);
  };

  return (
    <>
      <AdminPageLayout
        title="文章列表"
        description={`共 ${files.length} 篇文章`}
        actions={[
          createRefreshAction(fetchItems, loading),
          {
            label: isUploading ? '上传中...' : '上传 MDX',
            icon: <Upload className="mr-2 h-4 w-4" />,
            onClick: () => document.getElementById('mdx-upload')?.click(),
            disabled: isUploading,
            variant: 'default',
          },
        ]}
      >
        {/* 隐藏的文件输入 */}
        <Input
          type="file"
          accept=".mdx"
          onChange={handleUpload}
          disabled={isUploading}
          className="hidden"
          id="mdx-upload"
        />

        {/* 数据表格 */}
        <DataTable
          data={files}
          columns={columns}
          isLoading={loading}
          loadingText="加载文章列表..."
          emptyText="暂无文章，请上传 MDX 文件"
          keyExtractor={(file) => file.slug}
          onEdit={handleEdit}
          onDelete={openDelete}
          actions={{ edit: true, delete: true }}
        />
      </AdminPageLayout>

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>编辑: {selectedFile?.title}</DialogTitle>
            <DialogDescription>{selectedFile?.fileName}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 h-[60vh] w-full">
            <Editor
              height="100%"
              defaultLanguage="markdown"
              value={editContent}
              onChange={(value) => setEditContent(value || '')}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                folding: true,
                automaticLayout: true,
                tabSize: 2,
                fontSize: 14,
              }}
              theme="vs-dark"
            />
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving}
            >
              <X className="mr-2 h-4 w-4" />
              取消
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 - 使用通用组件 */}
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="确认删除"
        description={
          <>
            确定要删除文章 <strong>{selectedFile?.title}</strong>{' '}
            吗？此操作不可恢复。
          </>
        }
        onConfirm={handleDelete}
        isDeleting={isSubmitting}
      />
    </>
  );
}
