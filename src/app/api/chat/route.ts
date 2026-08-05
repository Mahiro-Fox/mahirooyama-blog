import { deepseek } from '@ai-sdk/deepseek';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  LanguageModel,
  streamText,
  toUIMessageStream,
  UIMessage,
} from 'ai';
import { verifyUserAuth } from '@/lib/user-auth';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const ALLOWED_PROVIDERS = ['deepseek', 'openrouter'] as const;
type Provider = (typeof ALLOWED_PROVIDERS)[number];

function getModel(provider?: string): LanguageModel {
  // 白名单校验，防止乱传字符串导致运行时报错，也避免以后被恶意 body 打穿
  const selected: Provider = ALLOWED_PROVIDERS.includes(provider as Provider)
    ? (provider as Provider)
    : 'openrouter';

  switch (selected) {
    case 'openrouter':
      if (!process.env.OPENROUTER_MODEL) {
        throw new Error('OPENROUTER_MODEL is not set');
      }
      return openrouter(process.env.OPENROUTER_MODEL);
    case 'deepseek':
      return deepseek('deepseek-v4-flash');
  }
}

export async function POST(req: Request) {
  const { messages, provider }: { messages: UIMessage[]; provider?: string } =
    await req.json();

  const selectedProvider: Provider = ALLOWED_PROVIDERS.includes(
    provider as Provider
  )
    ? (provider as Provider)
    : 'openrouter';

  if (selectedProvider === 'deepseek') {
    const auth = await verifyUserAuth();
    if (!auth.success) {
      return Response.json(
        { error: 'Authentication required to use DeepSeek' },
        { status: 401 }
      );
    }
  }

  const result = streamText({
    model: getModel(provider),
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
