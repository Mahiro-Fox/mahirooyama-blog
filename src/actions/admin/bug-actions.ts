'use server';

import { headers } from 'next/headers';
import { BugReport, BugStatus, BugStore } from '@/store/bug-store';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { createLogger } from '@/utils/logger';

import { apiRateLimiter } from '@/lib/rate-limit';

const logger = createLogger('BugActions');

/**
 * 用户提交 BUG 报告（公开接口）
 */
export async function submitBugReport(input: {
  content: string;
  contact?: string;
  url?: string;
  userAgent?: string;
}): Promise<ActionResponse<void>> {
  try {
    // 获取用户 IP 用于限速
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || 'unknown';

    // 1. IP 限速
    const ipRateLimit = await apiRateLimiter.check(`bug-ip:${ip}`);

    // 2. 内容限速：防止重复提交相同内容
    const contentPrefix = input.content.trim().substring(0, 20);
    const contentRateLimit = await apiRateLimiter.check(
      `bug-content:${contentPrefix}`
    );

    if (!ipRateLimit.success || !contentRateLimit.success) {
      return {
        success: false,
        error: '提交过于频繁，请稍后再试',
        resetTime: Math.max(ipRateLimit.resetTime, contentRateLimit.resetTime),
      };
    }

    if (!input.content || input.content.trim().length < 5) {
      return { success: false, error: '内容太短，请详细描述 BUG' };
    }

    if (input.content.length > 1000) {
      return { success: false, error: '内容过长，请简明扼要' };
    }

    await BugStore.create({
      content: input.content.trim(),
      contact: input.contact?.trim(),
      url: input.url,
      userAgent: input.userAgent,
    });

    logger.info('收到新的 BUG 报告', { contact: input.contact });
    return { success: true, data: undefined };
  } catch (error) {
    logger.error('提交 BUG 报告失败', error);
    return { success: false, error: '提交失败，请稍后重试' };
  }
}

/**
 * 管理员获取所有 BUG 报告
 */
export async function adminGetBugReports(): Promise<
  ActionResponse<BugReport[]>
> {
  return withActionPermission('bugs:read', async () => {
    try {
      const bugs = await BugStore.getAll();
      // 按创建时间倒序
      bugs.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return { success: true, data: bugs };
    } catch (error) {
      logger.error('获取 BUG 列表失败', error);
      return { success: false, error: '获取失败' };
    }
  });
}

/**
 * 管理员更新 BUG 状态
 */
export async function adminUpdateBugStatus(
  id: string,
  status: BugStatus
): Promise<ActionResponse<void>> {
  return withActionPermission('bugs:update', async (user) => {
    try {
      const ok = await BugStore.updateStatus(id, status);
      if (!ok) return { success: false, error: '报告不存在' };

      logger.info('更新 BUG 状态成功', { id, status, adminId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('更新 BUG 状态失败', error, { id });
      return { success: false, error: '更新失败' };
    }
  });
}

/**
 * 管理员删除 BUG 报告
 */
export async function adminDeleteBugReport(
  id: string
): Promise<ActionResponse<void>> {
  return withActionPermission('bugs:delete', async (user) => {
    try {
      const ok = await BugStore.delete(id);
      if (!ok) return { success: false, error: '报告不存在' };

      logger.info('删除 BUG 报告成功', { id, adminId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('删除 BUG 报告失败', error, { id });
      return { success: false, error: '删除失败' };
    }
  });
}
