import { ChatStatus, UIMessage } from 'ai';
import { AlertCircle, RotateCcw } from 'lucide-react';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import { Spinner } from '@/components/shared/spinner';
import { useT } from '@/i18n/dictionary-provider';
import { MAX_CONTEXT_TOKENS } from '@/lib/tokens';

/**
 * 消息会话区域（含空状态、思考中提示、错误条）
 */
export function MessagesPanel({
  messages,
  status,
  error,
  onRetry,
  t,
}: {
  messages: UIMessage[];
  status: ChatStatus;
  error?: Error | null;
  onRetry: () => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <Conversation>
      <ConversationContent className="pr-4">
        {messages.length === 0 ? (
          <ConversationEmptyState
            title={t('chat.start_title')}
            description={t('chat.start_desc')}
          />
        ) : (
          messages.map((message) => (
            <Message
              key={message.id}
              from={message.role}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <MessageContent>
                {message.parts.map((part, i) =>
                  part.type === 'reasoning' ? (
                    <div
                      className="text-muted-foreground flex flex-col gap-1 text-sm"
                      key={i}
                    >
                      {status === 'streaming' &&
                        i === message.parts.length - 1 && (
                          <p>{t('chat.thinking')}</p>
                        )}
                      <p>{part.text}</p>
                    </div>
                  ) : part.type === 'text' ? (
                    <MessageResponse key={i}>{part.text}</MessageResponse>
                  ) : null
                )}
              </MessageContent>
            </Message>
          ))
        )}

        {status === 'submitted' && (
          <Message from="assistant" className="animate-in fade-in duration-200">
            <MessageContent>
              <Spinner />
            </MessageContent>
          </Message>
        )}

        {error && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive animate-in fade-in mx-auto flex items-center gap-2 rounded-md border px-3 py-2 text-sm duration-200">
            <AlertCircle className="size-4 shrink-0" />
            <span className="flex-1">
              {(() => {
                try {
                  const parsed = JSON.parse(error.message);
                  if (parsed?.error === 'Context limit exceeded') {
                    return t('chat.context_limit_exceeded', {
                      current: String(parsed.estimatedTokens ?? '?'),
                      max: String(parsed.limit ?? MAX_CONTEXT_TOKENS),
                    });
                  }
                } catch {
                  /* not a JSON error */
                }
                return t('chat.error');
              })()}
            </span>
            <button
              type="button"
              onClick={() => onRetry()}
              className="hover:bg-destructive/10 flex items-center gap-1 rounded px-2 py-1 text-xs font-medium"
            >
              <RotateCcw className="size-3" />
              {t('chat.retry')}
            </button>
          </div>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
