import { tagStore } from '@/store/tag-store';

import TagsClient from './tags-client';

export default async function TagsManagementPage() {
  const tags = await tagStore.getAll();
  return <TagsClient initialTags={tags} />;
}
