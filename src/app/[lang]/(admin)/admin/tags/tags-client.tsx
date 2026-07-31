'use client';

import { Tag, TAG_TYPES, TagsData, TagType } from '@/constant';
import { Tag as LucideTag, RefreshCwIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  adminCreateTag,
  adminDeleteTag,
  adminGetTags,
  adminResetTags,
  adminUpdateTag,
} from '@/actions/admin/tag-actions';
import {
  AdminPageLayout,
  createAddAction,
  createRefreshAction,
} from '@/components/admin/admin-page-layout';
import { CrudFormDialog } from '@/components/admin/crud-form-dialog';
import { DataTable, type Column } from '@/components/admin/data-table';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Input } from '@/components/shadcn-ui/input';
import { Label } from '@/components/shadcn-ui/label';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/shadcn-ui/tabs';
import { BrandIcons } from '@/components/shared/brand-icons';
import { IconPicker } from '@/components/shared/icon-picker';
import { Link } from '@/components/shared/link';
import { getTagTypeConfig } from '@/config/tag';
import { formatDate } from '@/utils/utils';

// 表格列定义
const getColumns = (type: TagType): Column<Tag>[] => [
  {
    key: 'icon',
    header: '图标',
    width: 'w-[50px]',
    render: (tag) => {
      const IconComponent =
        BrandIcons[tag.icon as keyof typeof BrandIcons] || LucideTag;
      return <IconComponent className="h-4 w-4" />;
    },
  },
  {
    key: 'id',
    header: 'ID',
    render: (tag) => (
      <Link
        href={`/tag/${type}/${tag.id}`}
        className="font-mono text-xs hover:underline"
      >
        {tag.id}
      </Link>
    ),
  },
  {
    key: 'name',
    header: '名称',
    render: (tag) => <span className="font-medium">{tag.name}</span>,
  },
  {
    key: 'lastUpdated',
    header: '更新时间',
    render: (tag) => (
      <span className="text-muted-foreground">
        {formatDate(tag.lastUpdated)}
      </span>
    ),
  },
  {
    key: 'description',
    header: '描述',
    render: (tag) => (
      <span className="text-muted-foreground max-w-xs truncate">
        {tag.description || '-'}
      </span>
    ),
  },
];

const INITIAL_FORM_DATA = {
  id: '',
  name: '',
  icon: 'default',
  description: '',
};

export default function TagsClient({ initialTags }: { initialTags: TagsData }) {
  const [tags, setTags] = useState<TagsData>(initialTags);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TagType>('blog');

  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null);

  // 表单状态
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  // 获取当前标签类型配置
  const activeConfig = getTagTypeConfig(activeTab);

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const result = await adminGetTags();
      if (!result.success) {
        throw new Error('获取标签失败');
      }
      setTags(result.data);
    } catch {
      toast.error('获取标签失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 打开创建对话框
  const openCreateDialog = () => {
    setFormData(INITIAL_FORM_DATA);
    setIsEditing(false);
    setEditingTag(null);
    setDialogOpen(true);
  };

  // 打开编辑对话框
  const openEditDialog = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      id: tag.id,
      name: tag.name,
      icon: tag.icon,
      description: tag.description || '',
    });
    setIsEditing(true);
    setDialogOpen(true);
  };

  // 打开删除对话框
  const openDeleteDialog = (tag: Tag) => {
    setDeletingTag(tag);
    setDeleteDialogOpen(true);
  };

  // 创建标签
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name) return;

    setIsSubmitting(true);
    try {
      const result = await adminCreateTag({
        ...formData,
        type: activeTab,
        description: formData.description || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || '创建标签失败');
      }

      toast.success('标签创建成功');
      setDialogOpen(false);
      await fetchTags();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建标签失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 更新标签
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag) return;

    setIsSubmitting(true);
    try {
      const result = await adminUpdateTag({
        id: editingTag.id,
        type: activeTab,
        name: formData.name,
        icon: formData.icon,
        description: formData.description || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || '更新标签失败');
      }

      toast.success('标签更新成功');
      setDialogOpen(false);
      setEditingTag(null);
      await fetchTags();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新标签失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除标签
  const handleDelete = async () => {
    if (!deletingTag) return;

    setIsSubmitting(true);
    try {
      const result = await adminDeleteTag({
        id: deletingTag.id,
        type: activeTab,
      });

      if (!result.success) {
        throw new Error(result.error || '删除标签失败');
      }

      toast.success('标签已删除');
      setDeleteDialogOpen(false);
      setDeletingTag(null);
      await fetchTags();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除标签失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 重置为默认标签
  const handleReset = async () => {
    if (!confirm('确定要重置为默认标签吗？这将删除所有自定义标签。')) return;

    setIsSubmitting(true);
    try {
      const result = await adminResetTags();
      if (!result.success) {
        throw new Error(result.error || '重置失败');
      }
      toast.success('已重置为默认标签');
      setTags(result.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '重置标签失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AdminPageLayout
        title="标签管理"
        description="管理博客文章和图库的标签分类"
        actions={[
          {
            label: '重置为默认标签',
            icon: <RefreshCwIcon className="mr-2 h-4 w-4" />,
            onClick: () => handleReset(),
            variant: 'outline' as const,
          },
          createRefreshAction(fetchTags, isSubmitting),
          createAddAction(openCreateDialog, '创建标签'),
        ]}
        loading={isLoading}
      >
        <Tabs
          value={activeTab}
          onValueChange={(v: string) => setActiveTab(v as TagType)}
        >
          <TabsList className="mb-4 flex gap-2">
            {TAG_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <TabsTrigger
                  key={type.id}
                  value={type.id}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {type.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {TAG_TYPES.map((type) => (
            <TabsContent key={type.id} value={type.id}>
              <DataTable
                data={Object.values(tags[type.id])}
                columns={getColumns(type.id)}
                isLoading={isLoading}
                loadingText="加载中..."
                emptyText="暂无标签，点击上方按钮创建"
                keyExtractor={(tag) => tag.id}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
                actions={{ edit: true, delete: true }}
                virtual={true}
                virtualOptions={{
                  estimateSize: 50,
                  maxHeight: '65vh',
                }}
              />
            </TabsContent>
          ))}
        </Tabs>
      </AdminPageLayout>

      {/* 标签表单对话框 */}
      <CrudFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={isEditing ? '编辑标签' : `创建${activeConfig.name}标签`}
        description={
          isEditing ? '修改标签信息' : `创建一个新的${activeConfig.description}`
        }
        onSubmit={isEditing ? handleUpdate : handleCreate}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? '保存' : '创建'}
      >
        <div className="max-h-[calc(100vh-200px)] space-y-4 overflow-y-auto">
          <Label htmlFor="tag-id">标签 ID</Label>
          <Input
            id="tag-id"
            value={formData.id}
            onChange={(e) =>
              setFormData({
                ...formData,
                id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
              })
            }
            placeholder="如: typescript"
            disabled={isEditing}
            required
          />
          {!isEditing && (
            <p className="text-muted-foreground text-xs">
              只能使用小写字母、数字和连字符
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tag-name">标签名称</Label>
          <Input
            id="tag-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="如: TypeScript"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>图标</Label>
          <IconPicker
            value={formData.icon}
            onChange={(value) => setFormData({ ...formData, icon: value })}
            placeholder="选择图标"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tag-description">描述（可选）</Label>
          <Input
            id="tag-description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="简短描述这个标签"
          />
        </div>
      </CrudFormDialog>

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="确认删除"
        description={
          <>
            确定要删除标签 <strong>{deletingTag?.name}</strong>{' '}
            吗？此操作不可恢复。
          </>
        }
        onConfirm={handleDelete}
        isDeleting={isSubmitting}
      />
    </>
  );
}
