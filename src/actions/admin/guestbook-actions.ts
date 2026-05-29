'use server';

import fs from 'fs/promises';
import { GUESTBOOK_FILE } from '@/constant/dir';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { ensureFileInitialized } from '@/utils/file-utils';
import { createLogger } from '@/utils/logger';

import { serverActionRateLimiter } from '@/lib/rate-limit';

const logger = createLogger('GuestbookActions');

export interface GuestbookEntry {
  id: string;
  createdAt: string;
  nickname: string;
  bgColor: string;
  contact?: string;
  content: string;
  replyContent?: string;
  replyAt?: string;
  isApproved: boolean;
}

// GET - 获取所有留言（管理员视图）
export async function adminGetGuestbookEntries(): Promise<
  ActionResponse<GuestbookEntry[]>
> {
  return withActionPermission('guestbook:read', async () => {
    try {
      // 如果不存在文件，创建文件
      await ensureFileInitialized(GUESTBOOK_FILE);

      const content = await fs.readFile(GUESTBOOK_FILE, 'utf-8');
      const entries: GuestbookEntry[] = JSON.parse(content);

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

// POST - 创建留言（管理员创建）
export async function adminCreateGuestbookEntry(input: {
  nickname: string;
  bgColor: string;
  contact?: string;
  content: string;
}): Promise<ActionResponse<{ id: string }>> {
  return withActionPermission('guestbook:create', async (user) => {
    try {
      const { nickname, bgColor, contact, content } = input;

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
      const fileContent = await fs.readFile(GUESTBOOK_FILE, 'utf-8');
      const entries: GuestbookEntry[] = JSON.parse(fileContent);

      // 生成唯一ID（使用时间戳）
      const id = Date.now().toString();
      const createdAt = new Date().toISOString();

      const newEntry: GuestbookEntry = {
        id,
        createdAt,
        nickname: nickname.trim(),
        bgColor: bgColor.trim(),
        contact: contact?.trim() || undefined,
        content: content.trim(),
        isApproved: true, // 管理员创建的默认通过审核
      };

      entries.push(newEntry);

      // 写入文件
      await fs.writeFile(
        GUESTBOOK_FILE,
        JSON.stringify(entries, null, 2),
        'utf-8'
      );

      logger.info('管理员创建留言成功', { entryId: id, adminId: user.id });
      return { success: true, data: { id } };
    } catch (error) {
      logger.error('创建留言失败', error);
      return { success: false, error: '创建失败，请稍后重试' };
    }
  });
}

// POST - 访客提交留言（无需登录）
export async function submitGuestbookEntry(input: {
  nickname: string;
  bgColor: string;
  contact?: string;
  content: string;
}): Promise<ActionResponse<{ id: string }>> {
  try {
    const { nickname, bgColor, contact, content } = input;

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
    const fileContent = await fs.readFile(GUESTBOOK_FILE, 'utf-8');
    const entries: GuestbookEntry[] = JSON.parse(fileContent);

    // 生成唯一ID（使用时间戳）
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();

    const newEntry: GuestbookEntry = {
      id,
      createdAt,
      nickname: nickname.trim(),
      bgColor: bgColor.trim(),
      contact: contact?.trim() || undefined,
      content: content.trim(),
      isApproved: false, // 访客提交的需要审核
    };

    entries.push(newEntry);

    // 写入文件
    await fs.writeFile(
      GUESTBOOK_FILE,
      JSON.stringify(entries, null, 2),
      'utf-8'
    );

    logger.info('访客提交留言成功', { entryId: id, nickname: nickname.trim() });
    return { success: true, data: { id } };
  } catch (error) {
    logger.error('提交留言失败', error);
    return { success: false, error: '提交失败，请稍后重试' };
  }
}

// PUT - 更新留言
export async function adminUpdateGuestbookEntry(
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
      const fileContent = await fs.readFile(GUESTBOOK_FILE, 'utf-8');
      const entries: GuestbookEntry[] = JSON.parse(fileContent);

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
      await fs.writeFile(
        GUESTBOOK_FILE,
        JSON.stringify(entries, null, 2),
        'utf-8'
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
export async function adminReplyGuestbookEntry(
  id: string,
  replyContent: string
): Promise<ActionResponse<void>> {
  return withActionPermission('guestbook:update', async (user) => {
    try {
      if (!replyContent || replyContent.trim().length === 0) {
        return { success: false, error: '回复内容不能为空' };
      }

      // 读取现有数据
      const fileContent = await fs.readFile(GUESTBOOK_FILE, 'utf-8');
      const entries: GuestbookEntry[] = JSON.parse(fileContent);

      // 查找并更新
      const index = entries.findIndex((e) => e.id === id);
      if (index === -1) {
        return { success: false, error: '留言不存在' };
      }

      entries[index].replyContent = replyContent.trim();
      entries[index].replyAt = new Date().toISOString();

      // 写入文件
      await fs.writeFile(
        GUESTBOOK_FILE,
        JSON.stringify(entries, null, 2),
        'utf-8'
      );

      logger.info('管理员回复留言成功', { entryId: id, adminId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('回复留言失败', error, { entryId: id });
      return { success: false, error: '回复失败' };
    }
  });
}

// PUT - 审核留言
export async function adminApproveGuestbookEntry(
  id: string,
  isApproved: boolean
): Promise<ActionResponse<void>> {
  return withActionPermission('guestbook:approve', async (user) => {
    try {
      // 读取现有数据
      const fileContent = await fs.readFile(GUESTBOOK_FILE, 'utf-8');
      const entries: GuestbookEntry[] = JSON.parse(fileContent);

      // 查找并更新
      const index = entries.findIndex((e) => e.id === id);
      if (index === -1) {
        return { success: false, error: '留言不存在' };
      }

      entries[index].isApproved = isApproved;

      // 写入文件
      await fs.writeFile(
        GUESTBOOK_FILE,
        JSON.stringify(entries, null, 2),
        'utf-8'
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
export async function adminDeleteGuestbookEntry(
  id: string
): Promise<ActionResponse<void>> {
  return withActionPermission('guestbook:delete', async (user) => {
    try {
      // 读取现有数据
      const fileContent = await fs.readFile(GUESTBOOK_FILE, 'utf-8');
      const entries: GuestbookEntry[] = JSON.parse(fileContent);

      // 过滤掉要删除的项
      const filtered = entries.filter((e) => e.id !== id);

      if (filtered.length === entries.length) {
        return { success: false, error: '留言不存在' };
      }

      // 写入文件
      await fs.writeFile(
        GUESTBOOK_FILE,
        JSON.stringify(filtered, null, 2),
        'utf-8'
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
export async function getPublicGuestbookEntries(): Promise<
  ActionResponse<GuestbookEntry[]>
> {
  try {
    const content = await fs.readFile(GUESTBOOK_FILE, 'utf-8');
    const entries: GuestbookEntry[] = JSON.parse(content);

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
