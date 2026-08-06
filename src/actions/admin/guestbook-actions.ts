'use server';

import { siteConfig } from '@/config/common';
import { GUESTBOOK_FILE } from '@/constant/dir';
import { notifyReply } from '@/lib/email-send/notify-reply';
import { getGuestbook, Guestbook } from '@/lib/guestbook';
import { serverActionRateLimiter } from '@/lib/rate-limit';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { writeFileAtomic } from '@/utils/file-utils';
import { createLogger } from '@/utils/logger';

const logger = createLogger('GuestbookActions');

// GET - 获取所有留言（管理员视图）
export async function adminGetGuestbookEntries(): Promise<
  ActionResponse<Guestbook[]>
> {
  return withActionPermission('guestbook:read', async () => {
    try {
      const entries = await getGuestbook();

      // 按创建时间倒序排列
      entries.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return { success: true, data: entries };
    } catch (error) {
      logger.error('获取留言列表失败', error);
      return { success: false, error: '获取留言列表失败' };
    }
  });
}


// POST - 访客提交留言（无需登录）
export async function submitGuestbook(input: {
  nickname: string;
  bgColor: string;
  contact?: string;
  content: string;
  isEmailNotificationEnabled?: boolean;
}): Promise<ActionResponse<{ id: string }>> {
  try {
    const {
      nickname,
      bgColor,
      contact,
      content,
      // 是否开启邮箱通知, 默认关闭
      isEmailNotificationEnabled = false,
    } = input;

    // 速率限制检查（使用昵称作为标识符）
    const rateLimit = await serverActionRateLimiter.check(
      `guestbook:${nickname.trim()}`
    );
    if (!rateLimit.success) {
      return {
        success: false,
        error: '留言提交过于频繁，请稍后再试',
        resetTime: rateLimit.resetTime,
      };
    }

    if (!nickname || nickname.trim().length === 0) {
      return { success: false, error: '昵称不能为空' };
    }

    if (!bgColor || bgColor.trim().length === 0) {
      return { success: false, error: '背景颜色不能为空' };
    }

    if (!content || content.trim().length === 0) {
      return { success: false, error: '留言内容不能为空' };
    }

    if (content.length > 300) {
      return { success: false, error: '留言内容不能超过300字' };
    }

    // 读取现有数据
    const entries = await getGuestbook();

    // 生成唯一ID（使用时间戳）
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();

    const newEntry: Guestbook = {
      id,
      createdAt,
      nickname: nickname.trim(),
      bgColor: bgColor.trim(),
      contact: contact?.trim() || undefined,
      content: content.trim(),
      isEmailNotificationEnabled,
      isApproved: false, // 访客提交的需要审核
    };

    entries.push(newEntry);

    // 写入文件
    await writeFileAtomic(
      GUESTBOOK_FILE,
      JSON.stringify(entries, null, 2),
      { encoding: 'utf-8' }
    );

    logger.info('访客提交留言成功', { entryId: id, nickname: nickname.trim() });
    return { success: true, data: { id } };
  } catch (error) {
    logger.error('提交留言失败', error);
    return { success: false, error: '提交失败，请稍后重试' };
  }
}

// PUT - 更新留言
export async function adminUpdateGuestbook(
  id: string,
  input: {
    nickname?: string;
    bgColor?: string;
    contact?: string;
    content?: string;
  }
): Promise<ActionResponse<void>> {
  return withActionPermission('guestbook:update', async (user) => {
    try {
      const { nickname, bgColor, contact, content } = input;

      // 读取现有数据
      const entries = await getGuestbook();

      // 查找并更新
      const index = entries.findIndex((e) => e.id === id);
      if (index === -1) {
        return { success: false, error: '留言不存在' };
      }

      if (nickname !== undefined) {
        if (nickname.trim().length === 0) {
          return { success: false, error: '昵称不能为空' };
        }
        entries[index].nickname = nickname.trim();
      }

      if (bgColor !== undefined) {
        if (bgColor.trim().length === 0) {
          return { success: false, error: '背景颜色不能为空' };
        }
        entries[index].bgColor = bgColor.trim();
      }

      entries[index].contact = contact?.trim() || undefined;

      if (content !== undefined) {
        if (content.trim().length === 0) {
          return { success: false, error: '留言内容不能为空' };
        }
        if (content.length > 300) {
          return { success: false, error: '留言内容不能超过300字' };
        }
        entries[index].content = content.trim();
      }

      // 写入文件
      await writeFileAtomic(
        GUESTBOOK_FILE,
        JSON.stringify(entries, null, 2),
        { encoding: 'utf-8' }
      );

      logger.info('管理员更新留言成功', { entryId: id, adminId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('更新留言失败', error, { entryId: id });
      return { success: false, error: '更新失败' };
    }
  });
}

// PUT - 回复留言
export async function adminReplyGuestbook(
  id: string,
  replyContent: string
): Promise<ActionResponse<void>> {
  return withActionPermission('guestbook:update', async (user) => {
    try {
      if (!replyContent || replyContent.trim().length === 0) {
        return { success: false, error: '回复内容不能为空' };
      }

      // 读取现有数据
      const entries = await getGuestbook();

      // 查找并更新
      const index = entries.findIndex((e) => e.id === id);
      if (index === -1) {
        return { success: false, error: '留言不存在' };
      }

      entries[index].replyContent = replyContent.trim();
      entries[index].replyAt = new Date().toISOString();

      // 写入文件
      await writeFileAtomic(
        GUESTBOOK_FILE,
        JSON.stringify(entries, null, 2),
        { encoding: 'utf-8' }
      );

      logger.info('管理员回复留言成功', { entryId: id, adminId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('回复留言失败', error, { entryId: id });
      return { success: false, error: '回复失败' };
    }
  });
}

// POST - 发送回复通知邮件
export async function adminSendReplyNotification(
  input: { id: string; replyContent: string },
  comment: { email: string; content: string }
): Promise<ActionResponse<void>> {
  return withActionPermission('guestbook:update', async (user) => {
    const { id, replyContent } = input;

    if (!id || !replyContent) {
      return { success: false, error: '参数缺失' };
    }

    if (!comment.email) {
      return { success: true, data: undefined };
    }

    const result = await notifyReply({
      toEmail: comment.email,
      originalMessage: comment.content,
      replyContent,
      messageUrl: `${siteConfig.url}guestbook#${id}`,
    });

    if (!result.success) {
      logger.error('回复通知邮件发送失败', {
        id,
        email: comment.email,
        error: result.error,
        adminId: user.id,
      });
    } else {
      // 回复成功后更新isRepliedEmail字段
      const entries = await getGuestbook();

      const index = entries.findIndex((e) => e.id === id);
      if (index === -1) {
        return { success: false, error: '留言不存在' };
      }
      entries[index].isRepliedEmail = true;
      await writeFileAtomic(
        GUESTBOOK_FILE,
        JSON.stringify(entries, null, 2),
        { encoding: 'utf-8' }
      );

      logger.info('回复通知邮件发送成功', {
        id,
        email: comment.email,
        adminId: user.id,
      });
    }

    return { success: true, data: undefined };
  });
}

// PUT - 审核留言
export async function adminApproveGuestbook(
  id: string,
  isApproved: boolean
): Promise<ActionResponse<void>> {
  return withActionPermission('guestbook:approve', async (user) => {
    try {
      // 读取现有数据
      const entries = await getGuestbook();

      // 查找并更新
      const index = entries.findIndex((e) => e.id === id);
      if (index === -1) {
        return { success: false, error: '留言不存在' };
      }

      entries[index].isApproved = isApproved;

      // 写入文件
      await writeFileAtomic(
        GUESTBOOK_FILE,
        JSON.stringify(entries, null, 2),
        { encoding: 'utf-8' }
      );

      logger.info('管理员审核留言成功', {
        entryId: id,
        isApproved,
        adminId: user.id,
      });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('审核留言失败', error, { entryId: id });
      return { success: false, error: '审核失败' };
    }
  });
}

// DELETE - 删除留言
export async function adminDeleteGuestbook(
  id: string
): Promise<ActionResponse<void>> {
  return withActionPermission('guestbook:delete', async (user) => {
    try {
      // 读取现有数据
      const entries = await getGuestbook();

      // 过滤掉要删除的项
      const filtered = entries.filter((e) => e.id !== id);

      if (filtered.length === entries.length) {
        return { success: false, error: '留言不存在' };
      }

      // 写入文件
      await writeFileAtomic(
        GUESTBOOK_FILE,
        JSON.stringify(filtered, null, 2),
        { encoding: 'utf-8' }
      );

      logger.info('管理员删除留言成功', { entryId: id, adminId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('删除留言失败', error, { entryId: id });
      return { success: false, error: '删除失败' };
    }
  });
}

// GET - 获取公开的留言列表（用于前端展示，只显示已审核的）
export async function getPublicGuestbook(): Promise<
  ActionResponse<Guestbook[]>
> {
  try {
    const entries = await getGuestbook();

    // 只显示已审核的留言
    const approvedEntries = entries.filter((e) => e.isApproved);

    // 按创建时间倒序排列
    approvedEntries.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return { success: true, data: approvedEntries };
  } catch (error) {
    logger.error('获取公开留言列表失败', error);
    return { success: false, error: '获取留言列表失败' };
  }
}
