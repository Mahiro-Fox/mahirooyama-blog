'use server';

import { headers } from 'next/headers';
import { sendVerificationCode } from '@/lib/email-send/verification-code';
import { loginRateLimiter, serverActionRateLimiter } from '@/lib/rate-limit';
import { buildQuery, goFetch } from '@/lib/server/api-client';
import {
  checkVerificationCode,
  clearVerification,
  CODE_TTL_MINUTES,
  issueVerificationCode,
  isVerified,
  normalizeEmail,
} from '@/lib/server/email-verification';
import {
  getCurrentUser,
  userLoginViaGo,
  userLogoutViaGo,
} from '@/lib/user-auth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('UserAuthAction');

// 邮箱格式校验（前端也会校验一次，这里作为信任边界的兜底）
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 6 位纯数字验证码
const CODE_PATTERN = /^\d{6}$/;

// 剩余秒数（限流/节流提示用），至少 1 秒
function toRetrySeconds(until: number): number {
  return Math.max(1, Math.ceil((until - Date.now()) / 1000));
}

// 从请求头解析客户端 IP（用于限流叠加 IP 维度）
async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown'
  );
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
    const ipLimit = await loginRateLimiter.check(
      `user-login-ip:${await clientIp()}`
    );
    if (!rateLimit.success || !ipLimit.success) {
      return {
        success: false,
        error: 'Too many attempts, please try again later',
        resetTime: Math.max(rateLimit.resetTime, ipLimit.resetTime),
      };
    }

    let loginRes;
    try {
      loginRes = await userLoginViaGo(username, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err ?? '');
      if (msg.includes('返回 401')) {
        return { success: false, error: 'Invalid username or password' };
      }
      throw err;
    }

    return {
      success: true,
      message: 'Login successful',
      user: {
        id: loginRes.account.id,
        username: loginRes.account.username,
      },
    };
  } catch (error) {
    logger.error('Login failed', error, { username, action: 'userLogin' });
    return { success: false, error: 'Login failed, please try again later' };
  }
}

// —— 邮箱优先认证流程（弹窗登录/注册共用） ——

export type StartEmailAuthResult =
  | { success: true; exists: boolean }
  | { success: false; error: string; retryAfter?: number };

/**
 * 第一步：输入邮箱后点「继续」。
 * - 邮箱已注册 → 返回 exists=true，前端进入「输入密码」步骤（不涉及验证码）
 * - 邮箱未注册 → 发送验证码，返回 exists=false，前端进入「输入验证码」步骤
 * 失败时 error 为稳定的机器码，由前端映射为对应语言的文案。
 */
export async function startEmailAuth(
  email: string
): Promise<StartEmailAuthResult> {
  const normalized = normalizeEmail(email);
  if (!EMAIL_PATTERN.test(normalized)) {
    return { success: false, error: 'INVALID_EMAIL' };
  }

  try {
    // IP 维度限流，防止批量探测邮箱是否已注册
    const ipLimit = await serverActionRateLimiter.check(
      `email-auth-ip:${await clientIp()}`
    );
    if (!ipLimit.success) {
      return {
        success: false,
        error: 'RATE_LIMITED',
        retryAfter: toRetrySeconds(ipLimit.resetTime),
      };
    }

    // 是否已注册（公开端点，仅返回布尔）
    const { exists } = await goFetch<{ exists: boolean }>(
      `/api/accounts/exists${buildQuery({ email: normalized })}`
    );
    if (exists) {
      return { success: true, exists: true };
    }

    // 未注册：生成验证码（含 60s 重发节流）
    const issued = issueVerificationCode(normalized);
    if (!issued.ok) {
      return {
        success: false,
        error: 'RESEND_TOO_SOON',
        retryAfter: toRetrySeconds(Date.now() + issued.retryAfterMs),
      };
    }

    const sent = await sendVerificationCode({
      toEmail: normalized,
      code: issued.code,
      expiresMinutes: CODE_TTL_MINUTES,
    });
    if (!sent.success) {
      // 发送失败：清除记录，避免用户被节流窗口卡住而无法重试
      clearVerification(normalized);
      return { success: false, error: 'SEND_FAILED' };
    }

    return { success: true, exists: false };
  } catch (error) {
    logger.error('startEmailAuth failed', error, {
      email: normalized,
      action: 'startEmailAuth',
    });
    return { success: false, error: 'SEND_FAILED' };
  }
}

export type VerifyEmailCodeResult =
  | { success: true }
  | { success: false; error: string; remainingAttempts?: number };

/**
 * 第二步（注册分支）：校验邮箱验证码。
 * 通过后记录 verified 标记，供 registerWithEmail 换取。
 */
export async function verifyEmailCode(
  email: string,
  code: string
): Promise<VerifyEmailCodeResult> {
  const normalized = normalizeEmail(email);
  const trimmed = code.trim();
  if (!EMAIL_PATTERN.test(normalized)) {
    return { success: false, error: 'INVALID_EMAIL' };
  }
  if (!CODE_PATTERN.test(trimmed)) {
    return { success: false, error: 'INVALID_CODE_FORMAT' };
  }

  try {
    // IP 维度限流，防止暴力枚举验证码
    const ipLimit = await serverActionRateLimiter.check(
      `email-verify-ip:${await clientIp()}`
    );
    if (!ipLimit.success) {
      return { success: false, error: 'RATE_LIMITED' };
    }

    const res = checkVerificationCode(normalized, trimmed);
    if (!res.ok) {
      return {
        success: false,
        error: res.error,
        remainingAttempts: res.remainingAttempts,
      };
    }
    return { success: true };
  } catch (error) {
    logger.error('verifyEmailCode failed', error, {
      email: normalized,
      action: 'verifyEmailCode',
    });
    return { success: false, error: 'VERIFY_FAILED' };
  }
}

export type RegisterWithEmailResult =
  | {
      success: true;
      message: string;
      user: { id: string; username: string };
    }
  | { success: false; error: string; remainingAttempts?: number };

/**
 * 第三步（注册分支）：设置用户名 + 密码，完成注册并自动登录。
 * 要求该邮箱已验证（verifyEmailCode 通过）；账户创建成功后才作废验证结果，
 * 避免用户名被占用等中途失败时白白消耗掉用户的验证。
 */
export async function registerWithEmail(input: {
  email: string;
  code: string;
  username: string;
  password: string;
}): Promise<RegisterWithEmailResult> {
  const email = normalizeEmail(input.email);
  const username = input.username.trim();

  if (!EMAIL_PATTERN.test(email)) {
    return { success: false, error: 'INVALID_EMAIL' };
  }
  if (username.length < 3) {
    return { success: false, error: 'USERNAME_TOO_SHORT' };
  }
  if (input.password.length < 6) {
    return { success: false, error: 'PASSWORD_TOO_SHORT' };
  }

  try {
    // 注册 IP 维度限流（与老注册流程共用计数键）
    const ipLimit = await serverActionRateLimiter.check(
      `user-register-ip:${await clientIp()}`
    );
    if (!ipLimit.success) {
      return { success: false, error: 'RATE_LIMITED' };
    }

    // 先确认验证状态：已 verified 的凭证，或本次现验通过
    if (!isVerified(email)) {
      const checked = checkVerificationCode(email, input.code.trim());
      if (!checked.ok) {
        return {
          success: false,
          error: checked.error,
          remainingAttempts: checked.remainingAttempts,
        };
      }
    }

    // 创建账户（email 为必填，Go 侧会做唯一性校验）
    const created = await goFetch<{ id: string; username: string }>(
      '/api/accounts',
      {
        method: 'POST',
        body: JSON.stringify({ username, email, password: input.password }),
      }
    );
    if (!created?.id) {
      return { success: false, error: 'REGISTER_FAILED' };
    }

    // 注册成功：作废验证码记录
    clearVerification(email);

    // 自动登录（用邮箱登录，Go 登录服务同时支持 username / email）
    try {
      await userLoginViaGo(email, input.password);
    } catch (loginErr) {
      logger.error('邮箱注册后自动登录失败', loginErr, {
        email,
        action: 'registerWithEmail:autologin',
      });
      // 登录失败不影响注册结果，前端可再引导登录
    }

    return {
      success: true,
      message: 'Registration successful',
      user: { id: created.id, username: created.username },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error ?? '');
    if (msg.includes('已被占用') && /email|邮箱/i.test(msg)) {
      return { success: false, error: 'EMAIL_TAKEN' };
    }
    if (
      msg.includes('已被占用') ||
      /username.*(take|exist|duplicate)/i.test(msg)
    ) {
      return { success: false, error: 'USERNAME_TAKEN' };
    }
    if (/email.*(take|exist|duplicate)/i.test(msg)) {
      return { success: false, error: 'EMAIL_TAKEN' };
    }
    logger.error('registerWithEmail failed', error, {
      email,
      action: 'registerWithEmail',
    });
    return { success: false, error: 'REGISTER_FAILED' };
  }
}

export async function userLogout() {
  return userLogoutViaGo();
}

export async function checkUserLogin() {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not logged in' };
  }
  return {
    success: true,
    user: { id: user.id, username: user.username },
  };
}

/**
 * Google OAuth 登录：按与用户确认的 V2 方案，本轮直接停用（仅保留函数壳 + 明确报错）。
 * 避免老代码调用时出现奇怪错误。
 */
export async function userLoginWithGoogle(_redirectTo: string = '/chat') {
  return { success: false, error: 'Google login is disabled in this build.' };
}
