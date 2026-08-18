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
import { createLogger } from '@/utils/logger';
import { goFetch } from '@/lib/server/api-client';

const logger = createLogger('MidiActions');

const INTERNAL_SECRET = process.env.GO_API_SHARED_SECRET ?? '';
const BASE_URL = process.env.GO_API_INTERNAL_URL ?? 'http://localhost:8080';

// GET - 获取 MIDI 文件列表（转发到 Go GET /api/midi）
export async function adminGetMidiFiles(): Promise<
  ActionResponse<MidiAdminFile[]>
> {
  return withActionPermission('midi:read', async (user) => {
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
      const data = await goFetch<{ files: MidiAdminFile[]; success: boolean }>(
        '/api/midi'
      );
      return { success: true, data: data.files ?? [] };
    } catch (error) {
      logger.error('获取 MIDI 文件列表失败', error);
      return { success: false, error: '获取文件列表失败' };
    }
  });
}

// POST - 上传 MIDI 文件（转发 multipart 到 Go POST /api/midi）
// 注意：不使用 createUploadAction，因为该工厂直接写文件系统，现已迁移到 Go
export async function adminUploadMidiFile(
  formData: FormData
): Promise<ActionResponse<void>> {
  return withActionPermission('midi:create', async (user) => {
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

    const file = formData.get('file') as File | null;
    if (!file) {
      return { success: false, error: '未提供 MIDI 文件' };
    }

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.mid')) {
      return { success: false, error: '只支持 .mid 格式' };
    }

    try {
      // 转发 FormData 到 Go（不能用 goFetch，因其默认 Content-Type 是 application/json）
      const goFormData = new FormData();
      goFormData.append('file', file, file.name);

      const res = await fetch(`${BASE_URL}/api/midi`, {
        method: 'POST',
        headers: {
          'X-Internal-Secret': INTERNAL_SECRET,
        },
        body: goFormData,
        cache: 'no-store',
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return {
          success: false,
          error: `上传失败: ${body || res.statusText}`,
        };
      }

      logger.info('上传 MIDI 文件成功', {
        fileName: file.name,
        userId: user.id,
      });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('上传 MIDI 文件失败', error);
      return { success: false, error: '上传失败' };
    }
  });
}

// DELETE - 删除 MIDI 文件（转发到 Go DELETE /api/midi/:slug）
export async function adminDeleteMidiFile(
  slug: string
): Promise<ActionResponse<void>> {
  return withActionPermission('midi:delete', async (user) => {
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
      await goFetch(`/api/midi/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      });
      logger.info('删除 MIDI 文件成功', { slug, userId: user.id });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('删除 MIDI 文件失败', error, { slug });
      const msg = error instanceof Error ? error.message : '删除文件失败';
      return { success: false, error: msg };
    }
  });
}

// PUT - 重命名 MIDI 文件（转发到 Go PUT /api/midi/:slug）
export async function adminRenameMidiFile(
  oldSlug: string,
  newName: string
): Promise<ActionResponse<void>> {
  return withActionPermission('midi:update', async (user) => {
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

    if (!newName || newName.trim() === '') {
      return { success: false, error: '新名称不能为空' };
    }

    try {
      await goFetch(`/api/midi/${encodeURIComponent(oldSlug)}`, {
        method: 'PUT',
        body: JSON.stringify({ newName: newName.trim() }),
      });
      logger.info('重命名 MIDI 文件成功', {
        oldSlug,
        newName,
        userId: user.id,
      });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('重命名 MIDI 文件失败', error, { oldSlug, newName });
      const msg = error instanceof Error ? error.message : '重命名文件失败';
      return { success: false, error: msg };
    }
  });
}

// 读取公开 MIDI 列表（含时长解析）
// 保留在 Next.js：涉及 MIDI 文件二进制解析（parseMidiDuration），Go 端暂未实现
export async function getPublicMidis(): Promise<ActionResponse<MidiFile[]>> {
  try {
    const files = await getMidis();
    const midiFiles = await Promise.all(
      files.map((file) => readMidiFile(path.join(MIDI_DIR, file)))
    );

    return {
      success: true,
      data: midiFiles.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
    };
  } catch (error) {
    logger.error('获取 MIDI 文件列表失败', error);
    return { success: false, error: '获取 MIDI 文件列表失败' };
  }
}
