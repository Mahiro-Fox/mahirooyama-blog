'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  adminCreateGalleryFile,
  adminDeleteGalleryFile,
  adminGetGalleryFile,
  adminGetGalleryFiles,
  adminRenameGalleryFile,
  adminUpdateGalleryFile,
  adminUploadGalleryThumbnail,
  type GalleryFile,
} from '@/actions/admin/gallery-actions';
import { formatDate, formatSize } from '@/utils/utils';
import { Image as ImageIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/shadcn-ui/badge';
import { Input } from '@/components/shadcn-ui/input';
import { Label } from '@/components/shadcn-ui/label';
import {
  AdminPageLayout,
  createAddAction,
  createRefreshAction,
} from '@/components/admin/admin-page-layout';
import { CrudFormDialog } from '@/components/admin/crud-form-dialog';
import { Column, DataTable } from '@/components/admin/data-table';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { FileUploadTrigger } from '@/components/admin/file-upload-trigger';
import { TagPicker } from '@/components/shared/tag-picker';

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
    width: 'max-w-20',
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

export default function GalleryClient({
  initialFiles,
}: {
  initialFiles: GalleryFile[];
}) {
  const [files, setFiles] = useState<GalleryFile[]>(initialFiles);
  const [loading, setLoading] = useState(false);

  // 本地状态
  const [selectedFile, setSelectedFile] = useState<GalleryFile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('edit');
  const [editFileName, setEditFileName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editThumbnail, setEditThumbnail] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // 刷新文件列表
  const fetchItems = async () => {
    setLoading(true);
    try {
      const result = await adminGetGalleryFiles();
      if (!result.success) {
        throw new Error(result.error);
      }
      setFiles(result.files);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 新增文件
  const handleCreate = () => {
    setEditMode('create');
    setSelectedFile(null);
    setEditFileName('');
    setEditTitle('');
    setEditDescription('');
    setEditThumbnail('');
    setEditTags([]);
    setIsEditDialogOpen(true);
  };

  // 编辑文件
  const handleEdit = async (file: GalleryFile) => {
    try {
      const result = await adminGetGalleryFile(file.slug);
      if (!result.success) {
        throw new Error(result.error);
      }
      setEditMode('edit');
      setSelectedFile(file);
      setEditFileName(file.slug);

      // Parse JSON content
      try {
        const parsed = JSON.parse(result.content);
        setEditTitle(parsed.title || '');
        setEditDescription(parsed.description || '');
        setEditThumbnail(parsed.thumbnail || '');
        setEditTags(parsed.tags || []);
      } catch {
        toast.error('JSON 解析失败');
        return;
      }

      setIsEditDialogOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取文件内容失败');
    }
  };

  // 缩略图上传处理
  const handleThumbnailUpload = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('image', file);

      const result = await adminUploadGalleryThumbnail(formData);

      if (!result.success) {
        throw new Error(result.error || '上传失败');
      }

      setEditThumbnail(result.url);
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '图片上传失败');
    }
  };

  // 保存（新增或编辑）
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Generate JSON content from form fields
      const lastUpdated = new Date().toISOString().split('T')[0];

      const jsonContent = JSON.stringify(
        {
          title: editTitle,
          description: editDescription,
          thumbnail: editThumbnail,
          lastUpdated: lastUpdated,
          tags: editTags,
        },
        null,
        2
      );

      if (editMode === 'create') {
        if (!editFileName.trim()) {
          toast.error('请输入文件名称');
          setIsSaving(false);
          return;
        }
        const result = await adminCreateGalleryFile({
          slug: editFileName.trim(),
          content: jsonContent,
        });
        if (!result.success) {
          throw new Error(result.error);
        }
        toast.success('文件创建成功');
      } else {
        if (!selectedFile) return;

        // 更新内容
        const saveResult = await adminUpdateGalleryFile(
          selectedFile.slug,
          jsonContent
        );
        if (!saveResult.success) {
          throw new Error(saveResult.error);
        }

        // 如果文件名变更，执行重命名
        if (editFileName.trim() !== selectedFile.slug) {
          const renameResult = await adminRenameGalleryFile(
            selectedFile.slug,
            editFileName.trim()
          );
          if (!renameResult.success) {
            throw new Error(renameResult.error);
          }
        }
        toast.success('文件保存成功');
      }
      setIsEditDialogOpen(false);
      await fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedFile,
    editMode,
    editFileName,
    editTitle,
    editDescription,
    editThumbnail,
    editTags,
  ]);

  // 上传文件（使用 FileUploadTrigger 组件）
  const handleUpload = async (files: FileList) => {
    const file = files[0];
    if (!file) return;
    const isJson = file.name.endsWith('.json');
    if (!isJson) {
      toast.error('只支持 .json 文件');
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
      await fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '上传失败');
    } finally {
      setIsUploading(false);
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
    try {
      const result = await adminDeleteGalleryFile(selectedFile.slug);
      if (!result.success) {
        throw new Error(result.error);
      }
      toast.success('文件删除成功');
      setIsDeleteDialogOpen(false);
      setSelectedFile(null);
      await fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  return (
    <>
      <AdminPageLayout
        title="图片列表"
        description={`共 ${files.length} 张图片`}
        actions={[
          createRefreshAction(fetchItems, loading),
          createAddAction(handleCreate, '新增 JSON'),
        ]}
        primaryActions={[
          <FileUploadTrigger
            key="upload"
            id="json-upload"
            accept=".json"
            disabled={isUploading}
            onFileSelect={handleUpload}
          >
            {isUploading ? '上传中...' : '上传 JSON'}
            <Upload className="mr-2 h-4 w-4" />
          </FileUploadTrigger>,
        ]}
      >
        {/* 数据表格 */}
        <DataTable
          data={files}
          columns={columns}
          isLoading={loading}
          loadingText="加载图片列表..."
          emptyText="暂无图片，请上传 JSON 文件或新增配置"
          keyExtractor={(file) => file.slug}
          onEdit={handleEdit}
          onDelete={openDelete}
          actions={{ edit: true, delete: true }}
          virtual={true}
          virtualOptions={{
            estimateSize: 50,
            maxHeight: '65vh',
          }}
        />
      </AdminPageLayout>

      {/* 编辑/新增对话框 */}
      <CrudFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title={
          editMode === 'create'
            ? '新增 JSON 文件'
            : `编辑: ${selectedFile?.title}`
        }
        description={
          editMode === 'create'
            ? '创建新的 Gallery 配置文件'
            : selectedFile?.fileName
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
                id="gallery-thumbnail"
                accept="image/*"
                onFileSelect={handleThumbnailUpload}
              >
                <ImageIcon className="h-4 w-4" />
              </FileUploadTrigger>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tags">标签</Label>
            <TagPicker value={editTags} onChange={setEditTags} type="gallery" />
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
            确定要删除图片 <strong>{selectedFile?.title}</strong>{' '}
            吗？此操作不可恢复。
          </>
        }
        onConfirm={handleDelete}
        isDeleting={isSaving}
      />
    </>
  );
}
