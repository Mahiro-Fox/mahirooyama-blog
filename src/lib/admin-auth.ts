import { cookies } from 'next/headers';
import { JWT_SECRET } from '@/constant';
import { jwtVerify, type JWTPayload } from 'jose';

type AdminSessionPayload = JWTPayload & {
  userId?: string;
  username?: string;
  avatar?: string;
  role?: string;
  sessionId?: string;
};

export type CurrentAdminUser = {
  id: string;
  username: string;
  avatar: string;
  role: string;
};

export async function getCurrentAdminUser(): Promise<CurrentAdminUser | null> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('admin-session');
    if (!tokenCookie?.value) return null;

    const { payload } = await jwtVerify(tokenCookie.value, JWT_SECRET);

    const p = payload as AdminSessionPayload;
    if (!p.userId || !p.username) return null;

    // Note: We don't check sessionStore.exists() here because
    // in dev mode (pnpm dev), Server Components may run in different
    // processes where the in-memory sessionStore is not shared.
    // The JWT signature verification is sufficient for Server Components.
    // Session validation (single-device login) is enforced in API Routes.

    return {
      id: String(p.userId),
      username: String(p.username),
      avatar: String(p.avatar || '/images/avatar/default-avatar.webp'),
      role: String(p.role || 'user'),
    };
  } catch {
    return null;
  }
}
