import { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminGetGuestbookEntries } from '@/actions/admin/guestbook-actions';
import type { UserRole } from '@/store/user-store';

import { verifyAuth } from '@/lib/admin-auth';
import { requirePermission } from '@/lib/permissions';
import AdminShell from '@/components/admin/admin-shell';
import { QueryToast } from '@/components/admin/query-toast';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 虽然已经在 proxy 中处理了认证，但是这里还是再次检查一下，确保安全
  // 这样可以确保在代理中间件处理完成后，用户信息会被正确设置
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
    const entries = result.success ? result.data : [];
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
