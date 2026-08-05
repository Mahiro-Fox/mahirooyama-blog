'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { AlertCircle, Lock, RotateCcw } from 'lucide-react';
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
import { Link } from '@/components/shared/link';

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
                        {isLocked && (
                          <Lock className="h-3 w-3" />
                        )}
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
          <Link href="/signin?redirect=/chat" className="text-primary hover:underline">
            {t('chat.deepseek_login')}
          </Link>
          {' · '}
          {t('chat.deepseek_desc')}
        </div>
      )}
    </div>
  );
}
