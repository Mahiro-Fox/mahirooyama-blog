'use server';

import {
  conversationStore,
  type Conversation,
  type ConversationSummary,
} from '@/store/conversation-store';
import { createLogger } from '@/utils/logger';
import { verifyUserAuth } from '@/lib/user-auth';

const logger = createLogger('ConversationActions');

/*
 * 前台聊天历史读写操作（登录用户）。
 *
 * AI 对话逻辑仍在前端，这里的 action 只做两件事：
 *   1. 通过 verifyUserAuth 解析当前登录用户的 userId；
 *   2. 调用 conversationStore 把数据转发到 Go 后端落盘 / 读取 / 删除 / 改标题。
 *
 * 注意：admin/ 目录只是复用既有 actions 目录结构；本文件是前台（chat 页）用户级操作，
 * 不走 withActionPermission 的后台权限体系，而是校验前台 user-session。
 */

export interface ConversationActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 拉取当前用户的对话摘要列表
 */
export async function getMyConversations(): Promise<
  ConversationActionResult<ConversationSummary[]>
> {
  try {
    const auth = await verifyUserAuth();
    if (!auth.success) return { success: false, error: '未登录' };

    const data = await conversationStore.listByUser(auth.userId as string);
    return { success: true, data };
  } catch (error) {
    logger.error('获取对话列表失败', error);
    return { success: false, error: '获取对话列表失败' };
  }
}

/**
 * 读取某条对话（含消息）
 */
export async function getConversation(
  conversationId: string
): Promise<ConversationActionResult<Conversation>> {
  try {
    const auth = await verifyUserAuth();
    if (!auth.success) return { success: false, error: '未登录' };

    const data = await conversationStore.get(
      auth.userId as string,
      conversationId
    );
    if (!data) return { success: false, error: '对话不存在' };

    return { success: true, data };
  } catch (error) {
    logger.error('读取对话失败', error, { conversationId });
    return { success: false, error: '读取对话失败' };
  }
}

/**
 * 重命名对话标题
 */
export async function renameConversation(
  conversationId: string,
  title: string
): Promise<ConversationActionResult<string>> {
  try {
    const auth = await verifyUserAuth();
    if (!auth.success) return { success: false, error: '未登录' };

    const trimmed = title.trim();
    if (!trimmed || trimmed.length > 100) {
      return { success: false, error: '标题长度需为 1-100 字符' };
    }

    await conversationStore.updateTitle(
      auth.userId as string,
      conversationId,
      trimmed
    );
    return { success: true, data: trimmed };
  } catch (error) {
    logger.error('重命名对话失败', error, { conversationId });
    return { success: false, error: '重命名失败' };
  }
}

/**
 * 删除对话
 */
export async function deleteConversation(
  conversationId: string
): Promise<ConversationActionResult> {
  try {
    const auth = await verifyUserAuth();
    if (!auth.success) return { success: false, error: '未登录' };

    await conversationStore.delete(auth.userId as string, conversationId);
    return { success: true };
  } catch (error) {
    logger.error('删除对话失败', error, { conversationId });
    return { success: false, error: '删除失败' };
  }
}