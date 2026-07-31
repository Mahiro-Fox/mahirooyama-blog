'use client';

import { Image as ImageIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useCallback, useEffect, useState } from 'react';
import {
  adminCreateBlog,
  adminDeleteBlogFile,
  adminGetBlog,
  adminGetBlogs,
  adminRenameBlogFile,
  adminUpdateBlog,
  adminUploadBlogThumbnail,
} from '@/actions/admin/blog-actions';
import {
  AdminPageLayout,
  createAddAction,
  createRefreshAction,
} from '@/components/admin/admin-page-layout';
import { CrudFormDialog } from '@/components/admin/crud-form-dialog';
import { Column, DataTable } from '@/components/admin/data-table';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { FileUploadTrigger } from '@/components/admin/file-upload-trigger';
import { Badge } from '@/components/shadcn-ui/badge';
import { Input } from '@/components/shadcn-ui/input';
import { Label } from '@/components/shadcn-ui/label';
import { Link } from '@/components/shared/link';
import { OptimizedImage } from '@/components/shared/optimized-image';
import { TagPicker } from '@/components/shared/tag-picker';
import { useCrud } from '@/hooks/use-crud';
import { AdminBlog } from '@/lib/blog';
import type { ActionResponse } from '@/utils/action-response';
import { formatDate, formatSize } from '@/utils/utils';

// 表格列定义
const columns: Column<AdminBlog>[] = [
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
    key: 'lastUpdated',
    header: '更新时间',
    render: (file) => formatDate(file.lastUpdated),
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

type BlogCreateInput = { slug: string; content: string };
type BlogUpdateInput = { content: string; newSlug?: string };

export default function BlogClient({
  initialFiles,
}: {
  initialFiles: AdminBlog[];
}) {
  // === useCrud：blog adminGetBlog 返回 string(MDX) 而非 AdminBlog，
  // 所以不使用 hook 的 getDetail / openEditDialog，页面自处理编辑流程 ===
  const crud = useCrud<AdminBlog, BlogCreateInput, BlogUpdateInput>({
    getList: adminGetBlogs,
    create: adminCreateBlog,
    update: async (
      id: string,
      input: BlogUpdateInput
    ): Promise<ActionResponse<void>> => {
      const updateRes = await adminUpdateBlog(id, input.content);
      if (!updateRes.success) return updateRes;
      if (input.newSlug && input.newSlug !== id) {
        const renameRes = await adminRenameBlogFile(id, input.newSlug);
        if (!renameRes.success) return renameRes;
      }
      return { success: true, data: undefined };
    },
    delete: adminDeleteBlogFile,
    idField: 'slug',
    initialData: initialFiles,
    createSuccessMessage: '文件创建成功',
    updateSuccessMessage: '文件保存成功',
    deleteSuccessMessage: '文件删除成功',
  });

  const {
    items: files,
    loading,
    isSubmitting: isSaving,
    selectedItem: selectedFile,
    isCreateDialogOpen,
    isEditDialogOpen,
    isDeleteDialogOpen,
    editMode,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    openCreateDialog,
    openDeleteDialog,
    closeDialogs,
    setIsDeleteDialogOpen,
    setSubmitting,
    setSelectedItem,
    setEditMode,
    setIsEditDialogOpen,
  } = crud;

  // === 表单状态（页面独有） ===
  const [isUploading, setIsUploading] = useState(false);
  const [editFileName, setEditFileName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editThumbnail, setEditThumbnail] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editBody, setEditBody] = useState('');

  // 创建模式下清空表单
  useEffect(() => {
    if (isCreateDialogOpen) {
      setEditFileName('');
      setEditTitle('');
      setEditDescription('');
      setEditThumbnail('');
      setEditTags([]);
      setEditBody('');
    }
  }, [isCreateDialogOpen]);

  // create / edit 对话框合并（原页面共用一个 CrudFormDialog）
  const isFormDialogOpen = isCreateDialogOpen || isEditDialogOpen;
  const handleFormDialogOpenChange = (open: boolean) => {
    if (!open) closeDialogs();
  };

  // === 缩略图上传 ===
  const handleThumbnailUpload = async (list: FileList) => {
    const file = list[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('image', file);
      const result = await adminUploadBlogThumbnail(formData);
      if (!result.success) throw new Error(result.error || '上传失败');
      setEditThumbnail(result.data.url);
      toast.success(result.data.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '图片上传失败');
    }
  };

  // === 保存（组装 MDX，create 或 update） ===
  const handleSave = useCallback(async () => {
    setSubmitting(true);
    try {
      const lastUpdated = new Date().toISOString().split('T')[0];
      const mdxContent = `---
title: '${editTitle}'
description: '${editDescription}'
thumbnail: '${editThumbnail}'
lastUpdated: '${lastUpdated}'
tags:
${editTags.map((tag) => `  - '${tag}'`).join('\n')}
---

${editBody}`;

      if (editMode === 'create') {
        if (!editFileName.trim()) {
          toast.error('请输入文件名称');
          setSubmitting(false);
          return;
        }
        await createItem({ slug: editFileName.trim(), content: mdxContent });
      } else {
        if (!selectedFile) return;
        await updateItem(selectedFile.slug, {
          content: mdxContent,
          newSlug:
            editFileName.trim() !== selectedFile.slug
              ? editFileName.trim()
              : undefined,
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  }, [
    editMode,
    editFileName,
    editTitle,
    editDescription,
    editThumbnail,
    editTags,
    editBody,
    selectedFile,
    createItem,
    updateItem,
    setSubmitting,
  ]);

  // === Ctrl+S 快捷键保存（对话框打开时生效） ===
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFormDialogOpen && e.ctrlKey && e.code === 'KeyS') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, isFormDialogOpen]);

  // === handleEdit：页面自处理（因为 adminGetBlog 返回的是 string MDX 原文，不是 AdminBlog） ===
  const handleEdit = async (file: AdminBlog) => {
    try {
      const result = await adminGetBlog(file.slug);
      if (!result.success) throw new Error(result.error);

      // 填写 hook 状态：selectedItem, editMode='edit', open dialog
      setSelectedItem(file);
      setEditMode('edit');
      setEditFileName(file.slug);

      // Parse MDX frontmatter
      const frontmatterMatch = result.data.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const titleMatch = frontmatter.match(/title:\s*(.*)/);
        const descriptionMatch = frontmatter.match(/description:\s*(.*)/);
        const thumbnailMatch = frontmatter.match(/thumbnail:\s*(.*)/);
        const tagsMatch = frontmatter.match(/tags:\s*([\s\S]*?)(?=$|\n\w)/);

        setEditTitle(
          titleMatch ? titleMatch[1].trim().replace(/^['"]|['"]$/g, '') : ''
        );
        setEditDescription(
          descriptionMatch
            ? descriptionMatch[1].trim().replace(/^['"]|['"]$/g, '')
            : ''
        );
        setEditThumbnail(
          thumbnailMatch
            ? thumbnailMatch[1].trim().replace(/^['"]|['"]$/g, '')
            : ''
        );

        if (tagsMatch) {
          const tags = tagsMatch[1]
            .split('\n')
            .map((line) =>
              line
                .trim()
                .replace(/^\s*-\s*/, '')
                .replace(/^['"]|['"]$/g, '')
            )
            .filter((tag) => tag.length > 0);
          setEditTags(tags);
        } else {
          setEditTags([]);
        }
      }

      // Extract body content (after frontmatter)
      const bodyMatch = result.data.match(/^---[\s\S]*?---\n([\s\S]*)$/);
      setEditBody(bodyMatch ? bodyMatch[1] : '');

      setIsEditDialogOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取文件内容失败');
    }
  };

  // === 上传文件（使用 FileUploadTrigger 组件） ===
  const handleUpload = async (list: FileList) => {
    const file = list[0];
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
      await fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <AdminPageLayout
        title="文章列表"
        description={`共 ${files.length} 篇文章`}
        actions={[
          createRefreshAction(fetchItems, loading),
          createAddAction(openCreateDialog, '新增 MDX'),
        ]}
        primaryActions={[
          <FileUploadTrigger
            key="upload"
            id="mdx-upload"
            accept=".mdx"
            disabled={isUploading}
            onFileSelect={handleUpload}
          >
            {isUploading ? '上传中...' : '上传 MDX'}
            <Upload className="mr-2 h-4 w-4" />
          </FileUploadTrigger>,
        ]}
      >
        <DataTable
          data={files}
          columns={columns}
          isLoading={loading}
          loadingText="加载文章列表..."
          emptyText="暂无文章，请上传 MDX 文件"
          keyExtractor={(file) => file.slug}
          onEdit={handleEdit}
          onDelete={openDeleteDialog}
          actions={{ edit: true, delete: true }}
          virtual={true}
          virtualOptions={{
            estimateSize: 50,
            maxHeight: '65vh',
          }}
        />
      </AdminPageLayout>

      {/* 编辑对话框 */}
      <CrudFormDialog
        open={isFormDialogOpen}
        onOpenChange={handleFormDialogOpenChange}
        title={
          editMode === 'create'
            ? '新增 MDX 文件'
            : `编辑: ${selectedFile?.title}`
        }
        description={
          editMode === 'create'
            ? '请填写文章信息'
            : `文件名：${selectedFile?.fileName}`
        }
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        isSubmitting={isSaving}
        submitLabel={
          isSaving
            ? editMode === 'create'
              ? '创建中...'
              : '保存中...'
            : editMode === 'create'
              ? '创建'
              : '保存'
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="file-name">文件名</Label>
            <Input
              id="file-name"
              value={editFileName}
              onChange={(e) => setEditFileName(e.target.value)}
              placeholder="请输入文件名"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="请输入标题"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">描述</Label>
            <textarea
              id="description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="请输入描述"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="thumbnail">缩略图</Label>
            <div className="flex gap-2">
              <Input
                id="thumbnail"
                value={editThumbnail}
                onChange={(e) => setEditThumbnail(e.target.value)}
                placeholder="图片URL"
              />
              <FileUploadTrigger
                id="blog-thumbnail"
                accept="image/*"
                onFileSelect={handleThumbnailUpload}
              >
                <ImageIcon className="h-4 w-4" />
              </FileUploadTrigger>
            </div>
            {editThumbnail && (
              <OptimizedImage
                fill={process.env.NODE_ENV === 'development' ? true : false}
                previewable
                src={editThumbnail}
                alt="配图"
                containerClassName="self-start"
                className="max-h-48 max-w-xs rounded-lg object-cover"
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tags">标签</Label>
            <TagPicker value={editTags} onChange={setEditTags} type="blog" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="body">正文内容</Label>
            <textarea
              id="body"
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              placeholder="请输入正文内容（Markdown格式）"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[300px] w-full rounded-md border px-3 py-2 font-mono text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
      </CrudFormDialog>

      {/* 删除确认对话框 */}
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
        onConfirm={deleteItem}
        isDeleting={isSaving}
      />
    </>
  );
}
