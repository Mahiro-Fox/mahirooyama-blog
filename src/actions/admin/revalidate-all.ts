'use server';

import { revalidatePath } from 'next/cache';

import { requirePermission } from '@/lib/permissions';
import { serverActionRateLimiter } from '@/lib/rate-limit';

export async function adminRevalidateAll() {
  const permissionCheck = await requirePermission('system:revalidate');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  // 速率限制检查
  if (permissionCheck.user?.id) {
    const rateLimit = await serverActionRateLimiter.check(
      `system:${permissionCheck.user.id}`
    );
    if (!rateLimit.success) {
      return {
        success: false,
        error: '操作过于频繁，请稍后再试',
        resetTime: rateLimit.resetTime,
      };
    }
  }

  const results: string[] = [];

  try {
    revalidatePath('/', 'layout');
    results.push('✓ /');
  } catch (error) {
    results.push(`✗ /: ${String(error)}`);
  }

  return { success: true, results, timestamp: new Date().toISOString() };
}
