import crypto from 'crypto';
import { conversationStore } from '@/store/conversation-store';
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
import { estimateTokens, MAX_CONTEXT_TOKENS } from '@/lib/tokens';
import { verifyUserAuth } from '@/lib/user-auth';

export const runtime = 'nodejs';

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
  const body = (await req.json()) as {
    messages: UIMessage[];
    provider?: string;
    conversationId?: string;
  };
  const { messages, conversationId } = body;

  const selectedProvider: Provider = ALLOWED_PROVIDERS.includes(
    body.provider as Provider
  )
    ? (body.provider as Provider)
    : 'openrouter';

  // === Token 校验（后端兜底） ===
  const estimatedTokens = estimateTokens(messages);
  if (estimatedTokens > MAX_CONTEXT_TOKENS) {
    return Response.json(
      {
        error: 'Context limit exceeded',
        estimatedTokens,
        limit: MAX_CONTEXT_TOKENS,
      },
      { status: 413 }
    );
  }

  // === 鉴权 ===
  let userId: string | null = null;

  if (selectedProvider === 'deepseek') {
    const auth = await verifyUserAuth();
    if (!auth.success) {
      return Response.json(
        { error: 'Authentication required to use DeepSeek' },
        { status: 401 }
      );
    }
    userId = auth.userId as string;
  } else {
    const auth = await verifyUserAuth();
    if (auth.success) {
      userId = auth.userId as string;
    }
  }

  // === 对话创建/加载 ===
  let activeConversationId: string;

  if (userId) {
    if (conversationId) {
      const existing = await conversationStore.get(userId, conversationId);
      if (existing) {
        activeConversationId = existing.id;
      } else {
        const conv = await conversationStore.create(userId);
        activeConversationId = conv.id;
      }
    } else {
      const conv = await conversationStore.create(userId);
      activeConversationId = conv.id;
    }
  } else {
    activeConversationId = conversationId || crypto.randomUUID();
  }

  // === 调用模型 ===
  const result = streamText({
    model: getModel(body.provider),
    messages: await convertToModelMessages(messages),
  });

  // === 包装流，注入 conversationId metadata + 持久化 ===
  const stream = toUIMessageStream({
    stream: result.stream,
    messageMetadata: () => ({
      conversationId: activeConversationId,
    }),
    onEnd: async ({ messages: finalMessages, isAborted }) => {
      if (isAborted) return;

      if (userId) {
        try {
          await conversationStore.saveMessages(
            userId!,
            activeConversationId,
            finalMessages
          );
        } catch {
          // 持久化失败不影响响应
        }
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
