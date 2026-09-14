import crypto from 'crypto';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from 'ai';
import { generateTitle } from '@/app/api/chat/route';
import { getMastra } from '@/mastra';
import { conversationStore } from '@/store/conversation-store';
import { estimateTokens, MAX_CONTEXT_TOKENS } from '@/lib/tokens';
import { verifyUserAuth } from '@/lib/user-auth';

export const runtime = 'nodejs';

const MASTRA_MODEL = 'deepseek-chat';

/**
 * Mastra Agent 流式聊天端点（"Agent 模式"）。
 * 与 /api/chat 输出同一套 ai@7 UIMessage 流协议，前端 useChat 可无差别消费。
 * 走 Mastra agent（calculator/web_fetch 工具 + Memory），记忆按 resource(用户)+thread(会话) 隔离。
 */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages: UIMessage[];
    conversationId?: string;
  };
  const { messages, conversationId } = body;

  // === Token 校验（与 /api/chat 一致） ===
  if (estimateTokens(messages) > MAX_CONTEXT_TOKENS) {
    return Response.json(
      {
        error: 'Context limit exceeded',
        estimatedTokens: estimateTokens(messages),
        limit: MAX_CONTEXT_TOKENS,
      },
      { status: 413 }
    );
  }

  // === 鉴权（Agent 走 DeepSeek，需登录，对齐 /api/chat 对 deepseek 的强制要求） ===
  const auth = await verifyUserAuth();
  if (!auth.success) {
    return Response.json(
      { error: 'Authentication required to use Agent mode' },
      { status: 401 }
    );
  }
  const userId = auth.userId as string;

  // === 会话线程：登录态用 conversationId（Mastra Memory 的 thread），新开会话则新建 ===
  let threadId = conversationId;
  if (conversationId) {
    const existing = await conversationStore.get(userId, conversationId);
    if (existing) {
      threadId = existing.id;
    } else {
      const conv = await conversationStore.create(userId);
      threadId = conv.id;
    }
  } else {
    const conv = await conversationStore.create(userId);
    threadId = conv.id;
  }
  const activeConversationId = threadId as string;
  const resource = `user:${userId}`;

  // === 调用 Mastra Agent（历史消息为 ai@7 UIMessage，Mastra 直接支持） ===
  const agent = getMastra().getAgent('assistant');
  const result = await agent.stream(messages as never, {
    memory: { resource, thread: activeConversationId },
  });

  // === 桥接 Mastra 文本流为 UIMessage stream（text-start → text-delta），
  //     finish / onEnd 由 createUIMessageStream 负责 ===
  const partId = crypto.randomUUID();
  const stream = createUIMessageStream({
    generateId: () => crypto.randomUUID(),
    execute: async ({ writer }) => {
      // start 携带 conversationId，供前端 onFinish 读取 metadata.conversationId 做路由/列表刷新
      writer.write({
        type: 'start',
        messageMetadata: { conversationId: activeConversationId },
      });
      writer.write({ type: 'text-start', id: partId });
      const reader = result.textStream.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        writer.write({ type: 'text-delta', id: partId, delta: value });
      }
      writer.write({ type: 'text-end', id: partId });
    },
    onEnd: async ({ messages: responseMessages, isAborted }) => {
      if (isAborted) return;

      try {
        const allMessages: UIMessage[] = [...messages, ...responseMessages];
        await conversationStore.saveMessages(
          userId,
          activeConversationId,
          allMessages
        );

        const conv = await conversationStore.get(userId, activeConversationId);
        if (conv && conv.messages.length === 2) {
          const firstUserMsg = messages.find((m) => m.role === 'user');
          const firstUserText =
            firstUserMsg?.parts?.find((p) => p.type === 'text')?.text ?? '';
          if (firstUserText) {
            generateTitle(firstUserText, 'deepseek', MASTRA_MODEL)
              .then((title) =>
                conversationStore.updateTitle(userId, activeConversationId, title)
              )
              .catch((error) => {
                console.error('Mastra: 更新标题失败:', error);
              });
          }
        }
      } catch (error) {
        console.error('Mastra: 持久化对话失败:', error);
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}