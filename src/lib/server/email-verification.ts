/**
 * 邮箱验证码服务（进程内存存储）
 *
 * 采用纯函数式写法：所有状态集中在模块级 Map，通过导出函数读写，
 * 不使用 class / 面向对象。
 *
 * 规则（与用户确认）：
 * - 6 位数字验证码
 * - 10 分钟有效
 * - 最多 5 次校验，超过后该码作废（需重新获取）
 * - 60s 内不可重发（重发节流，节流时间戳跨验证码复用）
 */

import { randomInt } from 'node:crypto';

export const CODE_TTL_MINUTES = 10; // 10 分钟有效
const CODE_TTL_MS = CODE_TTL_MINUTES * 60 * 1000;
const RESEND_INTERVAL_MS = 60 * 1000; // 60s 重发节流
const MAX_ATTEMPTS = 5; // 最多校验 5 次
const CODE_LENGTH = 6;

interface VerificationRecord {
  code: string;
  expiresAt: number; // 过期时间戳
  attempts: number; // 已校验次数
  verified: boolean; // 是否已通过校验（供注册阶段一次性换取）
  lastSentAt: number; // 上次发送时间戳，用于重发节流（跨验证码复用）
}

// email（小写归一化）-> 验证记录
const store = new Map<string, VerificationRecord>();

/** 归一化邮箱：去空格 + 转小写，作为存储键 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** 清理已过期记录，避免内存无限增长 */
function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, rec] of store) {
    // 记录已过期且距上次发送超过节流窗口，即可回收
    if (rec.expiresAt < now && now - rec.lastSentAt > RESEND_INTERVAL_MS) {
      store.delete(key);
    }
  }
}

// 每 5 分钟清理一次（与 rate-limit 保持一致的做法）
setInterval(cleanupExpired, 5 * 60 * 1000);

/** 生成 6 位数字验证码（密码学安全随机，补齐前导零） */
export function generateCode(): string {
  return randomInt(0, 10 ** CODE_LENGTH)
    .toString()
    .padStart(CODE_LENGTH, '0');
}

export type IssueCodeResult =
  | { ok: true; code: string }
  | { ok: false; error: 'RESEND_TOO_SOON'; retryAfterMs: number };

/**
 * 生成并写入验证码。
 * 若距上次发送不足 60s，拒绝并返回剩余等待时间（retryAfterMs）。
 * 复用旧记录的 lastSentAt，保证节流窗口不会因重新生成而重置。
 */
export function issueVerificationCode(email: string): IssueCodeResult {
  const key = normalizeEmail(email);
  const now = Date.now();
  const existing = store.get(key);

  if (existing && now - existing.lastSentAt < RESEND_INTERVAL_MS) {
    return {
      ok: false,
      error: 'RESEND_TOO_SOON',
      retryAfterMs: RESEND_INTERVAL_MS - (now - existing.lastSentAt),
    };
  }

  const code = generateCode();
  store.set(key, {
    code,
    expiresAt: now + CODE_TTL_MS,
    attempts: 0,
    verified: false,
    lastSentAt: now,
  });
  return { ok: true, code };
}

export type CheckCodeResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | 'CODE_NOT_FOUND'
        | 'CODE_EXPIRED'
        | 'CODE_MISMATCH'
        | 'TOO_MANY_ATTEMPTS';
      remainingAttempts?: number;
    };

/**
 * 校验验证码。
 * 成功后置 verified=true（不删除记录，供注册阶段换取）。
 * 校验失败累加 attempts；达到上限后该码永久失效，需重新获取。
 */
export function checkVerificationCode(
  email: string,
  code: string
): CheckCodeResult {
  const key = normalizeEmail(email);
  const now = Date.now();
  const rec = store.get(key);

  if (!rec) {
    return { ok: false, error: 'CODE_NOT_FOUND' };
  }
  if (rec.expiresAt < now) {
    store.delete(key);
    return { ok: false, error: 'CODE_EXPIRED' };
  }
  if (rec.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: 'TOO_MANY_ATTEMPTS' };
  }

  if (rec.code !== code.trim()) {
    const attempts = rec.attempts + 1;
    store.set(key, { ...rec, attempts });
    if (attempts >= MAX_ATTEMPTS) {
      return { ok: false, error: 'TOO_MANY_ATTEMPTS' };
    }
    return {
      ok: false,
      error: 'CODE_MISMATCH',
      remainingAttempts: MAX_ATTEMPTS - attempts,
    };
  }

  store.set(key, { ...rec, verified: true });
  return { ok: true };
}

/**
 * 是否已通过校验且未过期（不删除记录）。
 * 注册阶段先查询，账户创建成功后再调用 clearVerification 作废，
 * 避免用户名被占用等中途失败时白白消耗掉用户的验证结果。
 */
export function isVerified(email: string): boolean {
  const rec = store.get(normalizeEmail(email));
  return Boolean(rec && rec.verified && rec.expiresAt >= Date.now());
}

/** 主动清除某邮箱的验证记录（如注册失败回滚） */
export function clearVerification(email: string): void {
  store.delete(normalizeEmail(email));
}
