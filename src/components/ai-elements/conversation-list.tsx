'use client';

import { ConversationSummary } from '@/store/conversation-store';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/shadcn-ui/button';
import { useT } from '@/i18n/dictionary-provider';
import {
  conversationLocalStorage,
  type StoredConversationSummary,
} from '@/lib/conversation-local-storage';
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

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      if (isUserAuth) {
        const res = await fetch('/api/conversations');
        if (res.ok) {
          const data = (await res.json()) as ConversationSummary[];
          setSummaries(data);
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
      try {
        if (isUserAuth) {
          const res = await fetch(`/api/conversations/${id}`);
          if (res.ok) {
            const data = await res.json();
            onSelect(data.id, data.messages);
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
    [isUserAuth, onSelect, t]
  );

  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setDeletingId(id);
      const isCurrent = id === currentConversationId;
      try {
        if (isUserAuth) {
          const res = await fetch(`/api/conversations/${id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            toast.success(t('chat.conversation_deleted'));
            onDeleted?.();
            if (isCurrent) onDeletedCurrent?.();
            await fetchList();
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
              return (
                <li key={item.id}>
                  <div
                    onClick={() => handleSelect(item.id)}
                    className={cn(
                      'group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {item.title || t('chat.untitled_conversation')}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {formatTime(item.updatedAt)}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => handleDelete(item.id, e)}
                      disabled={deletingId === item.id}
                      className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
                      title={t('chat.delete_conversation')}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
