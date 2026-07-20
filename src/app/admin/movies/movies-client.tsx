'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  adminCreateMovie,
  adminDeleteMovie,
  adminGetMovies,
  adminUpdateMovie,
  type Movie,
  type MovieSource,
} from '@/actions/admin/movie-actions';
import { formatDate } from '@/utils/utils';
import { Edit, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
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

export default function MoviesClient({
  initialMovies,
}: {
  initialMovies: Movie[];
}) {
  const [movies, setMovies] = useState<Movie[]>(initialMovies);
  const [loading, setLoading] = useState(false);

  // 本地状态
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');

  // 表单状态
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [poster, setPoster] = useState('');
  const [year, setYear] = useState('');
  const [tags, setTags] = useState('');
  const [summary, setSummary] = useState('');
  const [sources, setSources] = useState<MovieSource[]>([
    { name: '', url: '' },
  ]);

  // 刷新列表
  const fetchItems = async () => {
    setLoading(true);
    try {
      const result = await adminGetMovies();
      if (!result.success) {
        throw new Error(result.error);
      }
      setMovies(result.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取影视列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 新增影视
  const handleCreate = () => {
    setEditMode('create');
    setSelectedMovie(null);
    setId('');
    setTitle('');
    setPoster('');
    setYear('');
    setTags('');
    setSummary('');
    setSources([{ name: '', url: '' }]);
    setIsFormDialogOpen(true);
  };

  // 编辑影视
  const handleEdit = (movie: Movie) => {
    setEditMode('edit');
    setSelectedMovie(movie);
    setId(movie.id);
    setTitle(movie.title);
    setPoster(movie.poster);
    setYear(movie.year);
    setTags(movie.tags.join(', '));
    setSummary(movie.summary);
    setSources(
      movie.sources.length > 0 ? [...movie.sources] : [{ name: '', url: '' }]
    );
    setIsFormDialogOpen(true);
  };

  // 添加源链接
  const addSource = () => {
    setSources([...sources, { name: '', url: '' }]);
  };

  // 删除源链接
  const removeSource = (index: number) => {
    if (sources.length <= 1) {
      return; // 至少保留一个
    }
    const newSources = [...sources];
    newSources.splice(index, 1);
    setSources(newSources);
  };

  // 更新源链接
  const updateSource = (
    index: number,
    field: 'name' | 'url',
    value: string
  ) => {
    const newSources = [...sources];
    newSources[index][field] = value;
    setSources(newSources);
  };

  // 保存（新增或编辑）
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // 过滤掉空的源链接
      const filteredSources = sources.filter(
        (s) => s.name.trim() || s.url.trim()
      );

      if (editMode === 'create') {
        const result = await adminCreateMovie({
          id,
          title,
          poster,
          year,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t),
          summary,
          sources: filteredSources,
        });
        if (!result.success) {
          throw new Error(result.error);
        }
        toast.success('影视添加成功');
      } else {
        if (!selectedMovie) return;
        const result = await adminUpdateMovie({
          id: selectedMovie.id,
          title,
          poster,
          year,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t),
          summary,
          sources: filteredSources,
        });
        if (!result.success) {
          throw new Error(result.error);
        }
        toast.success('影视更新成功');
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
  const openDelete = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsDeleteDialogOpen(true);
  };

  // 执行删除
  const handleDelete = async () => {
    if (!selectedMovie) return;
    try {
      const result = await adminDeleteMovie(selectedMovie.id);
      if (!result.success) {
        throw new Error(result.error);
      }
      toast.success('影视删除成功');
      setIsDeleteDialogOpen(false);
      setSelectedMovie(null);
      await fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  return (
    <>
      <AdminPageLayout
        title="影视管理"
        description={`共 ${movies.length} 部影视`}
        actions={[
          createRefreshAction(fetchItems, loading),
          createAddAction(handleCreate, '添加影视'),
        ]}
      >
        {/* 影视列表 */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-muted-foreground py-8 text-center">
              加载中...
            </div>
          ) : movies.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              暂无影视收藏，点击"添加影视"开始添加
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {movies.map((movie) => (
                <div
                  key={movie.id}
                  className="hover:bg-accent/50 space-y-3 rounded-lg border p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded">
                      <Image
                        src={movie.poster}
                        alt={movie.title}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="truncate font-medium">{movie.title}</h3>
                      <p className="text-muted-foreground text-sm">
                        {movie.year}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {movie.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-muted-foreground bg-muted rounded-full px-2 py-1 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">
                      添加于 {formatDate(movie.updated_at)}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Link
                          href={`/movies/${movie.id}`}
                          className="text-muted-foreground hover:underline"
                          target="_blank"
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(movie)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDelete(movie)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminPageLayout>

      {/* 表单对话框 */}
      <CrudFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        title={editMode === 'create' ? '添加影视' : '编辑影视'}
        description="添加或编辑私人影视收藏"
        onSubmit={handleSave}
        isSubmitting={isSubmitting}
        submitLabel={editMode === 'create' ? '添加' : '保存'}
      >
        <div className="max-h-[calc(100vh-200px)] space-y-4 overflow-y-auto">
          <div>
            <label className="mb-2 block text-sm font-medium">ID *</label>
            <Input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="输入唯一ID，用于URL，例如：movie-title-2024"
              required
              disabled={editMode !== 'create'}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              唯一标识符，用于访问URL，创建后不可修改
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">标题 *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入电影/剧集标题"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">海报 URL *</label>
            <Input
              value={poster}
              onChange={(e) => setPoster(e.target.value)}
              placeholder="输入海报图片 URL"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">年份 *</label>
            <Input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="输入上映年份"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">标签</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="输入标签，多个标签用逗号分隔"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              例如：科幻, 动作, 2024
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">简介</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="输入影视简介"
              rows={3}
              className="focus:ring-primary w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">播放源链接</label>
            <div className="space-y-3">
              {sources.map((source, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    <Input
                      value={source.name}
                      onChange={(e) =>
                        updateSource(index, 'name', e.target.value)
                      }
                      placeholder="线路名称"
                    />
                    <Input
                      value={source.url}
                      onChange={(e) =>
                        updateSource(index, 'url', e.target.value)
                      }
                      placeholder="播放链接"
                    />
                  </div>
                  {sources.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSource(index)}
                      className="h-10 w-10 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addSource}
                      className="h-10 w-10 shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {sources.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addSource}
                  className="w-full"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  添加线路
                </Button>
              )}
            </div>
          </div>
        </div>
      </CrudFormDialog>

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="确认删除"
        description={
          <>确定要删除电影 "{selectedMovie?.title}" 吗？此操作不可恢复。</>
        }
        onConfirm={handleDelete}
        isDeleting={isSubmitting}
      />
    </>
  );
}
