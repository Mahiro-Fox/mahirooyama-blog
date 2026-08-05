import crypto from 'crypto';
import fs from 'fs/promises';
import { ACCOUNTS_FILE, DATA_DIR } from '@/constant/dir';
import bcrypt from 'bcryptjs';
import {
  ensureDirectory,
  ensureFileInitialized,
  writeFileAtomic,
} from '@/utils/file-utils';

export type AccountProvider = 'credentials' | 'google';

export interface Account {
  id: string;
  username: string;
  passwordHash: string | null; // null = OAuth 用户
  email: string | null; // null = 纯账号密码注册用户
  provider: AccountProvider;
  createdAt: string;
}

export interface CreateAccountRequest {
  username: string;
  password: string;
}

export interface CreateOAuthAccountRequest {
  email: string;
  username: string;
}

export interface AccountResponse {
  id: string;
  username: string;
  email: string | null;
  provider: AccountProvider;
  createdAt: string;
}

async function ensureDataFile(): Promise<void> {
  await ensureDirectory(DATA_DIR);
  await ensureFileInitialized(ACCOUNTS_FILE, '[]');
}

/**
 * 归一化账户记录，向后兼容老数据（无 email/provider 字段）
 */
function normalizeAccount(raw: Partial<Account>): Account {
  return {
    id: String(raw.id ?? ''),
    username: String(raw.username ?? ''),
    passwordHash: raw.passwordHash ?? null,
    email: raw.email ?? null,
    provider: raw.provider ?? 'credentials',
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
  };
}

async function readAccounts(): Promise<Account[]> {
  await ensureDataFile();
  const data = await fs.readFile(ACCOUNTS_FILE, 'utf-8');
  const raw = JSON.parse(data) as Partial<Account>[];
  return raw.map(normalizeAccount);
}

// === 进程内并发写锁（per-file mutex） ===
interface LockEntry {
  promise: Promise<void>;
  token: symbol;
}

const writeLocks = new Map<string, LockEntry>();

async function withAccountsLock<T>(fn: () => Promise<T>): Promise<T> {
  const lockKey = ACCOUNTS_FILE;
  const existing = writeLocks.get(lockKey);

  if (existing) {
    await existing.promise;
  }

  const entry: LockEntry = {
    promise: Promise.resolve(),
    token: Symbol('accounts-lock'),
  };

  const taskPromise = (async () => {
    try {
      return await fn();
    } finally {
      if (writeLocks.get(lockKey)?.token === entry.token) {
        writeLocks.delete(lockKey);
      }
    }
  })();

  entry.promise = taskPromise.then(
    () => undefined,
    () => undefined
  );
  writeLocks.set(lockKey, entry);
  return taskPromise;
}

async function writeAccounts(accounts: Account[]): Promise<void> {
  await writeFileAtomic(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), {
    encoding: 'utf-8',
  });
}

function toResponse(account: Account): AccountResponse {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...response } = account;
  return response;
}

export const accountStore = {
  async getById(id: string): Promise<Account | null> {
    const accounts = await readAccounts();
    return accounts.find((a) => a.id === id) || null;
  },

  async getByUsername(username: string): Promise<Account | null> {
    const accounts = await readAccounts();
    return accounts.find((a) => a.username === username) || null;
  },

  async getByEmail(email: string): Promise<Account | null> {
    const accounts = await readAccounts();
    const lower = email.toLowerCase();
    return accounts.find((a) => a.email?.toLowerCase() === lower) || null;
  },

  async verifyPassword(
    username: string,
    password: string
  ): Promise<Account | null> {
    const account = await this.getByUsername(username);
    if (!account || !account.passwordHash) return null;

    const isValid = await bcrypt.compare(password, account.passwordHash);
    return isValid ? account : null;
  },

  /**
   * 生成唯一的用户名（用于 OAuth 用户），碰撞时追加 -2, -3...
   */
  async generateUniqueUsername(base: string): Promise<string> {
    const cleaned =
      base
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 20) || 'user';

    const accounts = await readAccounts();
    const existing = new Set(accounts.map((a) => a.username.toLowerCase()));

    if (!existing.has(cleaned)) return cleaned;

    for (let i = 2; i < 1000; i++) {
      const candidate = `${cleaned}-${i}`;
      if (!existing.has(candidate)) return candidate;
    }
    return `${cleaned}-${crypto.randomUUID().slice(0, 8)}`;
  },

  async create(request: CreateAccountRequest): Promise<AccountResponse> {
    return withAccountsLock(async () => {
      const accounts = await readAccounts();

      if (accounts.some((a) => a.username === request.username)) {
        throw new Error('Username already exists');
      }

      const newAccount: Account = {
        id: crypto.randomUUID(),
        username: request.username,
        passwordHash: await bcrypt.hash(request.password, 10),
        email: null,
        provider: 'credentials',
        createdAt: new Date().toISOString(),
      };

      accounts.push(newAccount);
      await writeAccounts(accounts);

      return toResponse(newAccount);
    });
  },

  /**
   * 创建 Google OAuth 账号（无密码）
   */
  async createWithGoogle(
    params: CreateOAuthAccountRequest
  ): Promise<Account> {
    return withAccountsLock(async () => {
      const accounts = await readAccounts();

      // 双重检查：email 不重复（防并发）
      const lowerEmail = params.email.toLowerCase();
      const existing = accounts.find(
        (a) => a.email?.toLowerCase() === lowerEmail
      );
      if (existing) return existing;

      // username 不重复
      let finalUsername = params.username;
      if (accounts.some((a) => a.username === params.username)) {
        const existingNames = new Set(
          accounts.map((a) => a.username.toLowerCase())
        );
        for (let i = 2; i < 1000; i++) {
          const candidate = `${params.username}-${i}`;
          if (!existingNames.has(candidate.toLowerCase())) {
            finalUsername = candidate;
            break;
          }
        }
      }

      const newAccount: Account = {
        id: crypto.randomUUID(),
        username: finalUsername,
        passwordHash: null,
        email: params.email,
        provider: 'google',
        createdAt: new Date().toISOString(),
      };

      accounts.push(newAccount);
      await writeAccounts(accounts);
      return newAccount;
    });
  },
};
