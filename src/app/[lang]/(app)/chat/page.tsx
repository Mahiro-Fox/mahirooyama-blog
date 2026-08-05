'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
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
import { Spinner } from '@/components/shadcn-ui/spinner';
import { useT } from '@/i18n/dictionary-provider';

const PROVIDERS = [
  { label: 'DeepSeek 直连（coming soon）', value: 'deepseek', disabled: true },
  { label: 'OpenRouter', value: 'openrouter' },
];

type Provider = 'deepseek' | 'openrouter';

export default function ChatPage() {
  const t = useT();
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<Provider>('openrouter');

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({ provider }),
      }),
    [provider]
  );

  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    transport,
  });

  const isBusy = status === 'submitted' || status === 'streaming';

  const handleSubmit = (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!message.text.trim() || isBusy) return;
    sendMessage({ text: message.text });
    // 流式开始后再聚焦，避免和禁用态的 disabled 切换打架
    requestAnimationFrame(() => setInput(''));
  };

  return (
    <div className="container flex flex-1 flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
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
                    part.type === 'text' ? (
                      <MessageResponse key={i}>{part.text}</MessageResponse>
                    ) : null
                  )}
                </MessageContent>
              </Message>
            ))
          )}

          {/* 已发送、还没收到第一个 token：显示"思考中" */}
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

          {/* 请求出错：显示错误提示 + 重试按钮 */}
          {error && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive animate-in fade-in mx-auto flex items-center gap-2 rounded-md border px-3 py-2 text-sm duration-200">
              <AlertCircle className="size-4 shrink-0" />
              <span className="flex-1">{t('chat.error')}</span>
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
                {PROVIDERS.map((item) => (
                  <SelectItem
                    key={item.value}
                    value={item.value}
                    disabled={item.disabled}
                  >
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* streaming 时点击变成"停止"，而不是禁用发送按钮 */}
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
              // 禁用态：输入框为空且 not streaming
              disabled={input.trim() === '' && !isBusy}
            />
          )}
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
