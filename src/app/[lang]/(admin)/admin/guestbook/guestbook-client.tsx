'use client';

import { COLOR_OPTIONS } from '@/config';
import { Check, Edit, MessageSquare, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import {
  adminApproveGuestbook,
  adminDeleteGuestbook,
  adminGetGuestbookEntries,
  adminReplyGuestbook,
  adminSendReplyNotification,
  adminUpdateGuestbook,
} from '@/actions/admin/guestbook-actions';
import {
  AdminPageLayout,
  createRefreshAction,
} from '@/components/admin/admin-page-layout';
import { CrudFormDialog } from '@/components/admin/crud-form-dialog';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Badge } from '@/components/shadcn-ui/badge';
import { Button } from '@/components/shadcn-ui/button';
import { Input } from '@/components/shadcn-ui/input';
import { useCrud } from '@/hooks/use-crud';
import { Guestbook } from '@/lib/guestbook';
import { formatDate, isEmail } from '@/utils/utils';

type GuestbookCreateInput = {
  nickname: string;
  bgColor: string;
  contact?: string;
  content: string;
};

type GuestbookUpdateInput = Partial<GuestbookCreateInput>;

export default function GuestbookClient({
  initialEntries,
}: {
  initialEntries: Guestbook[];
}) {
  // === 用 useCrud 管理标准 CRUD ===
  const crud = useCrud<Guestbook, GuestbookCreateInput, GuestbookUpdateInput>({
    getList: adminGetGuestbookEntries,
    // 此处只能编辑留言，不能新增，占位，不实现新增功能
    create: async () => ({
      success: true,
      data: undefined,
    }),
    update: adminUpdateGuestbook,
    delete: adminDeleteGuestbook,
    idField: 'id',
    initialData: initialEntries,
    updateSuccessMessage: '留言更新成功',
    deleteSuccessMessage: '留言删除成功',
  });

  const {
    items: entries,
    loading,
    isSubmitting,
    selectedItem: selectedEntry,
    isEditDialogOpen,
    isDeleteDialogOpen,
    fetchItems,
    updateItem,
    deleteItem,
    openEditDialog,
    openDeleteDialog,
    closeDialogs,
    setItems,
    setSubmitting,
    setIsDeleteDialogOpen,
  } = crud;

  // === 表单状态（页面独有） ===
  const [nickname, setNickname] = useState('');
  const [bgColor, setBgColor] = useState(COLOR_OPTIONS[0].value);
  const [contact, setContact] = useState('');
  const [content, setContent] = useState('');

  // === 回复对话框状态（独立于 CRUD hook 的对话框） ===
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyTarget, setReplyTarget] = useState<Guestbook | null>(null);

  // 打开编辑时回填表单
  useEffect(() => {
    if (isEditDialogOpen && selectedEntry) {
      setNickname(selectedEntry.nickname);
      setBgColor(selectedEntry.bgColor);
      setContact(selectedEntry.contact || '');
      setContent(selectedEntry.content);
    }
  }, [isEditDialogOpen, selectedEntry]);

  // 合并 edit 对话框
  const isFormDialogOpen = isEditDialogOpen;
  const handleFormDialogOpenChange = (open: boolean) => {
    if (!open) closeDialogs();
  };

  // === 保存 ===
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // 此处只能编辑留言，不能新增
    if (!selectedEntry) return;
    await updateItem(selectedEntry.id, {
      nickname,
      bgColor,
      contact: contact || undefined,
      content,
    });
  };

  // === 打开回复对话框 ===
  const openReplyDialog = (entry: Guestbook) => {
    setReplyTarget(entry);
    setReplyContent(entry.replyContent || '');
    setIsReplyDialogOpen(true);
  };

  // === 保存回复 ===
  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTarget) return;

    setSubmitting(true);
    const {
      id: entryId,
      contact,
      content: originalContent,
      isRepliedEmail,
      isEmailNotificationEnabled = false,
    } = replyTarget;

    try {
      const result = await adminReplyGuestbook(entryId, replyContent);
      if (!result.success) throw new Error(result.error);
      toast.success('回复成功');
      setIsReplyDialogOpen(false);
      setReplyTarget(null);

      // 本地 patch — 无需重新拉取全部数据
      setItems((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? { ...e, replyContent, replyAt: new Date().toISOString() }
            : e
        )
      );

      // 如果是邮箱,且未发送回复邮件,且开启了邮箱通知
      if (
        contact &&
        isEmail(contact) &&
        !isRepliedEmail &&
        isEmailNotificationEnabled
      ) {
        const emailResult = await adminSendReplyNotification(
          { id: entryId, replyContent },
          { email: contact, content: originalContent }
        );
        if (emailResult.success) {
          console.log(`[邮件通知] 回复邮件发送成功: ${contact}`);
          // 更新 isRepliedEmail 标记
          setItems((prev) =>
            prev.map((e) =>
              e.id === entryId ? { ...e, isRepliedEmail: true } : e
            )
          );
        } else {
          toast.error('邮件通知发送失败');
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '回复失败');
    } finally {
      setSubmitting(false);
    }
  };

  // === 审核留言 ===
  const handleApprove = async (entry: Guestbook, approved: boolean) => {
    try {
      const result = await adminApproveGuestbook(entry.id, approved);
      if (!result.success) throw new Error(result.error);
      toast.success(approved ? '留言已通过审核' : '留言已拒绝');
      setItems((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, isApproved: approved } : e
        )
      );
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
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
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
                      onClick={() => openReplyDialog(entry)}
                      title="回复"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(entry)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(entry)}
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

      {/* 表单对话框（编辑留言） */}
      <CrudFormDialog
        // 此处只能编辑留言，不能新增
        open={isFormDialogOpen}
        onOpenChange={handleFormDialogOpenChange}
        title="编辑留言"
        description="管理留言墙内容"
        onSubmit={handleSave}
        isSubmitting={isSubmitting}
        submitLabel={'保存'}
      >
        <div className="max-h-[calc(100vh-200px)] space-y-4 overflow-y-auto">
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

      {/* 回复对话框（独立于 CRUD hook） */}
      <CrudFormDialog
        open={isReplyDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsReplyDialogOpen(false);
            setReplyTarget(null);
          }
        }}
        title="回复留言"
        description={`回复 ${replyTarget?.nickname} 的留言`}
        onSubmit={handleReply}
        isSubmitting={isSubmitting}
        submitLabel="回复"
      >
        <div className="max-h-[calc(100vh-200px)] space-y-4 overflow-y-auto">
          <div className="bg-muted rounded p-3 text-sm">
            {replyTarget?.content}
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
        onConfirm={deleteItem}
        isDeleting={isSubmitting}
      />
    </>
  );
}
