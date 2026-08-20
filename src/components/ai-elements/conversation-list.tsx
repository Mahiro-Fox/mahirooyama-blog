'use client';

import { ConversationSummary } from '@/store/conversation-store';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/shadcn-ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn-ui/dialog';
import { Input } from '@/components/shadcn-ui/input';
import { useT } from '@/i18n/dictionary-provider';
import {
  conversationLocalStorage,
  type StoredConversationSummary,
} from '@/lib/conversation-local-storage';
import {
  deleteConversation,
  getConversation,
  getMyConversations,
  renameConversation,
} from '@/actions/admin/conversation-actions';
import { cn } from '@/utils/utils';

interface ConversationListProps {
  isUserAuth: boolean;
  currentConversationId?: string;
  onSelect: (
    conversationId: string,
    messages: import('ai').UIMessage[]
  ) => void;
  onDeleted?: () => void;
  onDeletedCurrent?: () => void;
  className?: string;
}

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (diff < oneDay) {
    return d.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
};

interface ConversationListItemProps {
  item: ConversationSummary | StoredConversationSummary;
  isActive: boolean;
  isEditing: boolean;
  isDeleting: boolean;
  editValue: string;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (id: string) => void;
  onStartEdit: (id: string, currentTitle: string, e: React.MouseEvent) => void;
  onEditChange: (value: string) => void;
  onEditBlur: () => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
  onDeleteClick: (id: string) => void;
}

function ConversationListItem({
  item,
  isActive,
  isEditing,
  isDeleting,
  editValue,
  editInputRef,
  onSelect,
  onStartEdit,
  onEditChange,
  onEditBlur,
  onEditKeyDown,
  onDeleteClick,
}: ConversationListItemProps) {
  const t = useT();
  return (
    <li key={item.id}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(item.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(item.id);
          }
        }}
        className={cn(
          'group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
          isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
        )}
      >
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <Input
              ref={editInputRef}
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              onBlur={onEditBlur}
              onKeyDown={onEditKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="h-7 text-sm"
              maxLength={100}
            />
          ) : (
            <>
              <div className="truncate font-medium">
                {item.title || t('chat.untitled_conversation')}
              </div>
              <div className="text-muted-foreground text-xs">
                {isDeleting ? t('chat.deleting') : formatTime(item.updatedAt)}
              </div>
            </>
          )}
        </div>
        {!isEditing && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) =>
                onStartEdit(
                  item.id,
                  item.title || t('chat.untitled_conversation'),
                  e
                )
              }
              disabled={isDeleting}
              className="text-muted-foreground hover:text-foreground h-6 w-6"
              title={t('chat.rename_conversation')}
            >
              <Pencil className="size-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick(item.id);
              }}
              disabled={isDeleting}
              className="text-muted-foreground hover:text-destructive h-6 w-6"
              title={t('chat.delete_conversation')}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

interface DeleteConfirmDialogProps {
  confirmDeleteId: string | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

/** 删除确认弹窗 */
function DeleteConfirmDialog({
  confirmDeleteId,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const t = useT();
  return (
    <Dialog
      open={confirmDeleteId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('chat.delete_confirm_title')}</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('chat.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirmDeleteId) onConfirm(confirmDeleteId);
            }}
          >
            {t('chat.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConversationList({
  isUserAuth,
  currentConversationId,
  onSelect,
  onDeleted,
  onDeletedCurrent,
  className,
}: ConversationListProps) {
  const t = useT();
  const [summaries, setSummaries] = useState<
    ConversationSummary[] | StoredConversationSummary[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  // 删除确认弹窗
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      if (isUserAuth) {
        const res = await getMyConversations();
        if (res.success && res.data) {
          setSummaries(res.data);
        }
      } else {
        const data = conversationLocalStorage.list();
        setSummaries(data);
      }
    } catch {
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  }, [isUserAuth]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleSelect = useCallback(
    async (id: string) => {
      // 编辑中不触发选择
      if (editingId) return;

      try {
        if (isUserAuth) {
          const res = await getConversation(id);
          if (res.success && res.data) {
            onSelect(res.data.id, res.data.messages);
          }
        } else {
          const conv = conversationLocalStorage.get(id);
          if (conv) {
            onSelect(conv.id, conv.messages);
          }
        }
      } catch {
        toast.error(t('chat.load_conversation_failed'));
      }
    },
    [isUserAuth, onSelect, t, editingId]
  );

  // === 编辑标题 ===
  const startEdit = useCallback(
    (id: string, currentTitle: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingId(id);
      setEditValue(currentTitle);
      // 等下一帧 input 挂载后聚焦
      requestAnimationFrame(() => editInputRef.current?.focus());
    },
    []
  );

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }

    try {
      if (isUserAuth) {
        const res = await renameConversation(editingId, trimmed);
        if (res.success && typeof res.data === 'string') {
          setSummaries((prev) =>
            prev.map((s) =>
              s.id === editingId ? { ...s, title: res.data as string } : s
            )
          );
        } else {
          toast.error(res.error ?? t('chat.update_title_failed'));
        }
      } else {
        conversationLocalStorage.updateTitle(editingId, trimmed);
        setSummaries((prev) =>
          prev.map((s) => (s.id === editingId ? { ...s, title: trimmed } : s))
        );
      }
    } catch {
      toast.error(t('chat.update_title_failed'));
    } finally {
      setEditingId(null);
    }
  }, [editingId, editValue, isUserAuth, t]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveEdit();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    },
    [saveEdit, cancelEdit]
  );

  // === 删除 ===
  const handleDelete = useCallback(
    async (id: string) => {
      setConfirmDeleteId(null);
      setDeletingId(id);
      const isCurrent = id === currentConversationId;
      try {
        if (isUserAuth) {
          const res = await deleteConversation(id);
          if (res.success) {
            toast.success(t('chat.conversation_deleted'));
            onDeleted?.();
            if (isCurrent) onDeletedCurrent?.();
            await fetchList();
          } else {
            toast.error(res.error ?? t('chat.delete_conversation_failed'));
          }
        } else {
          conversationLocalStorage.delete(id);
          toast.success(t('chat.conversation_deleted'));
          onDeleted?.();
          if (isCurrent) onDeletedCurrent?.();
          setSummaries((prev) => prev.filter((s) => s.id !== id));
        }
      } catch {
        toast.error(t('chat.delete_conversation_failed'));
      } finally {
        setDeletingId(null);
      }
    },
    [
      isUserAuth,
      fetchList,
      onDeleted,
      onDeletedCurrent,
      currentConversationId,
      t,
    ]
  );

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-muted-foreground p-4 text-center text-xs">
            {t('chat.loading')}
          </div>
        ) : summaries.length === 0 ? (
          <div className="text-muted-foreground p-4 text-center text-xs">
            {t('chat.no_history')}
          </div>
        ) : (
          <ul className="space-y-0.5 p-2">
            {summaries.map((item) => {
              const isActive = item.id === currentConversationId;
              const isEditing = item.id === editingId;
              const isDeleting = deletingId === item.id;

              return (
                <ConversationListItem
                  key={item.id}
                  item={item}
                  isActive={isActive}
                  isEditing={isEditing}
                  isDeleting={isDeleting}
                  editValue={editValue}
                  editInputRef={editInputRef}
                  onSelect={handleSelect}
                  onStartEdit={startEdit}
                  onEditChange={setEditValue}
                  onEditBlur={saveEdit}
                  onEditKeyDown={handleEditKeyDown}
                  onDeleteClick={(id) => setConfirmDeleteId(id)}
                />
              );
            })}
          </ul>
        )}
      </div>

      {/* 删除确认弹窗 */}
      <DeleteConfirmDialog
        confirmDeleteId={confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
