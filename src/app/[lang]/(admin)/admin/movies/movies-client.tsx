'use client';

import { Edit, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  adminCreateMovie,
  adminDeleteMovie,
  adminGetMovies,
  adminUpdateMovie,
} from '@/actions/admin/movie-actions';
import {
  AdminPageLayout,
  createAddAction,
  createRefreshAction,
} from '@/components/admin/admin-page-layout';
import { CrudFormDialog } from '@/components/admin/crud-form-dialog';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Button } from '@/components/shadcn-ui/button';
import { Input } from '@/components/shadcn-ui/input';
import { Link } from '@/components/shared/link';
import { useCrud } from '@/hooks/use-crud';
import { Movie, MovieSource } from '@/lib/movies';
import { formatDate } from '@/utils/utils';

type MovieCreateInput = Omit<Movie, 'created_at' | 'updated_at'>;
type MovieUpdateInput = Partial<
  Omit<Movie, 'id' | 'created_at' | 'updated_at'>
>;

type SourceDraft = MovieSource & { _key: string };
const createSourceDraft = (): SourceDraft => ({
  _key: crypto.randomUUID(),
  name: '',
  url: '',
});

// === 影视列表 ===
function MoviesList({
  movies,
  loading,
  onEdit,
  onDelete,
}: {
  movies: Movie[];
  loading: boolean;
  onEdit: (movie: Movie) => void;
  onDelete: (movie: Movie) => void;
}) {
  return (
    <div className="space-y-4">
      {loading ? (
        <div className="text-muted-foreground py-8 text-center">加载中...</div>
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
                  <p className="text-muted-foreground text-sm">{movie.year}</p>
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
                  添加于 {formatDate(movie.created_at)}
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
                    onClick={() => onEdit(movie)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(movie)}
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
  );
}

// === 表单对话框（添加/编辑影视） ===
function MoviesFormDialog({
  open,
  onOpenChange,
  editMode,
  isSubmitting,
  id,
  setId,
  title,
  setTitle,
  poster,
  setPoster,
  year,
  setYear,
  tags,
  setTags,
  summary,
  setSummary,
  sources,
  addSource,
  removeSource,
  updateSource,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMode: 'create' | 'edit';
  isSubmitting: boolean;
  id: string;
  setId: (value: string) => void;
  title: string;
  setTitle: (value: string) => void;
  poster: string;
  setPoster: (value: string) => void;
  year: string;
  setYear: (value: string) => void;
  tags: string;
  setTags: (value: string) => void;
  summary: string;
  setSummary: (value: string) => void;
  sources: SourceDraft[];
  addSource: () => void;
  removeSource: (index: number) => void;
  updateSource: (index: number, field: 'name' | 'url', value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <CrudFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editMode === 'create' ? '添加影视' : '编辑影视'}
      description="添加或编辑私人影视收藏"
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      submitLabel={editMode === 'create' ? '添加' : '保存'}
    >
      <div className="max-h-[calc(100vh-200px)] space-y-4 overflow-y-auto">
        <div>
          <label htmlFor="movie-id" className="mb-2 block text-sm font-medium">
            ID *
          </label>
          <Input
            id="movie-id"
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
          <label
            htmlFor="movie-title"
            className="mb-2 block text-sm font-medium"
          >
            标题 *
          </label>
          <Input
            id="movie-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入电影/剧集标题"
            required
          />
        </div>

        <div>
          <label
            htmlFor="movie-poster"
            className="mb-2 block text-sm font-medium"
          >
            海报 URL *
          </label>
          <Input
            id="movie-poster"
            value={poster}
            onChange={(e) => setPoster(e.target.value)}
            placeholder="输入海报图片 URL"
            required
          />
        </div>

        <div>
          <label
            htmlFor="movie-year"
            className="mb-2 block text-sm font-medium"
          >
            年份 *
          </label>
          <Input
            id="movie-year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="输入上映年份"
            required
          />
        </div>

        <div>
          <label
            htmlFor="movie-tags"
            className="mb-2 block text-sm font-medium"
          >
            标签
          </label>
          <Input
            id="movie-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="输入标签，多个标签用逗号分隔"
          />
          <p className="text-muted-foreground mt-1 text-xs">
            例如：科幻, 动作, 2024
          </p>
        </div>

        <div>
          <label
            htmlFor="movie-summary"
            className="mb-2 block text-sm font-medium"
          >
            简介
          </label>
          <textarea
            id="movie-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="输入影视简介"
            rows={3}
            className="focus:ring-primary w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
          />
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium">播放源链接</span>
          <div className="space-y-3">
            {sources.map((source, index) => (
              <div key={source._key} className="flex items-start gap-2">
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
                    onChange={(e) => updateSource(index, 'url', e.target.value)}
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
  );
}

// === 删除确认对话框 ===
function MoviesDeleteDialog({
  open,
  onOpenChange,
  selectedMovie,
  onConfirm,
  isDeleting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMovie: Movie | null;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="确认删除"
      description={
        <>确定要删除电影 "{selectedMovie?.title}" 吗？此操作不可恢复。</>
      }
      onConfirm={onConfirm}
      isDeleting={isDeleting}
    />
  );
}

export default function MoviesClient({
  initialMovies,
}: {
  initialMovies: Movie[];
}) {
  // === useCrud：注意 adminUpdateMovie 签名是 (obj)，适配为 (id, input) ===
  const crud = useCrud<Movie, MovieCreateInput, MovieUpdateInput>({
    getList: adminGetMovies,
    create: adminCreateMovie,
    update: (id, input) => adminUpdateMovie({ id, ...input }),
    delete: adminDeleteMovie,
    idField: 'id',
    initialData: initialMovies,
    createSuccessMessage: '影视添加成功',
    updateSuccessMessage: '影视更新成功',
    deleteSuccessMessage: '影视删除成功',
  });

  const {
    items: movies,
    loading,
    isSubmitting,
    selectedItem: selectedMovie,
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
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [poster, setPoster] = useState('');
  const [year, setYear] = useState('');
  const [tags, setTags] = useState('');
  const [summary, setSummary] = useState('');
  const [sources, setSources] = useState<SourceDraft[]>(() => [
    createSourceDraft(),
  ]);

  // 编辑模式下回填表单
  useEffect(() => {
    if (isEditDialogOpen && selectedMovie) {
      setId(selectedMovie.id);
      setTitle(selectedMovie.title);
      setPoster(selectedMovie.poster);
      setYear(selectedMovie.year);
      setTags(selectedMovie.tags.join(', '));
      setSummary(selectedMovie.summary);
      setSources(
        selectedMovie.sources.length > 0
          ? selectedMovie.sources.map((s) => ({
              ...s,
              _key: crypto.randomUUID(),
            }))
          : [createSourceDraft()]
      );
    }
  }, [isEditDialogOpen, selectedMovie]);

  // 创建模式下清空表单（render 期守卫：打开瞬间同步重置，避免用户先看到旧值）
  const [prevCreateOpen, setPrevCreateOpen] = useState(false);
  if (isCreateDialogOpen && !prevCreateOpen) {
    setPrevCreateOpen(true);
    setId('');
    setTitle('');
    setPoster('');
    setYear('');
    setTags('');
    setSummary('');
    setSources([createSourceDraft()]);
  }
  if (!isCreateDialogOpen && prevCreateOpen) {
    setPrevCreateOpen(false);
  }

  // create / edit 对话框合并
  const isFormDialogOpen = isCreateDialogOpen || isEditDialogOpen;
  const handleFormDialogOpenChange = (open: boolean) => {
    if (!open) closeDialogs();
  };

  // === sources 动态增减（页面逻辑） ===
  const addSource = () => setSources([...sources, createSourceDraft()]);
  const removeSource = (index: number) => {
    if (sources.length <= 1) return;
    const newSources = [...sources];
    newSources.splice(index, 1);
    setSources(newSources);
  };
  const updateSource = (
    index: number,
    field: 'name' | 'url',
    value: string
  ) => {
    const newSources = [...sources];
    newSources[index][field] = value;
    setSources(newSources);
  };

  // === 保存 ===
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const filteredSources = sources
      .filter((s) => s.name.trim() || s.url.trim())
      .map((s) => ({ name: s.name, url: s.url }));
    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t);

    if (editMode === 'create') {
      await createItem({
        id,
        title,
        poster,
        year,
        tags: tagList,
        summary,
        sources: filteredSources,
      });
    } else {
      if (!selectedMovie) return;
      await updateItem(selectedMovie.id, {
        title,
        poster,
        year,
        tags: tagList,
        summary,
        sources: filteredSources,
      });
    }
  };

  return (
    <>
      <AdminPageLayout
        title="影视管理"
        description={`共 ${movies.length} 部影视`}
        actions={[
          createRefreshAction(fetchItems, loading),
          createAddAction(openCreateDialog, '添加影视'),
        ]}
      >
        {/* 影视列表 */}
        <MoviesList
          movies={movies}
          loading={loading}
          onEdit={openEditDialog}
          onDelete={openDeleteDialog}
        />
      </AdminPageLayout>

      {/* 表单对话框 */}
      <MoviesFormDialog
        open={isFormDialogOpen}
        onOpenChange={handleFormDialogOpenChange}
        editMode={editMode}
        isSubmitting={isSubmitting}
        id={id}
        setId={setId}
        title={title}
        setTitle={setTitle}
        poster={poster}
        setPoster={setPoster}
        year={year}
        setYear={setYear}
        tags={tags}
        setTags={setTags}
        summary={summary}
        setSummary={setSummary}
        sources={sources}
        addSource={addSource}
        removeSource={removeSource}
        updateSource={updateSource}
        onSubmit={handleSave}
      />

      {/* 删除确认对话框 */}
      <MoviesDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        selectedMovie={selectedMovie}
        onConfirm={deleteItem}
        isDeleting={isSubmitting}
      />
    </>
  );
}
