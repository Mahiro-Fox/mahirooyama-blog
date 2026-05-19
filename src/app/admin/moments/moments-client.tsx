'use client';

import { useCallback, useState } from 'react';
import {
  adminCreateMoment,
  adminDeleteMoment,
  adminGetMoments,
  adminUpdateMoment,
  adminUploadMomentImage,
  type Moment,
} from '@/actions/admin/moments-actions';
import { MOOD_OPTIONS } from '@/constant/moods';
import { formatDate } from '@/utils/utils';
import { Edit, Image as ImageIcon, MapPin, Smile, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/shadcn-ui/button';
import { Input } from '@/components/shadcn-ui/input';
import {
  AdminPageLayout,
  createAddAction,
  createRefreshAction,
} from '@/components/admin/admin-page-layout';
import { CrudFormDialog } from '@/components/admin/crud-form-dialog';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { FileUploadTrigger } from '@/components/admin/file-upload-trigger';

export default function MomentsClient({
  initialMoments,
}: {
  initialMoments: Moment[];
}) {
  const [moments, setMoments] = useState<Moment[]>(initialMoments);
  const [loading, setLoading] = useState(false);

  // 本地状态
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');

  // 表单状态
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [moodEmoji, setMoodEmoji] = useState('');
  const [location, setLocation] = useState('');

  // 刷新列表
  const fetchItems = async () => {
    setLoading(true);
    try {
      const result = await adminGetMoments();
      if (!result.success) {
        throw new Error(result.error);
      }
      setMoments(result.moments);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '获取碎碎念列表失败'
      );
    } finally {
      setLoading(false);
    }
  };

  // 新增碎碎念
  const handleCreate = () => {
    setEditMode('create');
    setSelectedMoment(null);
    setContent('');
    setImageUrl('');
    setMoodEmoji('');
    setLocation('');
    setIsFormDialogOpen(true);
  };

  // 编辑碎碎念
  const handleEdit = (moment: Moment) => {
    setEditMode('edit');
    setSelectedMoment(moment);
    setContent(moment.content);
    setImageUrl(moment.imageUrl || '');
    setMoodEmoji(moment.moodEmoji || '');
    setLocation(moment.location || '');
    setIsFormDialogOpen(true);
  };

  // 保存（新增或编辑）
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editMode === 'create') {
        const result = await adminCreateMoment({
          content,
          imageUrl: imageUrl || undefined,
          moodEmoji: moodEmoji || undefined,
          location: location || undefined,
        });
        if (!result.success) {
          throw new Error(result.error);
        }
        toast.success('碎碎念发布成功');
      } else {
        if (!selectedMoment) return;
        const result = await adminUpdateMoment(selectedMoment.id, {
          content,
          imageUrl: imageUrl || undefined,
          moodEmoji: moodEmoji || undefined,
          location: location || undefined,
        });
        if (!result.success) {
          throw new Error(result.error);
        }
        toast.success('碎碎念更新成功');
      }
      setIsFormDialogOpen(false);
      await fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 打开删除对话框
  const openDelete = (moment: Moment) => {
    setSelectedMoment(moment);
    setIsDeleteDialogOpen(true);
  };

  // 执行删除
  const handleDelete = async () => {
    if (!selectedMoment) return;
    try {
      const result = await adminDeleteMoment(selectedMoment.id);
      if (!result.success) {
        throw new Error(result.error);
      }
      toast.success('碎碎念删除成功');
      setIsDeleteDialogOpen(false);
      setSelectedMoment(null);
      await fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  // 图片上传处理
  const handleImageUpload = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('image', file);

      const result = await adminUploadMomentImage(formData);

      if (!result.success) {
        throw new Error(result.error || '上传失败');
      }

      setImageUrl(result.imageUrl);
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '图片上传失败');
    }
  };

  return (
    <>
      <AdminPageLayout
        title="碎碎念管理"
        description={`共 ${moments.length} 条碎碎念`}
        actions={[
          createRefreshAction(fetchItems, loading),
          createAddAction(handleCreate, '发布碎碎念'),
        ]}
      >
        {/* 碎碎念列表 */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-muted-foreground py-8 text-center">
              加载中...
            </div>
          ) : moments.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              暂无碎碎念，点击"发布碎碎念"开始记录生活
            </div>
          ) : (
            moments.map((moment) => (
              <div
                key={moment.id}
                className="hover:bg-accent/50 space-y-3 rounded-lg border p-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <span>{formatDate(moment.createdAt)}</span>
                      {moment.moodEmoji && (
                        <span className="flex items-center gap-1">
                          <Smile className="h-3 w-3" />
                          {moment.moodEmoji}
                        </span>
                      )}
                      {moment.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {moment.location}
                        </span>
                      )}
                    </div>
                    <p className="text-sm">{moment.content}</p>
                    {moment.imageUrl && (
                      <div className="relative inline-block">
                        <img
                          src={moment.imageUrl}
                          alt="配图"
                          className="max-h-48 max-w-xs rounded-lg object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(moment)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDelete(moment)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </AdminPageLayout>

      {/* 表单对话框 */}
      <CrudFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        title={editMode === 'create' ? '发布碎碎念' : '编辑碎碎念'}
        description="记录生活中的美好时刻"
        onSubmit={handleSave}
        isSubmitting={isSubmitting}
        submitLabel={editMode === 'create' ? '发布' : '保存'}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">内容</label>
            <textarea
              value={content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setContent(e.target.value)
              }
              placeholder="说点什么吧...（最多200字）"
              maxLength={200}
              rows={3}
              className="focus:ring-primary w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            />
            <div className="text-muted-foreground mt-1 text-xs">
              {content.length}/200
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">配图</label>
            <div className="flex gap-2">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="图片URL"
              />
              <FileUploadTrigger
                id="moment-image"
                accept="image/*"
                onFileSelect={handleImageUpload}
              >
                <ImageIcon className="h-4 w-4" />
              </FileUploadTrigger>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">心情</label>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((option) => (
                <button
                  key={option.emoji}
                  type="button"
                  onClick={() => setMoodEmoji(option.emoji)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    moodEmoji === option.emoji
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-accent'
                  }`}
                >
                  {option.emoji} {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">位置</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="📍 在哪里..."
            />
          </div>
        </div>
      </CrudFormDialog>

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="确认删除"
        description={<>确定要删除这条碎碎念吗？此操作不可恢复。</>}
        onConfirm={handleDelete}
        isDeleting={isSubmitting}
      />
    </>
  );
}
