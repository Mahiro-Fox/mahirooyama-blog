import { redirect } from 'next/navigation';
import { adminGetGuestbookEntries } from '@/actions/admin/guestbook-actions';
import { requirePermission } from '@/lib/permissions';
import GuestbookClient from './guestbook-client';

export default async function GuestbookAdminPage() {
  const permissionCheck = await requirePermission('guestbook:read');
  if (!permissionCheck.allowed) {
    redirect('/admin?toast=unauthorized&message=无权限访问留言墙管理');
  }

  const result = await adminGetGuestbookEntries();
  const entries = result.success ? result.data : [];

  return <GuestbookClient initialEntries={entries} />;
}
