'use server';

import { TagsData, TagType } from '@/constant';
import { tagStore } from '@/store/tag-store';
import { revalidatePath } from 'next/cache';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { createLogger } from '@/utils/logger';

const logger = createLogger('TagActions');

export async function adminGetTags(): Promise<ActionResponse<TagsData>> {
  return withActionPermission('tag:read', async () => {
    const tags = await tagStore.getAll();
    return { success: true, data: tags };
  });
}

export async function adminCreateTag(input: {
  id: string;
  name: string;
  icon?: string;
  type: TagType;
  description?: string;
}): Promise<ActionResponse<void>> {
  return withActionPermission(
    'tag:create',
    async (user) => {
      if (!input.id || !input.name || !input.type) {
        return { success: false, error: '缺少必填字段: id, name, type' };
      }

      if (input.type !== 'blog' && input.type !== 'gallery') {
        return { success: false, error: '类型必须是 blog 或 gallery' };
      }

      const exists = await tagStore.exists(input.id, input.type);
      if (exists) {
        return { success: false, error: '标签 ID 已存在' };
      }

      await tagStore.create({
        id: input.id,
        name: input.name,
        icon: input.icon || 'default',
        type: input.type,
        description: input.description,
      });

      logger.info('创建标签成功', {
        tagId: input.id,
        type: input.type,
        userId: user.id,
      });
      revalidatePath('/', 'layout');
      return { success: true, data: undefined };
    },
    { rateLimitKey: 'tag' }
  );
}

export async function adminUpdateTag(input: {
  id: string;
  type: TagType;
  name: string;
  icon: string;
  description?: string;
}): Promise<ActionResponse<void>> {
  return withActionPermission(
    'tag:update',
    async (user) => {
      const updated = await tagStore.update(input.id, input.type, {
        name: input.name,
        icon: input.icon,
        description: input.description,
      });

      if (!updated) {
        return { success: false, error: '标签不存在' };
      }

      logger.info('更新标签成功', {
        tagId: input.id,
        type: input.type,
        userId: user.id,
      });
      revalidatePath('/', 'layout');
      return { success: true, data: undefined };
    },
    { rateLimitKey: 'tag' }
  );
}

export async function adminDeleteTag(input: {
  id: string;
  type: TagType;
}): Promise<ActionResponse<void>> {
  return withActionPermission(
    'tag:delete',
    async (user) => {
      const ok = await tagStore.delete(input.id, input.type);
      if (!ok) {
        return { success: false, error: '标签不存在' };
      }

      logger.info('删除标签成功', {
        tagId: input.id,
        type: input.type,
        userId: user.id,
      });
      revalidatePath('/', 'layout');
      return { success: true, data: undefined };
    },
    { rateLimitKey: 'tag' }
  );
}

export async function adminResetTags(): Promise<ActionResponse<TagsData>> {
  return withActionPermission(
    'tag:reset',
    async (user) => {
      const tags = await tagStore.resetToDefault();
      logger.warn('重置标签为默认值', { userId: user.id });
      revalidatePath('/', 'layout');
      return { success: true, data: tags };
    },
    { rateLimitKey: 'tag' }
  );
}
