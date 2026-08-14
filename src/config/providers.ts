export type ProviderValue = 'deepseek' | 'openrouter';

interface Provider {
  label: string;
  value: ProviderValue;
  models: { label: string; value: string }[];
  lockedWhenNoAuth?: boolean;
}

export const PROVIDERS: Provider[] = [
  {
    label: 'OpenRouter (Free)',
    value: 'openrouter',
    models: [
      {
        label: 'Poolside: Laguna S 2.1 (free)',
        value: 'poolside-laguna-s-2.1:free',
      },
      {
        label: 'NVIDIA: Nemotron 3 Super 120B A12B (free)',
        value: 'nemotron-3-super-120b-a12b:free',
      },
      {
        label: 'Cohere: North Mini Code (free)',
        value: 'cohere-north-mini-code:free',
      },
      {
        label: 'Poolside: Laguna XS 2.1 (free)',
        value: 'poolside-laguna-xs-2.1:free',
      },
      {
        label: 'NVIDIA: Nemotron 3 Nano 30B A3B (free)',
        value: 'nemotron-3-nano-30b-a3b:free',
      },
      {
        label: 'NVIDIA: Nemotron 3 Nano Omni 30B A3B Reasoning (free)',
        value: 'nemotron-3-nano-omni-30b-a3b-reasoning:free',
      },
      {
        label: 'NVIDIA: Nemotron 3 Nano 9B V2 (free)',
        value: 'nemotron-nano-9b-v2:free',
      },
      {
        label: 'Google: Gemma 4-26B-4B-IT (free)',
        value: 'google/gemma-4-26b-a4b-it:free',
      },
      {
        label: 'OpenAI: GPT-20B OSS (free)',
        value: 'openai/gpt-oss-20b:free',
      },
      {
        label: 'NVIDIA: Nemotron 3 Nano 12B V2 VL (free)',
        value: 'nemotron-nano-12b-v2-vl:free',
      },
      {
        label: 'InclusionAI: Ling 3.0 Tiny (free)',
        value: 'inclusionai/ling-3.0-tiny:free',
      },
      {
        label: 'Google: Gemma 4-31B-IT (free)',
        value: 'google/gemma-4-31b-it:free',
      },
      {
        label: 'NVIDIA: Nemotron 3.5 Content Safety (free)',
        value: 'nemotron-3.5-content-safety:free',
      },
    ],
  },

  {
    label: 'DeepSeek',
    value: 'deepseek',
    models: [
      {
        label: 'DeepSeek V4 Flash',
        value: 'deepseek-v4-flash',
      },
      {
        label: 'DeepSeek V4 Pro',
        value: 'deepseek-v4-pro',
      },
    ],
    lockedWhenNoAuth: true,
  },
];

export const DEFAULT_PROVIDER = 'openrouter';
