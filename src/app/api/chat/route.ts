import crypto from 'crypto';
import { execFileSync } from 'child_process';
import path from 'path';
import { z } from 'zod';
import { conversationStore } from '@/store/conversation-store';
import { deepseek } from '@ai-sdk/deepseek';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateText,
  LanguageModel,
  toUIMessageStream,
  ToolLoopAgent,
  ToolSet,
  UIMessage,
} from 'ai';
import { DEFAULT_PROVIDER, PROVIDERS, ProviderValue } from '@/config/providers';
import { estimateTokens, MAX_CONTEXT_TOKENS } from '@/lib/tokens';
import { verifyUserAuth } from '@/lib/user-auth';

export const runtime = 'nodejs';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

function getModel(provider: ProviderValue, model: string): LanguageModel {
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

// === Python 工具执行器 ===
// LLM 推理由本路由负责；工具计算交给 ai-tools/tools_runner.py 这个纯执行后端。
const AGENT_PYTHON = process.env.AGENT_PYTHON ?? 'python';
const TOOLS_RUNNER = path.join(process.cwd(), 'ai-tools', 'tools_runner.py');

function runTool(name: string, args: Record<string, unknown>): unknown {
  try {
    const out = execFileSync(
      AGENT_PYTHON,
      [TOOLS_RUNNER, '--exec', name, JSON.stringify(args)],
      { encoding: 'utf-8', timeout: 15000 }
    );
    const parsed = JSON.parse(out.trim());
    if (!parsed.ok) throw new Error(parsed.error ?? `tool ${name} failed`);
    return parsed.result;
  } catch (error) {
    throw new Error(`tool ${name} failed: ${(error as Error).message}`);
  }
}

// 工具注册表：与 Python 端 TOOLS 保持同名/同参数。
// 直接构造普通对象并断言成 streamText 接受的 tools 类型，避免 tool() 帮助函数的重载推断歧义。
const agentTools = {
  calculator: {
    description: '计算数学表达式，支持 + - * / // % ** 和括号',
    parameters: z.object({
      expression: z.string().describe('要计算的数学表达式，例如 23*17'),
    }),
    execute: async ({ expression }: { expression: string }) =>
      runTool('calculator', { expression }),
  },
  get_current_time: {
    description: '返回当前时间',
    parameters: z.object({}),
    execute: async () => runTool('get_current_time', {}),
  },
} as unknown as ToolSet;

export async function generateTitle(
  firstUserMessage: string,
  provider: ProviderValue,
  model: string
): Promise<string> {
  try {
    const { text } = await generateText({
      model: getModel(provider, model),
      prompt: `Based on the following user message, generate a concise title (max 15 words, in the same language as the user's message) for a conversation. Only output the title, nothing else — no quotes, no prefixes, no line breaks.

User message: "${firstUserMessage.slice(0, 300)}"

Title:`,
      temperature: 0.5,
    });
    const cleaned = text
      .trim()
      .replace(/^["'「『]|["'」』]$/g, '')
      .trim();
    return cleaned.length > 50
      ? cleaned.slice(0, 50) + '...'
      : cleaned || firstUserMessage.slice(0, 30) + '...';
  } catch (error) {
    console.error('Error generating title:', error);
    // 生成失败时退回到截取原文
    return firstUserMessage.slice(0, 30) + '...';
  }
}

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

          // 新建对话且首次 AI 回复后，用 AI 自动生成标题
          const conv = await conversationStore.get(
            userId,
            activeConversationId
          );
          // 新建对话且首次 AI 回复后，用 AI 自动生成标题
          if (conv && conv.messages.length === 2) {
            const firstUserMsg = messages.find((m) => m.role === 'user');
            const firstUserText =
              firstUserMsg?.parts?.find((p) => p.type === 'text')?.text ?? '';

            // 仅当用户输入非空时才生成标题
            if (firstUserText) {
              // 不 await，后台异步生成标题，不阻塞响应
              generateTitle(firstUserText, body.provider, body.model)
                .then((title) => {
                  conversationStore.updateTitle(
                    userId,
                    activeConversationId,
                    title
                  );
                })
                .catch((error) => {
                  console.error('Error updating title:', error);
                });
            }
          }
        } catch (error) {
          // 持久化失败不影响响应
          console.error('Error saving messages:', error);
        }
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
