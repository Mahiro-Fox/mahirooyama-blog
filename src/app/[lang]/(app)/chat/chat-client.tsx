'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import {
  AlertCircle,
  History,
  Lock,
  MessageSquarePlus,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { FormEvent, useCallback, useMemo, useState } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { ConversationList } from '@/components/ai-elements/conversation-list';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn-ui/select';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/shadcn-ui/sheet';
import { Spinner } from '@/components/shadcn-ui/spinner';
import { Link } from '@/components/shared/link';
import { useT } from '@/i18n/dictionary-provider';
import { conversationLocalStorage } from '@/lib/conversation-local-storage';
import { estimateTokens, MAX_CONTEXT_TOKENS } from '@/lib/tokens';

const PROVIDERS: {
  label: string;
  value: 'deepseek' | 'openrouter';
  lockedWhenNoAuth?: boolean;
}[] = [
  { label: 'DeepSeek', value: 'deepseek', lockedWhenNoAuth: true },
  { label: 'OpenRouter (Free)', value: 'openrouter' },
];

type Provider = 'deepseek' | 'openrouter';

interface ChatClientProps {
  isUserAuth: boolean;
}

export function ChatClient({ isUserAuth }: ChatClientProps) {
  const t = useT();
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<Provider>('openrouter');
  const [conversationId, setConversationId] = useState<string | undefined>(
    undefined
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [listKey, setListKey] = useState(0);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({ provider, conversationId }),
      }),
    [provider, conversationId]
  );

  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    regenerate,
    setMessages,
  } = useChat({
    transport,
    onFinish: ({ message, messages: allMessages, isAbort }) => {
      if (isAbort) return;

      const metadata = message.metadata as
        | { conversationId?: string }
        | undefined;
      const newConvId = metadata?.conversationId;

      // 如果有新的对话ID，更新当前对话ID并刷新列表
      if (newConvId && newConvId !== conversationId) {
        setConversationId(newConvId);
        setListKey((k) => k + 1);
      }

      if (!isUserAuth && newConvId) {
        try {
          conversationLocalStorage.saveMessages(newConvId, allMessages);
        } catch {
          // silent
        }
      }
    },
    onError: (err: Error) => {
      try {
        const parsed = JSON.parse(err.message);
        if (parsed && typeof parsed.estimatedTokens === 'number') {
          toast.error(
            t('chat.context_limit_exceeded', {
              current: String(parsed.estimatedTokens),
              max: String(parsed.limit ?? MAX_CONTEXT_TOKENS),
            }),
            {
              description: t('chat.context_limit_hint'),
            }
          );
        } else {
          toast.error(err.message);
        }
      } catch {
        toast.error(err.message);
      }
    },
  });

  const isBusy = status === 'submitted' || status === 'streaming';

  const handleSubmit = (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!message.text.trim() || isBusy) return;

    const pendingMessages = [
      ...messages,
      {
        id: `pending-${Date.now()}`,
        role: 'user' as const,
        parts: [{ type: 'text' as const, text: message.text }],
      },
    ];
    const estimatedTokens = estimateTokens(pendingMessages);
    // 检查是否超过上下文限制
    if (estimatedTokens > MAX_CONTEXT_TOKENS) {
      toast.error(
        t('chat.context_limit_exceeded', {
          current: String(estimatedTokens),
          max: String(MAX_CONTEXT_TOKENS),
        }),
        {
          description: t('chat.context_limit_hint'),
        }
      );
      return;
    }

    sendMessage({ text: message.text });
    requestAnimationFrame(() => setInput(''));
  };

  // 新建对话
  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(undefined);
    setInput('');
  }, [setMessages]);

  const handleSelectConversation = useCallback(
    (id: string, convMessages: UIMessage[]) => {
      setConversationId(id);
      setMessages(convMessages);
      setInput('');
      setSidebarOpen(false);
    },
    [setMessages]
  );

  const handleListChanged = useCallback(() => {
    setListKey((k) => k + 1);
  }, []);

  const handleDeletedCurrent = useCallback(() => {
    setMessages([]);
    setConversationId(undefined);
  }, [setMessages]);

  return (
    <div className="container flex max-h-[calc(100vh-50px)] flex-1 gap-4 p-4 md:max-h-[calc(100vh-160px)] md:p-0">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-center gap-2 pt-6">
          {/* Mobile sidebar via Sheet */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
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
                onSelect={handleSelectConversation}
                onDeleted={handleListChanged}
                onDeletedCurrent={handleDeletedCurrent}
              />
            </SheetContent>
          </Sheet>
          <MessageSquarePlus
            className="size-4"
            onClick={handleNewConversation}
          />
        </div>

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
              <Message
                from="assistant"
                className="animate-in fade-in duration-200"
              >
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
                  onClick={() => regenerate()}
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

        <PromptInput onSubmit={handleSubmit} className="mb-4">
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chat.input_placeholder')}
              disabled={isBusy}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <Select
              value={provider}
              onValueChange={(value) => setProvider(value as Provider)}
              disabled={isBusy}
            >
              <SelectTrigger className="cursor-pointer transition-opacity disabled:cursor-not-allowed disabled:opacity-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{t('chat.provider')}</SelectLabel>
                  {PROVIDERS.map((item) => {
                    const isLocked = item.lockedWhenNoAuth && !isUserAuth;
                    return (
                      <SelectItem
                        key={item.value}
                        value={item.value}
                        disabled={isLocked}
                        className="cursor-pointer"
                      >
                        <span className="flex items-center gap-1">
                          {isLocked && <Lock className="h-3 w-3" />}
                          {item.label}
                          {isLocked && (
                            <span className="text-muted-foreground text-xs">
                              ({t('chat.deepseek_locked')})
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>

            {status === 'streaming' ? (
              <button
                type="button"
                onClick={() => stop()}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              >
                {t('chat.stop')}
              </button>
            ) : (
              <PromptInputSubmit
                className="cursor-pointer"
                status={status}
                disabled={input.trim() === '' && !isBusy}
              />
            )}
          </PromptInputFooter>
        </PromptInput>

        {!isUserAuth && (
          <div className="text-muted-foreground mx-auto mb-4 text-center text-xs">
            <Link
              href="/signin?redirect=/chat"
              className="text-primary hover:underline"
            >
              {t('chat.deepseek_login')}
            </Link>
            {' · '}
            {t('chat.deepseek_desc')}
          </div>
        )}
      </div>
    </div>
  );
}
