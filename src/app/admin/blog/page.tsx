import { redirect } from 'next/navigation';
import { adminGetBlogFiles } from '@/actions/admin/blog-actions';

import { requirePermission } from '@/lib/permissions';

import BlogClient from './blog-client';

export default async function BlogAdminPage() {
  const permissionCheck = await requirePermission('blog:read');
  if (!permissionCheck.allowed) {
    redirect('/admin?toast=unauthorized&message=无权限访问博客管理');
  }

  const result = await adminGetBlogFiles();
  const files = result.success ? result.files : [];

  return <BlogClient initialFiles={files} />;
}
