'use client';

import { useState } from 'react';
import {
  adminApproveGuestbookEntry,
  adminDeleteGuestbookEntry,
  adminGetGuestbookEntries,
  adminReplyGuestbookEntry,
  adminUpdateGuestbookEntry,
  type GuestbookEntry,
} from '@/actions/admin/guestbook-actions';
import { COLOR_OPTIONS } from '@/constant';
import { formatDate } from '@/utils/utils';
import { Check, Edit, MessageSquare, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/shadcn-ui/badge';
import { Button } from '@/components/shadcn-ui/button';
import { Input } from '@/components/shadcn-ui/input';
import {
  AdminPageLayout,
  createRefreshAction,
} from '@/components/admin/admin-page-layout';
import { CrudFormDialog } from '@/components/admin/crud-form-dialog';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';

export default function GuestbookClient({
  initialEntries,
}: {
  initialEntries: GuestbookEntry[];
}) {
  const [entries, setEntries] = useState<GuestbookEntry[]>(initialEntries);
  const [loading, setLoading] = useState(false);

  // 本地状态
  const [selectedEntry, setSelectedEntry] = useState<GuestbookEntry | null>(
    null
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');

  // 表单状态
  const [nickname, setNickname] = useState('');
  const [bgColor, setBgColor] = useState(COLOR_OPTIONS[0].value);
  const [contact, setContact] = useState('');
  const [content, setContent] = useState('');
  const [replyContent, setReplyContent] = useState('');

  // 刷新列表
  const fetchItems = async () => {
    setLoading(true);
    try {
      const result = await adminGetGuestbookEntries();
      if (!result.success) {
        throw new Error(result.error);
      }
      setEntries(result.entries);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取留言列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 新增留言
  const handleCreate = () => {
    setEditMode('create');
    setSelectedEntry(null);
    setNickname('');
    setBgColor(COLOR_OPTIONS[0].value);
    setContact('');
    setContent('');
    setIsFormDialogOpen(true);
  };

  // 编辑留言
  const handleEdit = (entry: GuestbookEntry) => {
    setEditMode('edit');
    setSelectedEntry(entry);
    setNickname(entry.nickname);
    setBgColor(entry.bgColor);
    setContact(entry.contact || '');
    setContent(entry.content);
    setIsFormDialogOpen(true);
  };

  // 保存（新增或编辑）
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editMode === 'create') {
        const result = await adminCreateGuestbookEntry({
          nickname,
          bgColor,
          contact: contact || undefined,
          content,
        });
        if (!result.success) {
          throw new Error(result.error);
        }
        toast.success('留言创建成功');
      } else {
        if (!selectedEntry) return;
        const result = await adminUpdateGuestbookEntry(selectedEntry.id, {
          nickname,
          bgColor,
          contact: contact || undefined,
          content,
        });
        if (!result.success) {
          throw new Error(result.error);
        }
        toast.success('留言更新成功');
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
  const openDelete = (entry: GuestbookEntry) => {
    setSelectedEntry(entry);
    setIsDeleteDialogOpen(true);
  };

  // 执行删除
  const handleDelete = async () => {
    if (!selectedEntry) return;
    try {
      const result = await adminDeleteGuestbookEntry(selectedEntry.id);
      if (!result.success) {
        throw new Error(result.error);
      }
      toast.success('留言删除成功');
      setIsDeleteDialogOpen(false);
      setSelectedEntry(null);
      await fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  // 打开回复对话框
  const openReply = (entry: GuestbookEntry) => {
    setSelectedEntry(entry);
    setReplyContent(entry.replyContent || '');
    setIsReplyDialogOpen(true);
  };

  // 保存回复
  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;
    setIsSubmitting(true);
    try {
      const result = await adminReplyGuestbookEntry(
        selectedEntry.id,
        replyContent
      );
      if (!result.success) {
        throw new Error(result.error);
      }
      toast.success('回复成功');
      setIsReplyDialogOpen(false);
      setSelectedEntry(null);
      await fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '回复失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 审核留言
  const handleApprove = async (entry: GuestbookEntry, approved: boolean) => {
    try {
      const result = await adminApproveGuestbookEntry(entry.id, approved);
      if (!result.success) {
        throw new Error(result.error);
      }
      toast.success(approved ? '留言已通过审核' : '留言已拒绝');
      await fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    }
  };

  return (
    <>
      <AdminPageLayout
        title="留言墙管理"
        description={`共 ${entries.length} 条留言`}
        actions={[createRefreshAction(fetchItems, loading)]}
      >
        {/* 留言列表 */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-muted-foreground py-8 text-center">
              加载中...
            </div>
          ) : entries.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              暂无留言
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="hover:bg-accent/50 space-y-3 rounded-lg border p-4 transition-colors"
                style={{ backgroundColor: `${entry.bgColor}20` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{entry.nickname}</span>
                      <Badge
                        variant={entry.isApproved ? 'default' : 'secondary'}
                      >
                        {entry.isApproved ? '已审核' : '待审核'}
                      </Badge>
                      <span className="text-muted-foreground text-sm">
                        {formatDate(entry.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm">{entry.content}</p>
                    {entry.contact && (
                      <p className="text-muted-foreground text-xs">
                        联系方式: {entry.contact}
                      </p>
                    )}
                    {entry.replyContent && (
                      <div className="bg-primary/10 border-primary mt-2 rounded border-l-2 p-2">
                        <div className="mb-1 flex items-center gap-2 text-xs font-medium">
                          <MessageSquare className="h-3 w-3" />
                          博主回复
                          <span className="text-muted-foreground">
                            {entry.replyAt && formatDate(entry.replyAt)}
                          </span>
                        </div>
                        <p className="text-sm">{entry.replyContent}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!entry.isApproved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleApprove(entry, true)}
                        title="通过审核"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    {entry.isApproved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleApprove(entry, false)}
                        title="取消审核"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openReply(entry)}
                      title="回复"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(entry)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDelete(entry)}
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
        title={editMode === 'create' ? '新增留言' : '编辑留言'}
        description="管理留言墙内容"
        onSubmit={handleSave}
        isSubmitting={isSubmitting}
        submitLabel={editMode === 'create' ? '创建' : '保存'}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">昵称</label>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="访客昵称"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">背景颜色</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setBgColor(color.value)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    bgColor === color.value
                      ? 'border-primary scale-110'
                      : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">联系方式</label>
            <Input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="网址或联系方式（可选）"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">留言内容</label>
            <textarea
              value={content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setContent(e.target.value)
              }
              placeholder="留下你的足迹...（最多300字）"
              maxLength={300}
              rows={4}
              className="focus:ring-primary w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            />
            <div className="text-muted-foreground mt-1 text-xs">
              {content.length}/300
            </div>
          </div>
        </div>
      </CrudFormDialog>

      {/* 回复对话框 */}
      <CrudFormDialog
        open={isReplyDialogOpen}
        onOpenChange={setIsReplyDialogOpen}
        title="回复留言"
        description={`回复 ${selectedEntry?.nickname} 的留言`}
        onSubmit={handleReply}
        isSubmitting={isSubmitting}
        submitLabel="回复"
      >
        <div className="space-y-4">
          <div className="bg-muted rounded p-3 text-sm">
            {selectedEntry?.content}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">回复内容</label>
            <textarea
              value={replyContent}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setReplyContent(e.target.value)
              }
              placeholder="写下你的回复..."
              rows={4}
              className="focus:ring-primary w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
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
            确定要删除 <strong>{selectedEntry?.nickname}</strong>{' '}
            的留言吗？此操作不可恢复。
          </>
        }
        onConfirm={handleDelete}
        isDeleting={isSubmitting}
      />
    </>
  );
}

// 导入 adminCreateGuestbookEntry 用于管理员创建
async function adminCreateGuestbookEntry(input: {
  nickname: string;
  bgColor: string;
  contact?: string;
  content: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const { adminCreateGuestbookEntry: createEntry } = await import(
    '@/actions/admin/guestbook-actions'
  );
  return createEntry(input);
}
