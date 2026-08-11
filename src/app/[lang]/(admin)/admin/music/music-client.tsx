'use client';

import { Edit, Music, Music2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import {
  adminCreateMusic,
  adminDeleteMusic,
  adminGetMusic,
  adminUpdateMusic,
  adminUploadMusicFile,
} from '@/actions/admin/music-actions';
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
import { Song } from '@/lib/music';
import { useCrud } from '@/hooks/use-crud';

type MusicCreateInput = {
  name: string;
  artist: string;
  url: string;
  cover: string;
};
type MusicUpdateInput = Partial<MusicCreateInput>;

export default function MusicClient({
  songs: initialSongs,
}: {
  songs: Song[];
}) {
  // === 用 useCrud 管理 CRUD 状态 ===
  const crud = useCrud<Song, MusicCreateInput, MusicUpdateInput>({
    getList: adminGetMusic,
    create: adminCreateMusic,
    update: adminUpdateMusic,
    delete: adminDeleteMusic,
    idField: 'id',
    initialData: initialSongs,
    createSuccessMessage: '音乐添加成功',
    updateSuccessMessage: '音乐更新成功',
    deleteSuccessMessage: '音乐删除成功',
  });

  const {
    items: songs,
    loading,
    isSubmitting,
    selectedItem: selectedSong,
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

  // === 表单状态（页面独有，hook 不涉及） ===
  const [name, setName] = useState('');
  const [artist, setArtist] = useState('');
  const [url, setUrl] = useState('');
  const [cover, setCover] = useState('');

  // 打开/切换到编辑模式时，从 selectedItem 回填表单
  useEffect(() => {
    if (isEditDialogOpen && selectedSong) {
      setName(selectedSong.name);
      setArtist(selectedSong.artist);
      setUrl(selectedSong.url);
      setCover(selectedSong.cover);
    }
  }, [isEditDialogOpen, selectedSong]);

  // 打开创建模式时，清空表单（render 期守卫：打开瞬间同步重置，避免用户先看到旧值）
  const [prevCreateOpen, setPrevCreateOpen] = useState(false);
  if (isCreateDialogOpen && !prevCreateOpen) {
    setPrevCreateOpen(true);
    setName('');
    setArtist('');
    setUrl('');
    setCover('');
  }
  if (!isCreateDialogOpen && prevCreateOpen) {
    setPrevCreateOpen(false);
  }

  // 合并 create/edit 对话框（原页面共用一个 CrudFormDialog）
  const isFormDialogOpen = isCreateDialogOpen || isEditDialogOpen;
  const handleFormDialogOpenChange = (open: boolean) => {
    if (!open) closeDialogs();
  };

  // === 音频上传（页面特殊逻辑，保留） ===
  const handleAudioUpload = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const result = await adminUploadMusicFile(formData);

      if (!result.success) {
        throw new Error(result.error || '上传失败');
      }

      setUrl(result.data.url);
      toast.success(result.data.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '音频上传失败');
    }
  };

  // === 保存（create 或 update） ===
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editMode === 'create') {
      await createItem({ name, artist, url, cover });
    } else {
      if (!selectedSong) return;
      await updateItem(selectedSong.id, { name, artist, url, cover });
    }
  };

  return (
    <>
      <AdminPageLayout
        title="音乐管理"
        description="管理网站音乐列表"
        actions={[
          createRefreshAction(fetchItems, loading),
          createAddAction(openCreateDialog, '添加音乐'),
        ]}
      >
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground">共 {songs.length} 首音乐</div>
        </div>
        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="text-muted-foreground py-8 text-center">
              加载中...
            </div>
          ) : songs.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              暂无音乐，点击"添加音乐"开始添加
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 xl:grid-cols-3">
              {songs.map((song) => (
                <div
                  key={song.id}
                  className="hover:bg-accent/50 flex items-center gap-4 rounded-lg border p-4 transition-colors"
                >
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
                    {song.cover ? (
                      <OptimizedImage
                        src={song.cover}
                        alt={song.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="bg-muted flex h-full w-full items-center justify-center">
                        <Music className="text-muted-foreground h-6 w-6" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium">{song.name}</h3>
                    <p className="text-muted-foreground truncate text-sm">
                      {song.artist}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(song)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(song)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <CrudFormDialog
          open={isFormDialogOpen}
          onOpenChange={handleFormDialogOpenChange}
          title={editMode === 'create' ? '添加音乐' : '编辑音乐'}
          description="管理网站音乐列表"
          onSubmit={handleSave}
          isSubmitting={isSubmitting}
          submitLabel={editMode === 'create' ? '添加' : '保存'}
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="music-name"
                className="mb-2 block text-sm font-medium"
              >
                歌曲名称
              </label>
              <Input
                id="music-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入歌曲名称"
                required
              />
            </div>

            <div>
              <label
                htmlFor="music-artist"
                className="mb-2 block text-sm font-medium"
              >
                歌手名称
              </label>
              <Input
                id="music-artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="请输入歌手名称"
                required
              />
            </div>

            <div>
              <label
                htmlFor="music-url"
                className="mb-2 block text-sm font-medium"
              >
                歌曲链接
              </label>
              <div className="flex gap-2">
                <Input
                  id="music-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="请输入歌曲URL"
                  required
                />
                <FileUploadTrigger
                  id="music-audio"
                  accept="audio/*"
                  onFileSelect={handleAudioUpload}
                >
                  <Music2 className="h-4 w-4" />
                </FileUploadTrigger>
              </div>
            </div>

            <div>
              <label
                htmlFor="music-cover"
                className="mb-2 block text-sm font-medium"
              >
                封面图片链接
              </label>
              <Input
                id="music-cover"
                value={cover}
                onChange={(e) => setCover(e.target.value)}
                placeholder="请输入封面图片URL（可选）"
              />
            </div>
          </div>
        </CrudFormDialog>

        <DeleteConfirmDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          title="确认删除"
          description={<>确定要删除这首音乐吗？此操作不可恢复。</>}
          onConfirm={deleteItem}
          isDeleting={isSubmitting}
        />
      </AdminPageLayout>
    </>
  );
}
