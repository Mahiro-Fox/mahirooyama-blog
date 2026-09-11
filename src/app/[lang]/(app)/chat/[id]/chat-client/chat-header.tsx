import { UIMessage } from 'ai';
import { History, MessageSquarePlus } from 'lucide-react';
import { ConversationList } from '@/components/ai-elements/conversation-list';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/shadcn-ui/sheet';
import { useT } from '@/i18n/dictionary-provider';

/**
 * 顶部工具行（移动端历史侧边栏 + 新建对话）
 */
export function ChatHeader({
  sidebarOpen,
  onOpenChange,
  listKey,
  isUserAuth,
  conversationId,
  onSelectConversation,
  onListChanged,
  onDeletedCurrent,
  onNewConversation,
  t,
}: {
  sidebarOpen: boolean;
  onOpenChange: (open: boolean) => void;
  listKey: number;
  isUserAuth: boolean;
  conversationId?: string;
  onSelectConversation: (id: string, convMessages: UIMessage[]) => void;
  onListChanged: () => void;
  onDeletedCurrent: () => void;
  onNewConversation: () => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="flex items-center gap-2 pt-6">
      {/* Mobile sidebar via Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <History className="size-4" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="border-border flex items-center gap-2 border-b p-3">
            <History className="text-muted-foreground size-4" />
            <span className="text-sm font-medium">{t('chat.history')}</span>
          </SheetTitle>
          <ConversationList
            key={listKey}
            isUserAuth={isUserAuth}
            currentConversationId={conversationId}
            onSelect={onSelectConversation}
            onDeleted={onListChanged}
            onDeletedCurrent={onDeletedCurrent}
          />
        </SheetContent>
      </Sheet>
      <MessageSquarePlus className="size-4" onClick={onNewConversation} />
    </div>
  );
}
