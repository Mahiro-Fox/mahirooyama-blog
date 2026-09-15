'use server';

import { conversationStore } from '@/store/conversation-store';
import { PROVIDERS, type ProviderValue } from '@/config/providers';
import { generateTitle } from '@/lib/ai-chat/ai-title';
import { verifyUserAuth } from '@/lib/user-auth';

export interface GenerateTitleInput {
  conversationId: string;
  userMessage: string;
}

// 统一生成会话标题：登录用 deepseek，未登录强制 openrouter（保护 deepseek key，符合"deepseek 需登录"）。
// 登录时顺带在服务端落库（可 import conversationStore），未登录把 title 返回给前端写 localStorage。
export async function generateConversationTitle(input: GenerateTitleInput) {
  const auth = await verifyUserAuth();

  const provider: ProviderValue = auth.success ? 'deepseek' : 'openrouter';
  const model =
    PROVIDERS.find((p) => p.value === provider)?.models[0].value ?? '';

  const title = await generateTitle(input.userMessage, provider, model);

  if (auth.success) {
    await conversationStore.updateTitle(
      auth.userId as string,
      input.conversationId,
      title
    );
    return { success: true, title, didUpdateDB: true } as const;
  }

  return { success: true, title, didUpdateDB: false } as const;
}
