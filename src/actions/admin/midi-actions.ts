'use server';

import path from 'path';
import { MIDI_DIR } from '@/constant/dir';
import { getMidis, readMidiFile } from '@/lib/midi';
import { goFetch, withGoAuth, buildQuery } from '@/lib/server/api-client';
import { createGoUploadAction } from '@/lib/upload';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MidiActions');

/** MIDI 列表每页默认条数（与 Go 端默认值保持一致） */
const MIDI_LIST_DEFAULT_LIMIT = 20;
/** MIDI 列表每页最大条数（与 Go 端上限保持一致） */
const MIDI_LIST_MAX_LIMIT = 100;

export interface AdminGetMidiFilesParams {
  page?: number;
  limit?: number;
  /** 文件名关键字，大小写不敏感 */
  search?: string;
}

// GET - 获取 MIDI 文件列表（转发到 Go GET /api/midi，支持搜索与分页）
export async function adminGetMidiFiles(
  params: AdminGetMidiFilesParams = {}
): Promise<ActionResponse<MidiAdminFilesPage>> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const limit = Math.min(
    MIDI_LIST_MAX_LIMIT,
    Math.max(1, Math.floor(params.limit ?? MIDI_LIST_DEFAULT_LIMIT))
  );
  const search = params.search?.trim() ?? '';

  return withActionPermission(
    'midi:read',
    async (_user, ctx) => {
      try {
        const query = buildQuery({
          page: String(page),
          limit: String(limit),
          search,
        });
        const data = await goFetch<{
          files: MidiAdminFile[];
          pagination: MidiAdminFilesPage['pagination'];
          success: boolean;
        }>(`/api/midi${query}`, withGoAuth(ctx));

        return {
          success: true,
          data: {
            files: data.files ?? [],
            pagination: data.pagination,
          },
        };
      } catch (error) {
        logger.error('获取 MIDI 文件列表失败', error);
        return { success: false, error: '获取文件列表失败' };
      }
    },
    { rateLimitKey: 'midi' }
  );
}

// POST - 上传 MIDI 文件（multipart）
// 经统一上传接口 /api/uploads/asset 转发，dir=midisongs（Go 负责落盘）
export const adminUploadMidiFile = createGoUploadAction({
  name: 'MIDI文件',
  permission: 'midi:create',
  rateLimitKey: 'midi:{userId}',
  formField: 'file',
  label: 'MIDI',
  dir: 'midisongs',
  target: 'raw',
  result: { kind: 'raw-url', message: 'MIDI文件上传成功' },
});

// DELETE - 删除 MIDI 文件（转发到 Go DELETE /api/midi/:slug）
export async function adminDeleteMidiFile(
  slug: string
): Promise<ActionResponse<void>> {
  return withActionPermission(
    'midi:delete',
    async (user, ctx) => {
      try {
        await goFetch(`/api/midi/${encodeURIComponent(slug)}`, withGoAuth(ctx, {
          method: 'DELETE',
        }));
        logger.info('删除 MIDI 文件成功', { slug, userId: user.id });
        return { success: true, data: undefined };
      } catch (error) {
        logger.error('删除 MIDI 文件失败', error, { slug });
        const msg = error instanceof Error ? error.message : '删除文件失败';
        return { success: false, error: msg };
      }
    },
    { rateLimitKey: 'midi' }
  );
}

// PUT - 重命名 MIDI 文件（转发到 Go PUT /api/midi/:slug）
export async function adminRenameMidiFile(
  oldSlug: string,
  newName: string
): Promise<ActionResponse<void>> {
  return withActionPermission(
    'midi:update',
    async (user, ctx) => {
      if (!newName || newName.trim() === '') {
        return { success: false, error: '新名称不能为空' };
      }

      try {
        await goFetch(`/api/midi/${encodeURIComponent(oldSlug)}`, withGoAuth(ctx, {
          method: 'PUT',
          body: JSON.stringify({ newName: newName.trim() }),
        }));
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
    },
    { rateLimitKey: 'midi' }
  );
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
