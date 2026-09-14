import { Lock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn-ui/select';
import { useT } from '@/i18n/dictionary-provider';

export type ChatMode = 'chat' | 'agent';

/**
 * 标准对话 / Agent 模式切换。
 * Agent 模式走 Mastra Agent（工具 + 记忆），需登录（后端强制），未登录时置灰。
 */
export function ModeSwitch({
  mode,
  onModeChange,
  isBusy,
  isUserAuth,
}: {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  isBusy: boolean;
  isUserAuth: boolean;
}) {
  const t = useT();
  return (
    <Select
      value={mode}
      onValueChange={(value) => onModeChange(value as ChatMode)}
      disabled={isBusy}
    >
      <SelectTrigger
        aria-label={t('chat.mode_label')}
        className="cursor-pointer transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="chat" className="cursor-pointer">
          {t('chat.mode_standard')}
        </SelectItem>
        <SelectItem
          value="agent"
          disabled={!isUserAuth}
          className="cursor-pointer"
        >
          <span className="flex items-center gap-1">
            {!isUserAuth && <Lock className="h-3 w-3" />}
            {t('chat.mode_agent')}
            {!isUserAuth && (
              <span className="text-muted-foreground text-xs">
                ({t('chat.agent_locked')})
              </span>
            )}
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}