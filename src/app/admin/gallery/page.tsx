'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import {
  FileText,
  FolderOpen,
  Pencil,
  Plus,
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
  createRefreshAction,
} from '@/components/admin/admin-page-layout';
import { Column, DataTable } from '@/components/admin/data-table';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';

interface GalleryFile {
  slug: string;
  fileName: string;
  title: string;
  description: string;
  src: string;
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

// 截断文本
const truncate = (text: string, maxLen: number) => {
  if (!text) return '-';
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
};

// 表格列定义
const columns: Column<GalleryFile>[] = [
  {
    key: 'title',
    header: '标题',
    render: (file) => (
      <Link
        href={`/gallery/${file.slug}`}
        className="underline-offset-4 hover:underline"
      >
        {file.title}
      </Link>
    ),
  },
  {
    key: 'fileName',
    header: '文件名',
    render: (file) => (
      <span className="text-muted-foreground">{file.fileName}</span>
    ),
  },
  {
    key: 'src',
    header: '图片路径',
    render: (file) => (
      <span
        className="text-muted-foreground max-w-[200px] truncate"
        title={file.src}
      >
        {truncate(file.src, 30)}
      </span>
    ),
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

export default function GalleryAdminPage() {
  // CRUD 状态管理
  const {
    items: files,
    isLoading: loading,
    isSubmitting,
    fetchItems,
    deleteItem,
  } = useCrud<GalleryFile>({
    apiPath: '/api/gallery-files',
    idField: 'slug',
  });

  // 本地状态
  const [selectedFile, setSelectedFile] = useState<GalleryFile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('edit');
  const [editContent, setEditContent] = useState('');
  const [editFileName, setEditFileName] = useState('');
  const [originalFileName, setOriginalFileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 获取文件列表
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // 新增文件
  const handleCreate = () => {
    setEditMode('create');
    setSelectedFile(null);
    setEditFileName('');
    setOriginalFileName('');
    setEditContent(`---
title: ''
description: ''
thumbnail: ''
tags: []
---
`);
    setIsEditDialogOpen(true);
  };

  // 编辑文件
  const handleEdit = async (file: GalleryFile) => {
    try {
      const response = await fetch(`/api/gallery-files/${file.slug}`);
      if (!response.ok) throw new Error('获取失败');
      const data = await response.json();
      setEditMode('edit');
      setSelectedFile(file);
      setEditFileName(file.slug);
      setOriginalFileName(file.fileName);
      setEditContent(data.content);
      setIsEditDialogOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取文件内容失败');
    }
  };

  // 保存（新增或编辑）
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (editMode === 'create') {
        if (!editFileName.trim()) {
          toast.error('请输入文件名称');
          setIsSaving(false);
          return;
        }
        const response = await fetch('/api/gallery-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: editFileName.trim(),
            content: editContent,
          }),
        });
        if (!response.ok) throw new Error('创建失败');
        toast.success('文件创建成功');
      } else {
        if (!selectedFile) return;
        const saveResponse = await fetch(
          `/api/gallery-files/${selectedFile.slug}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: editContent }),
          }
        );
        if (!saveResponse.ok) throw new Error('保存内容失败');
        // 如果文件名变更，执行重命名
        if (editFileName.trim() !== selectedFile.slug) {
          const renameResponse = await fetch(
            `/api/gallery-files/${selectedFile.slug}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ newSlug: editFileName.trim() }),
            }
          );
          if (!renameResponse.ok) throw new Error('重命名失败');
        }
        toast.success('文件保存成功');
      }
      setIsEditDialogOpen(false);
      fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  }, [selectedFile, editMode, editFileName, editContent, fetchItems]);

  // 上传文件
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isYaml = file.name.endsWith('.yml') || file.name.endsWith('.yaml');
    if (!isYaml) {
      toast.error('只支持 .yml 或 .yaml 文件');
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/gallery-files', {
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
  const openDelete = (file: GalleryFile) => {
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
    <div className="bg-muted/30 min-h-screen">
      {/* 头部导航 */}
      <header className="bg-background border-b px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Gallery 管理</h1>
            <Link
              href="/admin/blog"
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm"
            >
              <FileText className="h-4 w-4" /> Blog
            </Link>
            <Link
              href="/admin/public-files"
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm"
            >
              <FolderOpen className="h-4 w-4" /> Public 文件
            </Link>
          </div>
        </div>
      </header>

      {/* 主内容 - 使用通用布局 */}
      <main className="mx-auto max-w-6xl p-6">
        <AdminPageLayout
          title="图片列表"
          description={`共 ${files.length} 张图片`}
          actions={[
            createRefreshAction(fetchItems, loading),
            {
              label: '新增 YML',
              icon: <Plus className="mr-2 h-4 w-4" />,
              onClick: handleCreate,
              variant: 'outline',
            },
            {
              label: isUploading ? '上传中...' : '上传 YML',
              icon: <Upload className="mr-2 h-4 w-4" />,
              onClick: () => document.getElementById('yaml-upload')?.click(),
              disabled: isUploading,
              variant: 'default',
            },
          ]}
        >
          {/* 隐藏的文件输入 */}
          <Input
            type="file"
            accept=".yml,.yaml"
            onChange={handleUpload}
            disabled={isUploading}
            className="hidden"
            id="yaml-upload"
          />

          {/* 数据表格 */}
          <DataTable
            data={files}
            columns={columns}
            isLoading={loading}
            loadingText="加载图片列表..."
            emptyText="暂无图片，请上传 YML 文件或新增配置"
            keyExtractor={(file) => file.slug}
            onEdit={handleEdit}
            onDelete={openDelete}
            actions={{ edit: true, delete: true }}
          />
        </AdminPageLayout>

        {/* 编辑/新增对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {editMode === 'create'
                  ? '新增 YML 文件'
                  : `编辑: ${selectedFile?.title}`}
              </DialogTitle>
              <DialogDescription>
                {editMode === 'create'
                  ? '创建新的 Gallery 配置文件'
                  : selectedFile?.fileName}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium">文件名称 (slug)</label>
                <Input
                  value={editFileName}
                  onChange={(e) => setEditFileName(e.target.value)}
                  placeholder="例如: my-image"
                  disabled={editMode === 'edit' && isSaving}
                  className="mt-1"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  {editMode === 'edit' &&
                  originalFileName !== `${editFileName}.yml`
                    ? '修改文件名将会重命名文件'
                    : '将生成文件: ' +
                      (editFileName ? `${editFileName}.yml` : '...')}
                </p>
              </div>
              <div className="h-[50vh] w-full">
                <Editor
                  height="100%"
                  defaultLanguage="yaml"
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
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSaving}
              >
                <X className="mr-2 h-4 w-4" /> 取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !editFileName.trim()}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving
                  ? editMode === 'create'
                    ? '创建中...'
                    : '保存中...'
                  : editMode === 'create'
                    ? '创建'
                    : '保存'}
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
              确定要删除图片 <strong>{selectedFile?.title}</strong>{' '}
              吗？此操作不可恢复。
            </>
          }
          onConfirm={handleDelete}
          isDeleting={isSubmitting}
        />
      </main>
    </div>
  );
}
