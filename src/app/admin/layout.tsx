import { cookies } from 'next/headers';
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
  // Check if this is the login page by checking the URL via headers
  const currentUser = await getCurrentUserFromCookie();

  // If no user and children appears to be login page content, just render it
  // We detect login page by checking if there's no authenticated user
  // The login page itself should handle its own layout
  if (!currentUser) {
    // Check if we're on the login page by looking at the referer or pathname
    // This is a simplified check - the login page is at /admin/login
    redirect('/admin/login?redirect=/admin');
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
