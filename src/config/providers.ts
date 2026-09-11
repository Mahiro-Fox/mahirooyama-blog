import { fetchOpenRouterFreeModels } from '@/actions/app/free-models';

export type ProviderValue = 'deepseek' | 'openrouter';

interface Provider {
  label: string;
  value: ProviderValue;
  models: { label: string; value: string }[];
  lockedWhenNoAuth?: boolean;
}

const models = await fetchOpenRouterFreeModels();

export const PROVIDERS: Provider[] = [
  {
    label: 'OpenRouter (Free)',
    value: 'openrouter',
    models: models,
  },
  {
    label: 'DeepSeek',
    value: 'deepseek',
    models: [
      {
        label: 'DeepSeek-V4.1-Flash',
        value: 'deepseek-flash',
      },
      // {
      //   label: 'DeepSeek V4 Pro',
      //   value: 'deepseek-v4-pro',
      // },
    ],
    lockedWhenNoAuth: true,
  },
];

export const DEFAULT_PROVIDER = 'openrouter';
