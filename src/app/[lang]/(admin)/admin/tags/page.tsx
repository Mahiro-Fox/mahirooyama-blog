import { tagStore } from '@/store/tag-store';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/permissions';
import TagsClient from './tags-client';

export default async function TagsManagementPage() {
  // Check permission
  const permissionCheck = await requirePermission('tag:read');
  if (!permissionCheck.allowed) {
    redirect('/admin?toast=unauthorized&message=无权限访问标签管理');
  }
  const tags = await tagStore.getAll();
  return <TagsClient initialTags={tags} />;
}
