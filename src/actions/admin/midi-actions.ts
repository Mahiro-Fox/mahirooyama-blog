'use server';

import fs from 'fs/promises';
import path from 'path';
import { MIDI_DIR } from '@/constant/dir';
import {
  getMidis,
  MidiAdminFile,
  MidiFile,
  readMidiFile,
} from '@/lib/midi-files';
import { serverActionRateLimiter } from '@/lib/rate-limit';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { checkFileConflict, ensureDirectory } from '@/utils/file-utils';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MidiActions');

// GET - 获取 MIDI 文件列表
export async function adminGetMidiFiles(): Promise<
  ActionResponse<MidiAdminFile[]>
> {
  return withActionPermission('midi:read', async (user) => {
    // 速率限制检查
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(`midi:${user.id}`);
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
    }
    try {
      const midiFiles = await getMidis();

      const filesWithStats = await Promise.all(
        midiFiles.map(async (file) => {
          const filePath = path.join(MIDI_DIR, file);
          const stats = await fs.stat(filePath);

          return {
            slug: path.basename(file, '.mid'),
            fileName: file,
            name: path.basename(file, '.mid'),
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
          };
        })
      );

      // 按修改时间排序
      filesWithStats.sort(
        (a, b) =>
          new Date(b.lastModified).getTime() -
          new Date(a.lastModified).getTime()
      );

      return { success: true, data: filesWithStats };
    } catch (error) {
      logger.error('获取 MIDI 文件列表失败', error);
      return { success: false, error: '获取文件列表失败' };
    }
  });
}

// POST - 上传 MIDI 文件
export async function adminUploadMidiFile(
  formData: FormData
): Promise<ActionResponse<void>> {
  return withActionPermission('midi:create', async (user) => {
    // 速率限制检查
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(`midi:${user.id}`);
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
    }

    try {
      const file = formData.get('file') as File;
      if (!file) {
        return { success: false, error: '没有提供文件' };
      }

      // 验证文件类型
      if (!file.name.toLowerCase().endsWith('.mid')) {
        return { success: false, error: '只支持 .mid 文件' };
      }

      // 获取文件名（不含扩展名）
      const baseName = path.basename(file.name, '.mid');

      const fileName = `${baseName}.mid`;
      const filePath = path.join(MIDI_DIR, fileName);

      // 检查文件是否已存在
      const conflict = await checkFileConflict(filePath);
      if (conflict) {
        return { success: false, error: conflict.error };
      }

      // 确保目录存在
      await ensureDirectory(MIDI_DIR);

      console.log(123);
      // 写入文件
      const bytes = await file.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(bytes));

      logger.info('上传 MIDI 文件成功', { fileName, userId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('上传 MIDI 文件失败', error);
      return { success: false, error: '上传文件失败' };
    }
  });
}

// DELETE - 删除 MIDI 文件
export async function adminDeleteMidiFile(
  slug: string
): Promise<ActionResponse<void>> {
  return withActionPermission('midi:delete', async (user) => {
    // 速率限制检查
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(`midi:${user.id}`);
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
    }

    try {
      const fileName = `${slug}.mid`;
      const filePath = path.join(MIDI_DIR, fileName);

      // 安全检查
      if (!filePath.startsWith(MIDI_DIR)) {
        return { success: false, error: '非法路径' };
      }

      await fs.unlink(filePath);
      logger.info('删除 MIDI 文件成功', { slug, userId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('删除 MIDI 文件失败', error, { slug });
      return { success: false, error: '删除文件失败' };
    }
  });
}

// POST - 重命名 MIDI 文件
export async function adminRenameMidiFile(
  oldSlug: string,
  newName: string
): Promise<ActionResponse<void>> {
  return withActionPermission('midi:update', async (user) => {
    // 速率限制检查
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(`midi:${user.id}`);
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
    }
    try {
      if (!newName || newName.trim() === '') {
        return { success: false, error: '新名称不能为空' };
      }

      const oldFileName = `${oldSlug}.mid`;
      const oldPath = path.join(MIDI_DIR, oldFileName);

      // 安全检查
      if (!oldPath.startsWith(MIDI_DIR)) {
        return { success: false, error: '非法路径' };
      }
      const newFileName = `${newName.trim()}.mid`;
      const newPath = path.join(MIDI_DIR, newFileName);

      // 检查新名称是否已存在
      const conflict = await checkFileConflict(newPath);
      if (conflict) {
        return { success: false, error: conflict.error };
      }

      await fs.rename(oldPath, newPath);
      logger.info('重命名 MIDI 文件成功', {
        oldSlug,
        newName,
        userId: user.id,
      });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('重命名 MIDI 文件失败', error, { oldSlug, newName });
      return { success: false, error: '重命名文件失败' };
    }
  });
}

export async function getPublicMidis(): Promise<ActionResponse<MidiFile[]>> {
  try {
    const files = await getMidis();
    const midiFiles = await Promise.all(
      files.map((file) => readMidiFile(path.join(MIDI_DIR, file)))
    );

    // Sort alphabetically by name
    return {
      success: true,
      data: midiFiles.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
    };
  } catch (error) {
    logger.error('获取 MIDI 文件列表失败', error);
    return { success: false, error: '获取 MIDI 文件列表失败' };
  }
}
