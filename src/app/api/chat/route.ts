import crypto from 'crypto';
import { conversationStore } from '@/store/conversation-store';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  tool,
  ToolLoopAgent,
  toUIMessageStream,
  UIMessage,
} from 'ai';
import { z } from 'zod';
import { DEFAULT_PROVIDER, PROVIDERS, ProviderValue } from '@/config/providers';
import { getModel } from '@/lib/ai-chat/model';
import { runPythonTool } from '@/lib/ai-chat/python-tool';
import { estimateTokens, MAX_CONTEXT_TOKENS } from '@/lib/tokens';
import { verifyUserAuth } from '@/lib/user-auth';

export const runtime = 'nodejs';

// 工具注册表：与 Python 端 TOOLS 保持同名/同参数。
const agentTools = {
  web_fetch: tool({
    description:
      '抓取指定网页并提取可读纯文本（含 JSON API），用于查询游戏攻略 Wiki、百科、VRChat 世界等任意外部网页，返回前 4000 字符',
    inputSchema: z.object({
      url: z.string().url().describe('要抓取的 http/https 网页地址'),
    }),
    execute: async ({ url }) => runPythonTool('web_fetch', { url }),
  }),
};

export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages: UIMessage[];
    provider: ProviderValue;
    model: string;
    conversationId?: string;
    thinking?: boolean;
  };
  const { messages, conversationId, thinking } = body;

  const selectedProvider = PROVIDERS.find((p) => p.value === body.provider)
    ? body.provider
    : DEFAULT_PROVIDER;

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

  // === 定义 Agent：多步工具循环 ===
  // ai@7 的 streamText 是单步的（工具调用后不再生成文本），多步自动循环需用
  // ToolLoopAgent：它自动执行“模型→工具→模型...”直到模型不再请求工具。
  const agent = new ToolLoopAgent({
    model: getModel(body.provider, body.model),
    ...(selectedProvider === 'deepseek' ? { tools: agentTools } : {}),
  });

  const result = await agent.stream({
    messages: await convertToModelMessages(messages),
    // 思考模式仅对 DeepSeek 生效，经 providerOptions.deepseek 透传
    ...(selectedProvider === 'deepseek'
      ? {
          providerOptions: {
            deepseek: {
              thinking: {
                type: thinking === false ? 'disabled' : 'enabled',
              },
            },
          },
        }
      : {}),
  });

  // === 包装流，注入 conversationId metadata + 持久化 ===
  const stream = toUIMessageStream({
    stream: result.stream,
    // 默认不传时生成的 assistant 消息 id 为空字符串，会导致前端去重/刷新后丢失
    generateMessageId: () => crypto.randomUUID(),
    messageMetadata: () => ({
      conversationId: activeConversationId,
    }),
    onEnd: async ({ messages: finalMessages, isAborted }) => {
      if (isAborted) return;

      if (userId) {
        try {
          // messages 是请求传入的完整历史（含 user/assistant 的历史消息及当次 user 输入）
          // finalMessages 是本次 streamText 生成的新 assistant 消息（通常是 1 条）
          // 两者合并后才是完整的对话消息列表
          const allMessages: UIMessage[] = [...messages, ...finalMessages];
          await conversationStore.saveMessages(
            userId,
            activeConversationId,
            allMessages
          );
        } catch (error) {
          // 持久化失败不影响响应
          console.error('Error saving messages:', error);
        }
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
