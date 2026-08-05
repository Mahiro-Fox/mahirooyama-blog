'use server';

import { accountStore } from '@/store/account-store';
import { sessionStore } from '@/store/session-store';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import {
  JWT_SECRET,
  SESSION_EXPIRY,
  USER_SESSION_COOKIE,
} from '@/constant/auth';
import { verifyUserAuth } from '@/lib/user-auth';
import { loginRateLimiter } from '@/lib/rate-limit';
import { createLogger } from '@/utils/logger';

const logger = createLogger('UserAuthAction');

async function setUserSessionCookie(token: string) {
  const isSecure =
    process.env.COOKIE_SECURE === 'true' ||
    (process.env.COOKIE_SECURE !== 'false' &&
      process.env.NODE_ENV === 'production');

  const cookieStore = await cookies();
  cookieStore.set(USER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'strict',
    maxAge: SESSION_EXPIRY,
    path: '/',
  });
}

async function createUserSession(
  userId: string,
  username: string,
  sessionId: string
) {
  const token = await new SignJWT({
    userId,
    username,
    sessionId,
    loggedInAt: new Date().toISOString(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRY}s`)
    .sign(JWT_SECRET);

  sessionStore.deleteByUserId(userId);
  sessionStore.create(token, {
    userId,
    sessionId,
    userAgent: 'server-action',
    ip: 'server-action',
  });

  await setUserSessionCookie(token);
  return token;
}

export async function userLogin(
  username: string,
  password: string
): Promise<
  | {
      success: true;
      message: string;
      user: { id: string; username: string };
    }
  | { success: false; error: string; resetTime?: number }
> {
  try {
    if (!username || !password) {
      return { success: false, error: 'Username and password required' };
    }

    const rateLimit = await loginRateLimiter.check(`user-login:${username}`);
    if (!rateLimit.success) {
      return {
        success: false,
        error: 'Too many attempts, please try again later',
        resetTime: rateLimit.resetTime,
      };
    }

    const account = await accountStore.verifyPassword(username, password);

    if (!account) {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 100 + 50)
      );
      return { success: false, error: 'Invalid username or password' };
    }

    const sessionId = crypto.randomUUID();
    await createUserSession(account.id, account.username, sessionId);

    return {
      success: true,
      message: 'Login successful',
      user: { id: account.id, username: account.username },
    };
  } catch (error) {
    logger.error('Login failed', error, {
      username,
      action: 'userLogin',
    });
    return { success: false, error: 'Login failed, please try again later' };
  }
}

export async function userRegister(
  username: string,
  password: string
): Promise<
  | {
      success: true;
      message: string;
      user: { id: string; username: string };
    }
  | { success: false; error: string }
> {
  try {
    if (!username || !password) {
      return { success: false, error: 'Username and password required' };
    }

    if (username.length < 3) {
      return {
        success: false,
        error: 'Username must be at least 3 characters',
      };
    }

    if (password.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters',
      };
    }

    const existing = await accountStore.getByUsername(username);
    if (existing) {
      return { success: false, error: 'Username already exists' };
    }

    const account = await accountStore.create({ username, password });

    const sessionId = crypto.randomUUID();
    await createUserSession(account.id, account.username, sessionId);

    return {
      success: true,
      message: 'Registration successful',
      user: { id: account.id, username: account.username },
    };
  } catch (error) {
    logger.error('Registration failed', error, {
      username,
      action: 'userRegister',
    });
    return {
      success: false,
      error: 'Registration failed, please try again later',
    };
  }
}

export async function userLogout() {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value;

  if (token) {
    sessionStore.delete(token);
  }

  cookieStore.delete(USER_SESSION_COOKIE);

  return { success: true };
}

export async function checkUserLogin() {
  const authCheck = await verifyUserAuth();
  if (!authCheck.success) {
    return { success: false, error: 'Not logged in' };
  }
  return {
    success: true,
    user: {
      id: authCheck.userId,
      username: authCheck.username,
    },
  };
}
