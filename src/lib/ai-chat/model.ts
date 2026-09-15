import { deepseek } from '@ai-sdk/deepseek';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel } from 'ai';
import {
  DEFAULT_PROVIDER,
  PROVIDERS,
  type ProviderValue,
} from '@/config/providers';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// 从 src/app/api/chat/route.ts 抽出，供 API route 与标题 server action 复用。
export function getModel(
  provider: ProviderValue,
  model: string
): LanguageModel {
  // 白名单校验，防止乱传字符串导致运行时报错，也避免以后被恶意 body 打穿
  const selectedProvider = PROVIDERS.find((p) => p.value === provider)
    ? provider
    : DEFAULT_PROVIDER;

  switch (selectedProvider) {
    case 'openrouter':
      return openrouter(model);
    case 'deepseek':
      return deepseek(model);
  }
}