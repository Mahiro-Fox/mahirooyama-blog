import fs from 'fs/promises';
import { GUESTBOOK_FILE } from '@/constant/dir';
import { ensureFileInitialized, isFileNotFoundError } from '@/utils/file-utils';
import { createLogger } from '@/utils/logger';

const logger = createLogger('GuestbookLib');

export interface Guestbook {
  id: string;
  createdAt: string;
  nickname: string;
  bgColor: string;
  contact?: string;
  content: string;
  replyContent?: string;
  replyAt?: string;
  isApproved: boolean;
  isRepliedEmail?: boolean;
  isEmailNotificationEnabled?: boolean;
}

export async function getGuestbook(): Promise<Guestbook[]> {
  try {
    await ensureFileInitialized(GUESTBOOK_FILE);
    const content = await fs.readFile(GUESTBOOK_FILE, 'utf-8');
    const entries: Guestbook[] = JSON.parse(content);
    return entries;
  } catch (error) {
    // 文件确实缺失 → 视为空；其他错误（JSON 损坏等）上抛，避免静默丢数据
    if (isFileNotFoundError(error)) return [];
    logger.error('获取留言列表失败', error);
    throw error;
  }
}
