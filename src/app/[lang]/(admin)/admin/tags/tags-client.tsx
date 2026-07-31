'use client';

import { Tag, TAG_TYPES, TagsData, TagType } from '@/constant';
import { Tag as LucideTag, RefreshCwIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
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
import { useCrud } from '@/hooks/use-crud';
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
  // Tags 的 items 结构 { blog: Tag[], gallery: Tag[] } 过于特殊，
  // 不用 useCrud 的 setItems 管理，仅复用：
  //   isSubmitting / 对话框控制 (createItem/updateItem/deleteItem 不通过 hook)
  // 所以传 never 给 Create/Update 类型，create/update 留空（可选）
  const crud = useCrud<Tag, never, never>({
    // getList 占位：实际我们用 fetchTags 直接返回 TagsData
    getList: async () => ({ success: true, data: [] as Tag[] }),
    delete: async (compositeId: string) => {
      // compositeId = `${type}::${id}`（由 delete 前手动拼装传入）
      const [type, id] = compositeId.split('::') as [TagType, string];
      return adminDeleteTag({ id, type });
    },
    idField: 'id',
    initialData: [],
    deleteSuccessMessage: '标签已删除',
  });

  const {
    isSubmitting,
    selectedItem,
    isCreateDialogOpen,
    isEditDialogOpen,
    isDeleteDialogOpen,
    editMode,
    openDeleteDialog: internalOpenDelete,
    closeDialogs,
    deleteItem,
    setIsDeleteDialogOpen,
    setIsEditDialogOpen,
    setSelectedItem,
    setEditMode,
    setSubmitting,
  } = crud;
  // 删除对话框里显示用的"待删除 tag"，因为我们把 id 拼成了 type::id，
  // 显示时优先取 name，否则显示 id。
  const deletingTag = selectedItem;

  // === 页面独有状态（TagsData、activeTab、formData 等） ===
  const [tags, setTags] = useState<TagsData>(initialTags);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TagType>('blog');
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const activeConfig = getTagTypeConfig(activeTab);

  // create/edit 对话框合并（原页面共用一个 dialogOpen）
  const dialogOpen = isCreateDialogOpen || isEditDialogOpen;
  const isEditing = editMode === 'edit';
  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      closeDialogs();
      setEditingTag(null);
    }
  };

  // === fetchTags：页面独有的 TagsData 接口 ===
  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const result = await adminGetTags();
      if (!result.success) throw new Error('获取标签失败');
      setTags(result.data);
    } catch {
      toast.error('获取标签失败');
    } finally {
      setIsLoading(false);
    }
  };

  // === openCreateDialog（hook 的 openCreateDialog + 清空 formData）===
  const openCreateDialog = () => {
    setFormData(INITIAL_FORM_DATA);
    setEditingTag(null);
    crud.openCreateDialog();
  };

  // === openEditDialog（填充 formData + 打开编辑对话框）===
  const openEditDialog = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      id: tag.id,
      name: tag.name,
      icon: tag.icon,
      description: tag.description || '',
    });
    setSelectedItem(tag);
    setEditMode('edit');
    setIsEditDialogOpen(true);
  };

  // === openDeleteDialog：复合主键 {id, type}，我们手动把 type 加到 id 里传给 deleteItem ===
  const openDeleteDialog = (tag: Tag) => {
    // hack：把 "type::id" 存到一个 clone 出来的 Tag.id，
    // 这样 deleteItem 时能正确取出 compositeId 再拆
    internalOpenDelete({ ...tag, id: `${activeTab}::${tag.id}` } as Tag);
  };

  // 打开编辑对话框时也要同步回填（因为我们用 editingTag 填充了 formData）
  useEffect(() => {
    if (isEditDialogOpen && selectedItem && !editingTag) {
      // fallback: 如果是通过 openEditDialog 以外的路径打开
      setEditingTag(selectedItem);
    }
  }, [isEditDialogOpen, selectedItem, editingTag]);

  // === 创建标签 ===
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name) return;
    setSubmitting(true);
    try {
      const result = await adminCreateTag({
        ...formData,
        type: activeTab,
        description: formData.description || undefined,
      });
      if (!result.success) throw new Error(result.error || '创建标签失败');
      toast.success('标签创建成功');
      closeDialogs();
      await fetchTags();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建标签失败');
    } finally {
      setSubmitting(false);
    }
  };

  // === 更新标签 ===
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag) return;
    setSubmitting(true);
    try {
      const result = await adminUpdateTag({
        id: editingTag.id,
        type: activeTab,
        name: formData.name,
        icon: formData.icon,
        description: formData.description || undefined,
      });
      if (!result.success) throw new Error(result.error || '更新标签失败');
      toast.success('标签更新成功');
      closeDialogs();
      setEditingTag(null);
      await fetchTags();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新标签失败');
    } finally {
      setSubmitting(false);
    }
  };

  // === 删除标签 ===
  const handleDelete = async () => {
    await deleteItem();
    // 调用页面独有的 TagsData 接口，刷新标签列表
    fetchTags();
  };

  // === 重置标签 ===
  const handleReset = async () => {
    if (!confirm('确定要重置为默认标签吗？这将删除所有自定义标签。')) return;
    setSubmitting(true);
    try {
      const result = await adminResetTags();
      if (!result.success) throw new Error(result.error || '重置失败');
      toast.success('已重置为默认标签');
      setTags(result.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '重置标签失败');
    } finally {
      setSubmitting(false);
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
          createRefreshAction(fetchTags, isLoading),
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
        onOpenChange={handleDialogOpenChange}
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

          <div className="space-y-2">
            <Label htmlFor="tag-name">标签名称</Label>
            <Input
              id="tag-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
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
        </div>
      </CrudFormDialog>

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="确认删除"
        description={
          <>
            确定要删除标签{' '}
            <strong>
              {
                // 删除时 id 被拼成 "type::tagId"，为了显示名还原显示
                deletingTag?.name ||
                  (deletingTag?.id.includes('::')
                    ? deletingTag.id.split('::')[1]
                    : deletingTag?.id)
              }
            </strong>{' '}
            吗？此操作不可恢复。
          </>
        }
        onConfirm={handleDelete}
        isDeleting={isSubmitting}
      />
    </>
  );
}
