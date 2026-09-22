'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/permissions';
import { consumeRateLimit } from '@/utils/action-response';

export async function adminRevalidateAll() {
  const permissionCheck = await requirePermission('system:revalidate');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  const limited = await consumeRateLimit(permissionCheck.user?.id, 'system');
  if (limited) return limited;

  const results: string[] = [];

  try {
    revalidatePath('/', 'layout');
    results.push('✓ /');
  } catch (error) {
    results.push(`✗ /: ${String(error)}`);
  }

  return { success: true, results, timestamp: new Date().toISOString() };
}
