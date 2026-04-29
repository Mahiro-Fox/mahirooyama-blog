'use client';

import { useEffect, useState } from 'react';
import type { TagType as TagCategory, Tag as TagModel, TagsData } from '@/store/tag-store';
import { Plus, RefreshCw, Tag } from 'lucide-react';
import { toast } from 'sonner';

import {
  adminCreateTag,
  adminDeleteTag,
  adminGetTags,
  adminResetTags,
  adminUpdateTag,
} from '@/actions/admin/tag-actions';
import { getTagTypeConfig, TAG_TYPES } from '@/config/tag-config';
import { Button } from '@/components/shadcn-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn-ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/shadcn-ui/tabs';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { TagFormDialog } from '@/components/admin/tag-form-dialog';
import { TagsTable } from '@/components/admin/tags-table';

// 表单数据初始状态
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
  const [activeTab, setActiveTab] = useState<TagCategory>('blog');

  // 对话框状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagModel | null>(null);
  const [deletingTag, setDeletingTag] = useState<TagModel | null>(null);

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
      setTags(result.tags);
    } catch {
      toast.error('获取标签失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // server 已给首屏数据，这里不强制刷新
  }, []);

  // 打开创建对话框
  const openCreateDialog = () => {
    setFormData(INITIAL_FORM_DATA);
    setCreateDialogOpen(true);
  };

  // 打开编辑对话框
  const openEditDialog = (tag: TagModel) => {
    setEditingTag(tag);
    setFormData({
      id: tag.id,
      name: tag.name,
      icon: tag.icon,
      description: tag.description || '',
    });
    setEditDialogOpen(true);
  };

  // 打开删除对话框
  const openDeleteDialog = (tag: TagModel) => {
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
      setCreateDialogOpen(false);
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
      setEditDialogOpen(false);
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
      setTags(result.tags);
    } catch {
      toast.error('重置标签失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                标签管理
              </CardTitle>
              <CardDescription>管理博客文章和图库的标签分类</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                重置默认
              </Button>
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                创建标签
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v: string) => setActiveTab(v as TagCategory)}
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
                <TagsTable
                  type={type.id}
                  tags={Object.values(tags[type.id])}
                  isLoading={isLoading}
                  onEdit={openEditDialog}
                  onDelete={openDeleteDialog}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* 创建标签对话框 */}
      <TagFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title={`创建${activeConfig.name}标签`}
        description={`创建一个新的${activeConfig.description}`}
        data={formData}
        onDataChange={setFormData}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
        isEditing={false}
      />

      {/* 编辑标签对话框 */}
      <TagFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="编辑标签"
        description="修改标签信息"
        data={formData}
        onDataChange={setFormData}
        onSubmit={handleUpdate}
        isSubmitting={isSubmitting}
        isEditing={true}
      />

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
