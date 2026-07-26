import { redirect } from 'next/navigation';
import { adminGetBlogs } from '@/actions/admin/blog-actions';

import { requirePermission } from '@/lib/permissions';

import BlogClient from './blog-client';

export default async function BlogAdminPage() {
  const permissionCheck = await requirePermission('blog:read');
  if (!permissionCheck.allowed) {
    redirect('/admin?toast=unauthorized&message=无权限访问博客管理');
  }

  const result = await adminGetBlogs();
  const files = result.success ? result.data : [];

  return <BlogClient initialFiles={files} />;
}
