'use server';

import { revalidatePath } from 'next/cache';

import { requirePermission } from '@/lib/permissions';

const PATHS_TO_REVALIDATE = [
  '/',
  '/blog',
  '/gallery',
  '/page/blog/[page]',
  '/page/gallery/[page]',
  '/tag/blog/[slug]',
  '/tag/gallery/[slug]',
];

export async function adminRevalidateAll() {
  const permissionCheck = await requirePermission('system:revalidate');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  const results: string[] = [];

  for (const path of PATHS_TO_REVALIDATE) {
    try {
      revalidatePath(path, 'layout');
      results.push(`✓ ${path}`);
    } catch (error) {
      results.push(`✗ ${path}: ${String(error)}`);
    }
  }

  return { success: true, results, timestamp: new Date().toISOString() };
}
