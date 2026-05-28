import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminGetGuestbookEntries } from '@/actions/admin/guestbook-actions';
import type { UserRole } from '@/store/user-store';

import { verifyAuth } from '@/lib/admin-auth';
import { requirePermission } from '@/lib/permissions';
import AdminShell from '@/components/admin/admin-shell';
import { QueryToast } from '@/components/admin/query-toast';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth is handled by middleware first, but we double-check here for safety
  // This also gets user info for the AdminShell UI
  const authCheck = await verifyAuth();

  if (!authCheck.success) {
    // Get current pathname for redirect
    const headersList = await headers();
    const pathname = headersList.get('x-pathname') || '';
    const redirectUrl = pathname
      ? `/login?redirect=${encodeURIComponent(pathname)}`
      : '/login';
    redirect(redirectUrl);
  }

  const currentUser = authCheck;

  // 获取未审核的留言条数
  const permissionCheck = await requirePermission('guestbook:read');
  let guestbookPendingCount = 0;
  if (permissionCheck.allowed) {
    const result = await adminGetGuestbookEntries();
    const entries = result.success ? result.entries : [];
    guestbookPendingCount = entries.filter((entry) => !entry.isApproved).length;
  }

  return (
    <>
      <QueryToast />
      <AdminShell
        currentUser={{
          id: String(currentUser.userId),
          username: String(currentUser.username),
          avatar: String(
            currentUser.avatar || '/uploads/images/avatar/default-avatar.webp'
          ),
          role: currentUser.role as UserRole,
        }}
        guestbookPendingCount={guestbookPendingCount}
      >
        {children}
      </AdminShell>
    </>
  );
}
