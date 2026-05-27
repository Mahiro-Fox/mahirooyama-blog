'use server';

import { TagsData, TagType } from '@/constant';
import { tagStore } from '@/store/tag-store';

import { requirePermission } from '@/lib/permissions';
import { serverActionRateLimiter } from '@/lib/rate-limit';

export async function adminGetTags(): Promise<
  { success: true; tags: TagsData } | { success: false; error: string }
> {
  const permissionCheck = await requirePermission('tag:read');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  const tags = await tagStore.getAll();
  return { success: true, tags };
}

export async function adminCreateTag(input: {
  id: string;
  name: string;
  icon?: string;
  type: TagType;
  description?: string;
}): Promise<
  { success: true } | { success: false; error: string; resetTime?: number }
> {
  const permissionCheck = await requirePermission('tag:create');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  // 速率限制检查
  if (permissionCheck.user?.id) {
    const rateLimit = await serverActionRateLimiter.check(
      `tag:${permissionCheck.user.id}`
    );
    if (!rateLimit.success) {
      return {
        success: false,
        error: '操作过于频繁，请稍后再试',
        resetTime: rateLimit.resetTime,
      };
    }
  }

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

  return { success: true };
}

export async function adminUpdateTag(input: {
  id: string;
  type: TagType;
  name: string;
  icon: string;
  description?: string;
}): Promise<
  { success: true } | { success: false; error: string; resetTime?: number }
> {
  const permissionCheck = await requirePermission('tag:update');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  // 速率限制检查
  if (permissionCheck.user?.id) {
    const rateLimit = await serverActionRateLimiter.check(
      `tag:${permissionCheck.user.id}`
    );
    if (!rateLimit.success) {
      return {
        success: false,
        error: '操作过于频繁，请稍后再试',
        resetTime: rateLimit.resetTime,
      };
    }
  }

  const updated = await tagStore.update(input.id, input.type, {
    name: input.name,
    icon: input.icon,
    description: input.description,
  });

  if (!updated) {
    return { success: false, error: '标签不存在' };
  }

  return { success: true };
}

export async function adminDeleteTag(input: {
  id: string;
  type: TagType;
}): Promise<
  { success: true } | { success: false; error: string; resetTime?: number }
> {
  const permissionCheck = await requirePermission('tag:delete');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  // 速率限制检查
  if (permissionCheck.user?.id) {
    const rateLimit = await serverActionRateLimiter.check(
      `tag:${permissionCheck.user.id}`
    );
    if (!rateLimit.success) {
      return {
        success: false,
        error: '操作过于频繁，请稍后再试',
        resetTime: rateLimit.resetTime,
      };
    }
  }

  const ok = await tagStore.delete(input.id, input.type);
  if (!ok) {
    return { success: false, error: '标签不存在' };
  }

  return { success: true };
}

export async function adminResetTags(): Promise<
  | { success: true; tags: TagsData }
  | { success: false; error: string; resetTime?: number }
> {
  const permissionCheck = await requirePermission('tag:reset');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  // 速率限制检查
  if (permissionCheck.user?.id) {
    const rateLimit = await serverActionRateLimiter.check(
      `tag:${permissionCheck.user.id}`
    );
    if (!rateLimit.success) {
      return {
        success: false,
        error: '操作过于频繁，请稍后再试',
        resetTime: rateLimit.resetTime,
      };
    }
  }

  const tags = await tagStore.resetToDefault();
  return { success: true, tags };
}
