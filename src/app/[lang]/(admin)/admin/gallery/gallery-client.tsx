'use client';

import { Image as ImageIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import {
  adminCreateGallery,
  adminDeleteGalleryFile,
  adminGetGalleries,
  adminGetGallery,
  adminRenameGalleryFile,
  adminUpdateGallery,
  adminUploadGalleryFile,
  adminUploadGalleryThumbnail,
} from '@/actions/admin/gallery-actions';
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
import type { ActionResponse } from '@/utils/action-response';
import { formatDate, formatSize } from '@/utils/utils';

// 截断文本
const truncate = (text: string, maxLen: number) => {
  if (!text) return '-';
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
};

// 表格列定义
const columns: Column<AdminGallery>[] = [
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
        title={file.thumbnail}
      >
        {truncate(file.thumbnail, 30)}
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

// 传入 useCrud.create/createItem 的参数
type GalleryCreateInput = { slug: string; content: string };
// updateInput 中 content 是必填，newSlug 只有发生变化时才传
type GalleryUpdateInput = { content: string; newSlug?: string };

// === 表单对话框（编辑/新增） ===
function GalleryFormDialog({
  open,
  onOpenChange,
  editMode,
  selectedFile,
  isSaving,
  editFileName,
  setEditFileName,
  editTitle,
  setEditTitle,
  editDescription,
  setEditDescription,
  editThumbnail,
  setEditThumbnail,
  editTags,
  setEditTags,
  onSubmit,
  onThumbnailUpload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMode: 'create' | 'edit';
  selectedFile: AdminGallery | null;
  isSaving: boolean;
  editFileName: string;
  setEditFileName: (value: string) => void;
  editTitle: string;
  setEditTitle: (value: string) => void;
  editDescription: string;
  setEditDescription: (value: string) => void;
  editThumbnail: string;
  setEditThumbnail: (value: string) => void;
  editTags: string[];
  setEditTags: (value: string[]) => void;
  onSubmit: (e: React.FormEvent) => void;
  onThumbnailUpload: (list: FileList) => void;
}) {
  return (
    <CrudFormDialog
      open={open}
      onOpenChange={onOpenChange}
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
      onSubmit={onSubmit}
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
              onFileSelect={onThumbnailUpload}
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
          <TagPicker value={editTags} onChange={setEditTags} type="gallery" />
        </div>
      </div>
    </CrudFormDialog>
  );
}

// === 删除确认对话框 ===
function GalleryDeleteDialog({
  open,
  onOpenChange,
  selectedFile,
  onConfirm,
  isDeleting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFile: AdminGallery | null;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="确认删除"
      description={
        <>
          确定要删除图片 <strong>{selectedFile?.title}</strong>{' '}
          吗？此操作不可恢复。
        </>
      }
      onConfirm={onConfirm}
      isDeleting={isDeleting}
    />
  );
}

export default function GalleryClient({
  initialFiles,
}: {
  initialFiles: AdminGallery[];
}) {
  // === useCrud：把"更新内容+可选重命名"两步封装到 update ===
  const crud = useCrud<AdminGallery, GalleryCreateInput, GalleryUpdateInput>({
    getList: adminGetGalleries,
    getDetail: (slug) => adminGetGallery(slug),
    create: adminCreateGallery,
    update: async (
      id: string,
      input: GalleryUpdateInput
    ): Promise<ActionResponse<void>> => {
      // 1. 更新内容
      const updateRes = await adminUpdateGallery(id, input.content);
      if (!updateRes.success) return updateRes;
      // 2. 若 slug 变更，则执行重命名
      if (input.newSlug && input.newSlug !== id) {
        const renameRes = await adminRenameGalleryFile(id, input.newSlug);
        if (!renameRes.success) return renameRes;
      }
      return { success: true, data: undefined };
    },
    delete: adminDeleteGalleryFile,
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
    openCreateDialog: internalOpenCreate,
    openEditDialog: internalOpenEdit,
    openDeleteDialog,
    closeDialogs,
    setIsDeleteDialogOpen,
  } = crud;

  // === 表单状态（页面独有） ===
  const [isUploading, setIsUploading] = useState(false);
  const [editFileName, setEditFileName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editThumbnail, setEditThumbnail] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);

  // 创建模式下清空表单（渲染期间重置，避免打开时闪现旧值）
  const [prevCreateOpen, setPrevCreateOpen] = useState(isCreateDialogOpen);
  if (isCreateDialogOpen && !prevCreateOpen) {
    setPrevCreateOpen(true);
    setEditFileName('');
    setEditTitle('');
    setEditDescription('');
    setEditThumbnail('');
    setEditTags([]);
  }
  if (!isCreateDialogOpen && prevCreateOpen) {
    setPrevCreateOpen(false);
  }

  // 编辑模式下：openEditDialog 已经调了 getDetail 并把 detail 放进 selectedItem
  // 这里把 selectedItem 中的 Gallery detail 拆到表单字段
  useEffect(() => {
    if (isEditDialogOpen && selectedFile) {
      const data = selectedFile as AdminGallery;
      // 原始 slug（用于对比重命名）
      setEditFileName(data.slug);
      setEditTitle(data.title || '');
      setEditDescription(data.description || '');
      setEditThumbnail(data.thumbnail || '');
      setEditTags(data.tags || []);
    }
  }, [isEditDialogOpen, selectedFile]);

  // 把 create/edit dialog 合并成同一个 CrudFormDialog（原页面共用一个）
  const isFormDialogOpen = isCreateDialogOpen || isEditDialogOpen;
  const handleFormDialogOpenChange = (open: boolean) => {
    if (!open) closeDialogs();
  };

  // openCreateDialog：包装一层，保持原句柄名（或直接用 internalOpenCreate）
  const handleCreate = internalOpenCreate;
  // openEditDialog：直接调用 hook 版（内部已处理 getDetail）
  const handleEdit = internalOpenEdit;

  // === 缩略图上传（页面特殊逻辑，保留） ===
  const handleThumbnailUpload = async (list: FileList) => {
    const file = list[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('image', file);

      const result = await adminUploadGalleryThumbnail(formData);

      if (!result.success) {
        throw new Error(result.error || '上传失败');
      }

      setEditThumbnail(result.data.url);
      toast.success(result.data.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '图片上传失败');
    }
  };

  // === 保存（create 或 update），组装 JSON 后调 useCrud ===
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const lastUpdated = new Date().toISOString().split('T')[0];
    const content = JSON.stringify(
      {
        title: editTitle,
        description: editDescription,
        thumbnail: editThumbnail,
        lastUpdated,
        tags: editTags,
      },
      null,
      2
    );

    if (editMode === 'create') {
      if (!editFileName.trim()) {
        toast.error('请输入文件名称');
        return;
      }
      await createItem({
        slug: editFileName.trim(),
        content,
      });
    } else {
      if (!selectedFile) return;
      const oldSlug = selectedFile.slug;
      await updateItem(oldSlug, {
        content,
        newSlug:
          editFileName.trim() !== oldSlug ? editFileName.trim() : undefined,
      });
    }
  };

  // === 文件上传（走旧 API route，页面特殊逻辑，保留） ===
  const handleUpload = async (list: FileList) => {
    const file = list[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      toast.error('只支持 .json 文件');
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await adminUploadGalleryFile(formData);
      if (!result.success) throw new Error(result.error || '上传失败');
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
          onDelete={openDeleteDialog}
          actions={{ edit: true, delete: true }}
          virtual={true}
          virtualOptions={{
            estimateSize: 50,
            maxHeight: '65vh',
          }}
        />
      </AdminPageLayout>

      {/* 编辑/新增对话框 */}
      <GalleryFormDialog
        open={isFormDialogOpen}
        onOpenChange={handleFormDialogOpenChange}
        editMode={editMode}
        selectedFile={selectedFile}
        isSaving={isSaving}
        editFileName={editFileName}
        setEditFileName={setEditFileName}
        editTitle={editTitle}
        setEditTitle={setEditTitle}
        editDescription={editDescription}
        setEditDescription={setEditDescription}
        editThumbnail={editThumbnail}
        setEditThumbnail={setEditThumbnail}
        editTags={editTags}
        setEditTags={setEditTags}
        onSubmit={handleSave}
        onThumbnailUpload={handleThumbnailUpload}
      />

      {/* 删除确认对话框 */}
      <GalleryDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        selectedFile={selectedFile}
        onConfirm={deleteItem}
        isDeleting={isSaving}
      />
    </>
  );
}
