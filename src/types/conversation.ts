import type { UIMessage } from 'ai';

/**
 * AI 对话类型
 *
 * 数据落盘在 Go 后端 /api/conversations，取数逻辑见 src/store/conversation-store.ts。
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