'use server';

import crypto from 'crypto';
import { mastra } from '@/mastra';
import { conversationStore } from '@/store/conversation-store';
import type { UIMessage } from 'ai';
import { verifyUserAuth } from '@/lib/user-auth';

/**
 * 通过 Mastra Agent 生成回复（非流式）。
 * - threadId：Mastra 记忆线程 id；传历史上一次返回的 threadId 可续聊记忆。
 * - 已登录时复用 conversationStore 把对话持久化到 Go 后端。
 */
export async function runMastraAgent(input: string, prevThreadId?: string) {
  const auth = await verifyUserAuth();
  const userId = auth.success ? (auth.userId as string) : null;
  const resource = userId ? `user:${userId}` : 'mastra-anon';

  let threadId = prevThreadId;
  if (userId && !threadId) {
    // 首次：用 Go conversation 的 id 作为记忆线程，兼顾前端会话列表
    try {
      const conv = await conversationStore.create(userId);
      threadId = conv.id;
    } catch (error) {
      console.error('Mastra: 创建会话失败，退回内存线程:', error);
    }
  }
  threadId = threadId ?? crypto.randomUUID();

  const agent = mastra.getAgent('assistant');
  const result = await agent.generate(input, {
    memory: { resource, thread: threadId },
  });

  // 持久化到 Go 后端（失败不影响响应）
  if (userId && threadId) {
    try {
      const messages: UIMessage[] = [
        {
          role: 'user',
          id: crypto.randomUUID(),
          parts: [{ type: 'text', text: input }],
        },
        {
          role: 'assistant',
          id: crypto.randomUUID(),
          parts: [{ type: 'text', text: result.text }],
        },
      ];
      await conversationStore.saveMessages(userId, threadId, messages);
    } catch (error) {
      console.error('Mastra: 持久化对话失败:', error);
    }
  }

  return { text: result.text, threadId };
}
