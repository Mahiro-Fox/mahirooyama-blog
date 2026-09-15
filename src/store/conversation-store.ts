import crypto from 'crypto';
import type { UIMessage } from 'ai';
import { goFetch } from '@/lib/server/api-client';

/**
 * 对话存储（Go/PostgreSQL 版）
 *
 * 存储只负责落盘与读取：每一次读写都通过 goFetch 转发到 Go 后端的
 * /api/conversations 端点（Infostore conversations 表，messages 为 jsonb）。
 * 会话标题由统一标题 server action（src/actions/app/generate-title.ts）在创建时生成，
 * 本模块不再自行推导（删除了原来的 deriveTitle 首句逻辑）。
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

function isNotFound(e: unknown): boolean {
  return e instanceof Error && / 404/.test(e.message);
}

export const conversationStore = {
  async create(userId: string, title = '新对话'): Promise<Conversation> {
    validateIds(userId);

    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      userId,
      title,
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

    // 标题不再在此派生（原 deriveTitle 首句逻辑已删）：保留已有 AI/自定义标题，
    // 未写入标题的会话维持"新对话"，等统一标题 server action 生成后 updateTitle。
    const existing = await this.get(userId, conversationId);
    const title =
      existing && existing.title !== '新对话' ? existing.title : '新对话';

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
