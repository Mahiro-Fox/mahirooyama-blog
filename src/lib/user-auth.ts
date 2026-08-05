'use server';

import { accountStore } from '@/store/account-store';
import { sessionStore } from '@/store/session-store';
import { jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { JWT_SECRET, USER_SESSION_COOKIE } from '@/constant/auth';

type UserSessionPayload = JWTPayload & {
  userId?: string;
  username?: string;
  sessionId?: string;
};

export type CurrentUser = {
  id: string;
  username: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(USER_SESSION_COOKIE);
    if (!tokenCookie?.value) return null;

    const payload = await verifyJwtToken(tokenCookie.value);
    if (!payload) return null;

    if (!payload.userId || !payload.username) return null;

    const account = await accountStore.getById(String(payload.userId));
    if (!account) return null;

    return {
      id: String(account.id),
      username: String(account.username),
    };
  } catch {
    return null;
  }
}

export async function verifyUserAuth() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(USER_SESSION_COOKIE);

    if (!token) {
      return { success: false, error: 'Not logged in' };
    }

    const payload = await verifyJwtToken(token.value);
    if (!payload) {
      return { success: false, error: 'Session expired' };
    }

    if (!sessionStore.exists(token.value)) {
      if (payload.userId && payload.sessionId) {
        sessionStore.create(token.value, {
          userId: String(payload.userId),
          sessionId: String(payload.sessionId),
        });
      } else {
        return {
          success: false,
          error: 'Session invalidated',
        };
      }
    }

    sessionStore.update(token.value);

    const account = await accountStore.getById(String(payload.userId));
    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    return {
      success: true,
      userId: payload.userId,
      username: account.username,
      sessionId: payload.sessionId,
    };
  } catch {
    return { success: false, error: 'Session expired' };
  }
}

async function verifyJwtToken(
  token: string
): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as UserSessionPayload;
  } catch {
    return null;
  }
}
