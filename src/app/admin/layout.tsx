import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { UserRole } from '@/store/user-store';

import { verifyAuth } from '@/lib/auth';
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

  return (
    <>
      <QueryToast />
      <AdminShell
        currentUser={{
          id: String(currentUser.userId),
          username: String(currentUser.username),
          avatar: String(
            currentUser.avatar || '/images/avatar/default-avatar.webp'
          ),
          role: currentUser.role as UserRole,
        }}
      >
        {children}
      </AdminShell>
    </>
  );
}
