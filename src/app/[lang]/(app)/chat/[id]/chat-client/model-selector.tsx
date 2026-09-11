import { ChatStatus } from 'ai';
import { Brain, Lock } from 'lucide-react';
import { PromptInputSubmit } from '@/components/ai-elements/prompt-input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn-ui/select';
import { Toggle } from '@/components/shadcn-ui/toggle';
import { PROVIDERS } from '@/config/providers';
import { useT } from '@/i18n/dictionary-provider';

/**
 * 模型选择器 + 停止/发送按钮
 */
export function ModelSelector({
  provider,
  onProviderChange,
  thinking,
  onThinkingChange,
  isUserAuth,
  status,
  isBusy,
  input,
  onStop,
  t,
}: {
  provider: { provider: string; model: string | undefined };
  onProviderChange: (provider: {
    provider: string;
    model: string | undefined;
  }) => void;
  thinking: boolean;
  onThinkingChange: (thinking: boolean) => void;
  isUserAuth: boolean;
  status: ChatStatus;
  isBusy: boolean;
  input: string;
  onStop: () => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <Select
          value={JSON.stringify(provider)}
          onValueChange={(value) => onProviderChange(JSON.parse(value))}
          disabled={isBusy}
        >
          <SelectTrigger className="cursor-pointer transition-opacity disabled:cursor-not-allowed disabled:opacity-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((provider) => {
              const isLocked = provider.lockedWhenNoAuth && !isUserAuth;
              return (
                <SelectGroup key={provider.value}>
                  <SelectLabel>{provider.label}</SelectLabel>
                  {provider.models.map((model) => (
                    <SelectItem
                      key={model.value}
                      value={JSON.stringify({
                        provider: provider.value,
                        model: model.value,
                      })}
                      disabled={isLocked}
                      className="cursor-pointer"
                    >
                      <span className="flex items-center gap-1">
                        {isLocked && <Lock className="h-3 w-3" />}
                        {model.label}
                        {isLocked && (
                          <span className="text-muted-foreground text-xs">
                            ({t('chat.deepseek_locked')})
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              );
            })}
          </SelectContent>
        </Select>

        {/* 思考模式开关（仅 DeepSeek 生效） */}
        {provider.provider === 'deepseek' && (
          <Toggle
            pressed={thinking}
            onPressedChange={onThinkingChange}
            disabled={isBusy}
            variant="outline"
            size="sm"
            aria-label={t('chat.thinking_mode')}
            className="hover:bg-secondary/10 cursor-pointer transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Brain />
            <span className="text-xs">{t('chat.thinking_mode')}</span>
          </Toggle>
        )}
      </div>

      {status === 'streaming' ? (
        <button
          type="button"
          onClick={() => onStop()}
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
    </>
  );
}
