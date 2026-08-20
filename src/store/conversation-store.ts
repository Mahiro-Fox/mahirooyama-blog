import crypto from 'crypto';
import type { UIMessage } from 'ai';
import { goFetch } from '@/lib/server/api-client';

/**
 * 对话存储（Go/PostgreSQL 版）
 *
 * 存储只负责落盘与读取：每一次读写都通过 goFetch 转发到 Go 后端的
 * /api/conversations 端点（Infostore conversations 表，messages 为 jsonb）。
 * AI 对话逻辑（生成、标题推导等）仍在前端。
 *
 * 注意：本模块仅用于 Server 端（API route / Server Action）。
 */

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: UIMessage[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_V4_REGEX.test(value);
}

function validateIds(userId: string, conversationId?: string): void {
  if (!isValidUUID(userId)) {
    throw new Error('Invalid userId format');
  }
  if (conversationId && !isValidUUID(conversationId)) {
    throw new Error('Invalid conversationId format');
  }
}

function deriveTitle(messages: UIMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (!firstUserMessage?.parts) return '新对话';

  for (const part of firstUserMessage.parts) {
    if (part.type === 'text' && part.text) {
      const trimmed = part.text.trim();
      return trimmed.length > 30 ? trimmed.slice(0, 30) + '...' : trimmed;
    }
  }

  return '新对话';
}

function isNotFound(e: unknown): boolean {
  return e instanceof Error && / 404/.test(e.message);
}

export const conversationStore = {
  async create(userId: string): Promise<Conversation> {
    validateIds(userId);

    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      userId,
      title: '新对话',
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    await goFetch<void>(`/api/conversations/${conversation.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        userId,
        title: conversation.title,
        messages: [],
      }),
    });

    return conversation;
  },

  async get(
    userId: string,
    conversationId: string
  ): Promise<Conversation | null> {
    validateIds(userId, conversationId);

    try {
      return await goFetch<Conversation>(
        `/api/conversations/${conversationId}?userId=${userId}`
      );
    } catch (e) {
      if (isNotFound(e)) return null;
      throw e;
    }
  },

  async listByUser(userId: string): Promise<ConversationSummary[]> {
    validateIds(userId);
    return goFetch<ConversationSummary[]>(
      `/api/conversations?userId=${userId}`
    );
  },

  async saveMessages(
    userId: string,
    conversationId: string,
    messages: UIMessage[]
  ): Promise<void> {
    validateIds(userId, conversationId);

    // 标题推导仍在前端：仅在尚无自定义标题时，才用首个用户消息生成
    let title = deriveTitle(messages);
    const existing = await this.get(userId, conversationId);
    if (existing && existing.title !== '新对话') {
      title = existing.title;
    }

    await goFetch<void>(`/api/conversations/${conversationId}`, {
      method: 'PUT',
      body: JSON.stringify({ userId, title, messages }),
    });
  },

  async delete(userId: string, conversationId: string): Promise<void> {
    validateIds(userId, conversationId);

    try {
      await goFetch<void>(
        `/api/conversations/${conversationId}?userId=${userId}`,
        { method: 'DELETE', parseJson: false }
      );
    } catch (e) {
      // 会话不存在也算删除成功
      if (!isNotFound(e)) throw e;
    }
  },

  async updateTitle(
    userId: string,
    conversationId: string,
    title: string
  ): Promise<void> {
    validateIds(userId, conversationId);

    await goFetch<void>(`/api/conversations/${conversationId}`, {
      method: 'PATCH',
      parseJson: false,
      body: JSON.stringify({ userId, title }),
    });
  },
};