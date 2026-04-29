import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { UserRole } from '@/store/user-store';
import { jwtVerify } from 'jose';

import AdminShell from '@/components/admin/admin-shell';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

async function getCurrentUserFromCookie() {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('admin-session');
    if (!tokenCookie?.value) return null;

    const { payload } = await jwtVerify(tokenCookie.value, JWT_SECRET);
    if (!payload.userId || !payload.username) return null;

    return {
      id: String(payload.userId),
      username: String(payload.username),
      avatar: String(payload.avatar || '/images/avatar/default-avatar.webp'),
      role: String(payload.role || 'user'),
    };
  } catch {
    return null;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get current pathname from headers (set by middleware)
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';

  // If this is the login page, skip auth check (login page handles its own logic)
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login?')) {
    return (
      <div className="bg-muted/30 flex min-h-screen">
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  // Check auth for all other admin pages
  const currentUser = await getCurrentUserFromCookie();

  if (!currentUser) {
    // Not logged in, redirect to login page with return URL
    const redirectUrl = pathname
      ? `/admin/login?redirect=${encodeURIComponent(pathname)}`
      : '/admin/login';
    redirect(redirectUrl);
  }

  return (
    <AdminShell
      currentUser={{
        id: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar,
        role: currentUser.role as UserRole,
      }}
    >
      {children}
    </AdminShell>
  );
}
