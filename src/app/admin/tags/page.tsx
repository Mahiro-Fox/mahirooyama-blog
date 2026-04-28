'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Tag } from 'lucide-react';
import { toast } from 'sonner';

import { getTagTypeConfig, TAG_TYPES } from '@/lib/tag-config';
import type { TagType as TagCategory, Tag as TagType } from '@/lib/tag-store';
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

export default function TagsManagementPage() {
  const [tags, setTags] = useState<{
    blog: Record<string, TagType>;
    gallery: Record<string, TagType>;
  }>({ blog: {}, gallery: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TagCategory>('blog');

  // 对话框状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);
  const [deletingTag, setDeletingTag] = useState<TagType | null>(null);

  // 表单状态
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  // 获取当前标签类型配置
  const activeConfig = getTagTypeConfig(activeTab);

  // 获取所有标签
  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      if (!response.ok) throw new Error('获取标签失败');
      const data = await response.json();
      setTags(data);
    } catch {
      toast.error('获取标签失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  // 打开创建对话框
  const openCreateDialog = () => {
    setFormData(INITIAL_FORM_DATA);
    setCreateDialogOpen(true);
  };

  // 打开编辑对话框
  const openEditDialog = (tag: TagType) => {
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
  const openDeleteDialog = (tag: TagType) => {
    setDeletingTag(tag);
    setDeleteDialogOpen(true);
  };

  // 创建标签
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          type: activeTab,
          description: formData.description || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '创建标签失败');
      }

      toast.success('标签创建成功');
      setCreateDialogOpen(false);
      fetchTags();
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
      const response = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          name: formData.name,
          icon: formData.icon,
          description: formData.description || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '更新标签失败');
      }

      toast.success('标签更新成功');
      setEditDialogOpen(false);
      setEditingTag(null);
      fetchTags();
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
      const response = await fetch(
        `/api/tags/${deletingTag.id}?type=${activeTab}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '删除标签失败');
      }

      toast.success('标签已删除');
      setDeleteDialogOpen(false);
      setDeletingTag(null);
      fetchTags();
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
      const response = await fetch('/api/tags/reset', { method: 'POST' });
      if (!response.ok) throw new Error('重置失败');
      toast.success('已重置为默认标签');
      fetchTags();
    } catch {
      toast.error('重置标签失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentTags = Object.values(tags[activeTab]);

  return (
    <div className="container mx-auto px-4 py-8">
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
    </div>
  );
}
