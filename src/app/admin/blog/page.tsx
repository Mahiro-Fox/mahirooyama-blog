import { adminGetBlogFiles } from '@/actions/admin/blog-actions';

import BlogClient from './blog-client';

export default async function BlogAdminPage() {
  const result = await adminGetBlogFiles();
  const files = result.success ? result.files : [];

  return <BlogClient initialFiles={files} />;
}
