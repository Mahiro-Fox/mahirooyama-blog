'use client';

import { MOOD_OPTIONS } from '@/config';
import { Edit, Image as ImageIcon, MapPin, Smile, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import {
  adminCreateMoment,
  adminDeleteMoment,
  adminGetMoments,
  adminUpdateMoment,
  adminUploadMomentImage,
} from '@/actions/admin/moments-actions';
import {
  AdminPageLayout,
  createAddAction,
  createRefreshAction,
} from '@/components/admin/admin-page-layout';
import { CrudFormDialog } from '@/components/admin/crud-form-dialog';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { FileUploadTrigger } from '@/components/admin/file-upload-trigger';
import { Button } from '@/components/shadcn-ui/button';
import { Input } from '@/components/shadcn-ui/input';
import { OptimizedImage } from '@/components/shared/optimized-image';
import { useCrud } from '@/hooks/use-crud';
import { Moment, MomentImage } from '@/lib/moments';
import { formatDate } from '@/utils/utils';

type MomentCreateInput = {
  content: string;
  image?: MomentImage;
  moodEmoji?: string;
  location?: string;
};

const getRealImageHeight = (image: Moment['image']) => {
  if (!image) {
    return 0;
  }
  const scaleRatio = Math.round(image?.width ? image.width / 320 : 1);
  return Math.round(image?.height ? image.height / scaleRatio : 0);
};

/**
 * 碎碎念列表
 */
function MomentsList({
  moments,
  loading,
  onEdit,
  onDelete,
}: {
  moments: Moment[];
  loading: boolean;
  onEdit: (moment: Moment) => void;
  onDelete: (moment: Moment) => void;
}) {
  if (loading) {
    return (
      <div className="text-muted-foreground py-8 text-center">加载中...</div>
    );
  }

  if (moments.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        暂无碎碎念，点击"发布碎碎念"开始记录生活
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {moments.map((moment) => (
        <div
          key={moment.id}
          className="hover:bg-accent/50 space-y-3 rounded-lg border p-4 transition-colors"
        >
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
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
              {moment.image && (
                <div className="relative inline-block">
                  <OptimizedImage
                    fill={process.env.NODE_ENV === 'development' ? true : false}
                    previewable
                    src={moment.image.url}
                    alt="配图"
                    priority={
                      Math.max(
                        getRealImageHeight(moments[0].image),
                        moments[1] ? getRealImageHeight(moments[1].image) : 0
                      ) === getRealImageHeight(moment.image)
                        ? true
                        : false
                    }
                    className="max-h-48 max-w-xs rounded-lg object-cover"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onEdit(moment)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(moment)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 发布/编辑对话框表单字段
 */
function MomentFormFields({
  content,
  onContentChange,
  image,
  onImageChange,
  moodEmoji,
  onMoodEmojiClick,
  location,
  onLocationChange,
  onImageUpload,
  onGetLocation,
}: {
  content: string;
  onContentChange: (value: string) => void;
  image: MomentImage | null;
  onImageChange: (image: MomentImage | null) => void;
  moodEmoji: string;
  onMoodEmojiClick: (emoji: string) => void;
  location: string;
  onLocationChange: (value: string) => void;
  onImageUpload: (files: FileList) => void;
  onGetLocation: () => void;
}) {
  return (
    <div className="max-h-[calc(100vh-200px)] space-y-4 overflow-y-auto">
      <div>
        <label
          htmlFor="moment-content"
          className="mb-2 block text-sm font-medium"
        >
          内容
        </label>
        <textarea
          id="moment-content"
          value={content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onContentChange(e.target.value)
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
        <label
          htmlFor="moment-image-url"
          className="mb-2 block text-sm font-medium"
        >
          配图
        </label>
        <div className="flex gap-2">
          <Input
            id="moment-image-url"
            value={image?.url || ''}
            onChange={(e) =>
              onImageChange(
                e.target.value
                  ? {
                      url: e.target.value,
                      width: 0,
                      height: 0,
                      ratio: 0,
                    }
                  : null
              )
            }
            placeholder="图片URL"
          />
          <FileUploadTrigger
            id="moment-image"
            accept="image/*"
            onFileSelect={onImageUpload}
          >
            <ImageIcon className="h-4 w-4" />
          </FileUploadTrigger>
        </div>
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium">心情</span>
        <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
          {MOOD_OPTIONS.map((option) => (
            <button
              key={option.emoji}
              type="button"
              onClick={() => onMoodEmojiClick(option.emoji)}
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
        <label
          htmlFor="moment-location"
          className="mb-2 block text-sm font-medium"
        >
          位置
        </label>
        <div className="flex gap-2">
          <Input
            id="moment-location"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="📍 在哪里..."
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onGetLocation}
            className="h-9 w-9"
            title="获取当前位置"
          >
            <MapPin className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MomentsClient({
  initialMoments,
}: {
  initialMoments: Moment[];
}) {
  // === 用 useCrud 管理 CRUD 状态 ===
  const crud = useCrud<Moment, MomentCreateInput>({
    getList: adminGetMoments,
    create: adminCreateMoment,
    update: adminUpdateMoment,
    delete: adminDeleteMoment,
    idField: 'id',
    initialData: initialMoments,
    createSuccessMessage: '碎碎念发布成功',
    updateSuccessMessage: '碎碎念更新成功',
    deleteSuccessMessage: '碎碎念删除成功',
  });

  const {
    items: moments,
    loading,
    isSubmitting,
    selectedItem: selectedMoment,
    isCreateDialogOpen,
    isEditDialogOpen,
    isDeleteDialogOpen,
    editMode,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    openCreateDialog,
    openEditDialog,
    openDeleteDialog,
    closeDialogs,
    setIsDeleteDialogOpen,
  } = crud;

  // === 表单状态（页面独有） ===
  const [content, setContent] = useState('');
  const [image, setImage] = useState<MomentImage | null>(null);
  const [moodEmoji, setMoodEmoji] = useState('');
  const [location, setLocation] = useState('');

  // 打开编辑时回填表单
  useEffect(() => {
    if (isEditDialogOpen && selectedMoment) {
      setContent(selectedMoment.content);
      setImage(selectedMoment.image || null);
      setMoodEmoji(selectedMoment.moodEmoji || '');
      setLocation(selectedMoment.location || '');
    }
  }, [isEditDialogOpen, selectedMoment]);

  // 打开创建时清空表单（render 期守卫：打开瞬间同步重置，避免用户先看到旧值）
  const [prevCreateOpen, setPrevCreateOpen] = useState(false);
  if (isCreateDialogOpen && !prevCreateOpen) {
    setPrevCreateOpen(true);
    setContent('');
    setImage(null);
    setMoodEmoji('');
    setLocation('');
  }
  if (!isCreateDialogOpen && prevCreateOpen) {
    setPrevCreateOpen(false);
  }

  // 合并 create/edit 对话框
  const isFormDialogOpen = isCreateDialogOpen || isEditDialogOpen;
  const handleFormDialogOpenChange = (open: boolean) => {
    if (!open) closeDialogs();
  };

  // === 图片上传（页面特殊逻辑，保留） ===
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

      setImage(result.data.image);
      toast.success(result.data.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '图片上传失败');
    }
  };

  // === 情绪点击处理 ===
  const handleMoodEmojiClick = (emoji: string) => {
    if (moodEmoji === emoji) {
      setMoodEmoji('');
    } else {
      setMoodEmoji(emoji);
    }
  };

  // === 获取用户位置 ===
  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('您的浏览器不支持地理位置功能');
      return;
    }

    toast.loading('正在获取位置...', { id: 'location-loading' });

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        }
      );

      const { latitude, longitude } = position.coords;

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=zh-CN`,
        {
          headers: {
            'User-Agent': 'mahirooyama-blog',
          },
        }
      );

      if (res.ok) {
        const geo = await res.json();
        if (geo.display_name) {
          setLocation(geo.display_name);
          toast.success('位置获取成功', { id: 'location-loading' });
        } else {
          setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          toast.success('位置获取成功（仅坐标）', { id: 'location-loading' });
        }
      } else {
        setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        toast.success('位置获取成功（仅坐标）', { id: 'location-loading' });
      }
    } catch (error) {
      let errorMessage = '位置获取失败';
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '用户拒绝了位置权限请求';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '位置信息不可用';
            break;
          case error.TIMEOUT:
            errorMessage = '获取位置超时';
            break;
        }
      }
      toast.error(errorMessage, { id: 'location-loading' });
    }
  };

  // === 保存 ===
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editMode === 'create') {
      await createItem({
        content,
        image: image || undefined,
        moodEmoji: moodEmoji || undefined,
        location: location || undefined,
      });
    } else {
      if (!selectedMoment) return;
      await updateItem(selectedMoment.id, {
        content,
        image: image || undefined,
        moodEmoji: moodEmoji || undefined,
        location: location || undefined,
      });
    }
  };

  return (
    <>
      <AdminPageLayout
        title="碎碎念管理"
        description={`共 ${moments.length} 条碎碎念`}
        actions={[
          createRefreshAction(fetchItems, loading),
          createAddAction(openCreateDialog, '发布碎碎念'),
        ]}
      >
        <MomentsList
          moments={moments}
          loading={loading}
          onEdit={openEditDialog}
          onDelete={openDeleteDialog}
        />
      </AdminPageLayout>

      {/* 表单对话框 */}
      <CrudFormDialog
        open={isFormDialogOpen}
        onOpenChange={handleFormDialogOpenChange}
        title={editMode === 'create' ? '发布碎碎念' : '编辑碎碎念'}
        description="记录生活中的美好时刻"
        onSubmit={handleSave}
        isSubmitting={isSubmitting}
        submitLabel={editMode === 'create' ? '发布' : '保存'}
      >
        <MomentFormFields
          content={content}
          onContentChange={setContent}
          image={image}
          onImageChange={setImage}
          moodEmoji={moodEmoji}
          onMoodEmojiClick={handleMoodEmojiClick}
          location={location}
          onLocationChange={setLocation}
          onImageUpload={handleImageUpload}
          onGetLocation={handleGetLocation}
        />
      </CrudFormDialog>

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="确认删除"
        description={<>确定要删除这条碎碎念吗？此操作不可恢复。</>}
        onConfirm={deleteItem}
        isDeleting={isSubmitting}
      />
    </>
  );
}
