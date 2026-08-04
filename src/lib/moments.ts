import fs from 'fs/promises';
import { MOMENTS_FILE } from '@/constant/dir';
import { ensureFileInitialized, isFileNotFoundError } from '@/utils/file-utils';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MomentsLib');

export interface MomentImage {
  url: string;
  width: number;
  height: number;
  ratio: number;
}

export interface Moment {
  id: string;
  createdAt: string;
  content: string;
  image?: MomentImage;
  moodEmoji?: string;
  location?: string;
}

export async function getMoments(): Promise<Moment[]> {
  try {
    await ensureFileInitialized(MOMENTS_FILE);
    const content = await fs.readFile(MOMENTS_FILE, 'utf-8');
    const moments: Moment[] = JSON.parse(content);
    return moments;
  } catch (error) {
    // 文件确实缺失 → 视为空；其他错误（JSON 损坏等）上抛，避免静默丢数据
    if (isFileNotFoundError(error)) return [];
    logger.error('获取碎碎念列表失败', error);
    throw error;
  }
}
