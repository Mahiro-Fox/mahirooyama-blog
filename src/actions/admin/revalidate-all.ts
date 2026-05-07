'use server';

import { revalidatePath } from 'next/cache';

import { requirePermission } from '@/lib/permissions';

export async function adminRevalidateAll() {
  const permissionCheck = await requirePermission('system:revalidate');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
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
