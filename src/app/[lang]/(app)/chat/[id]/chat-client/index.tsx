'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputMessage,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { Link } from '@/components/shared/link';
import { DEFAULT_PROVIDER, PROVIDERS } from '@/config/providers';
import { useT } from '@/i18n/dictionary-provider';
import { conversationLocalStorage } from '@/lib/conversation-local-storage';
import { estimateTokens, MAX_CONTEXT_TOKENS } from '@/lib/tokens';
import { ChatHeader } from './chat-header';
import { MessagesPanel } from './message-panel';
import { ModeSwitch, type ChatMode } from './mode-switch';
import { ModelSelector } from './model-selector';

interface ChatClientProps {
  isUserAuth: boolean;
  /** 当前会话 id（URL /chat/[id]），未登录/新对话时为 undefined */
  initialId?: string;
  /** 该会话的历史消息（SSR 从 conversationStore 取到，作为 useChat 初始值） */
  initialMessages?: UIMessage[];
}

const getLocalStorageConfiguration = (isUserAuth: boolean) => {
  const config = localStorage.getItem('chatConfig');
  const defaultConfig = {
    mode: 'chat',
    thinking: false,
    provider: {
      provider: DEFAULT_PROVIDER,
      model: PROVIDERS.find((p) => p.value === DEFAULT_PROVIDER)?.models[0]
        .value,
    },
  };
  if (!config) return defaultConfig;
  try {
    const configObj = JSON.parse(config);
    if (!isUserAuth) {
      configObj.mode = 'chat';
      if (configObj.provider.provider === 'deepseek')
        configObj.provider = defaultConfig.provider;
    }
    return configObj;
  } catch (error) {
    toast.error('配置文件格式错误');
    return defaultConfig;
  }
};

export function ChatClient({
  isUserAuth,
  initialId,
  initialMessages,
}: ChatClientProps) {
  const {
    mode: configMode,
    thinking: configThinking,
    provider: configProvider,
  } = getLocalStorageConfiguration(isUserAuth);
  const t = useT();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState(configProvider);
  const [thinking, setThinking] = useState(configThinking);
  const [mode, setMode] = useState<ChatMode>(configMode);
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialId
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [listKey, setListKey] = useState(0);

  useEffect(() => {
    // 保存当前配置到 localStorage
    localStorage.setItem(
      'chatConfig',
      JSON.stringify({
        mode,
        thinking,
        provider,
      })
    );
  }, [provider, thinking, mode]);

  // 标准对话走 /api/chat；Agent 模式走 /api/mastra-chat（Mastra Agent，工具+记忆）
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: mode === 'agent' ? '/api/mastra-chat' : '/api/chat',
        body: () =>
          mode === 'agent'
            ? { conversationId }
            : {
                provider: provider.provider,
                model: provider.model,
                conversationId,
                thinking,
              },
      }),
    [mode, provider, conversationId, thinking]
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
    // ChatInit 的初始消息字段是 messages；加载历史会话时 SSR 注入到这里
    messages: initialMessages,
    onFinish: ({ message, messages: allMessages, isAbort }) => {
      if (isAbort) return;

      const metadata = message.metadata as
        | { conversationId?: string }
        | undefined;
      const newConvId = metadata?.conversationId;

      // 如果有新的对话ID，更新当前对话ID并刷新列表
      if (newConvId && newConvId !== conversationId) {
        // 登录态：URL 反映会话 -> 导航到 /chat/[id]；未登录：本地更新即可
        if (isUserAuth) {
          router.push(`/chat/${newConvId}`);
        } else {
          setConversationId(newConvId);
        }
        setListKey((k) => k + 1);
      }

      if (!isUserAuth && newConvId) {
        try {
          conversationLocalStorage.saveMessages(newConvId, allMessages);
        } catch (err) {
          console.error('Error saving conversation messages:', err);
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
    // 登录态：跳到新对话页 /chat；未登录：本地清空会话
    if (isUserAuth) {
      router.push('/chat');
      return;
    }
    setMessages([]);
    setConversationId(undefined);
    setInput('');
  }, [isUserAuth, router, setMessages]);

  const handleSelectConversation = useCallback(
    (id: string, convMessages: UIMessage[]) => {
      // 登录态：导航到 /chat/[id]，历史由 SSR 加载；未登录：仍本地切换
      if (isUserAuth) {
        router.push(`/chat/${id}`);
        setSidebarOpen(false);
        return;
      }
      setConversationId(id);
      setMessages(convMessages);
      setInput('');
      setSidebarOpen(false);
    },
    [isUserAuth, router, setMessages]
  );

  const handleListChanged = useCallback(() => {
    setListKey((k) => k + 1);
  }, []);

  const handleDeletedCurrent = useCallback(() => {
    if (isUserAuth) {
      router.push('/chat');
      return;
    }
    setMessages([]);
    setConversationId(undefined);
  }, [isUserAuth, router, setMessages]);

  return (
    <div className="container flex max-h-[calc(100vh-50px)] flex-1 gap-4 p-4 md:max-h-[calc(100vh-160px)] md:p-0">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <ChatHeader
          sidebarOpen={sidebarOpen}
          onOpenChange={setSidebarOpen}
          listKey={listKey}
          isUserAuth={isUserAuth}
          conversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onListChanged={handleListChanged}
          onDeletedCurrent={handleDeletedCurrent}
          onNewConversation={handleNewConversation}
          t={t}
        />

        <MessagesPanel
          messages={messages}
          status={status}
          error={error}
          onRetry={regenerate}
          t={t}
        />

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
            <div className="flex items-center gap-2">
              <ModeSwitch
                mode={mode}
                onModeChange={setMode}
                isBusy={isBusy}
                isUserAuth={isUserAuth}
              />
              <ModelSelector
                provider={provider}
                onProviderChange={setProvider}
                thinking={thinking}
                onThinkingChange={setThinking}
                isUserAuth={isUserAuth}
                status={status}
                isBusy={isBusy}
                input={input}
                onStop={stop}
                t={t}
                variant={mode === 'agent' ? 'agent' : 'full'}
              />
            </div>
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
