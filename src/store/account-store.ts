import crypto from 'crypto';
import fs from 'fs/promises';
import { ACCOUNTS_FILE, DATA_DIR } from '@/constant/dir';
import bcrypt from 'bcryptjs';
import {
  ensureDirectory,
  ensureFileInitialized,
  writeFileAtomic,
} from '@/utils/file-utils';

export interface Account {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface CreateAccountRequest {
  username: string;
  password: string;
}

export interface AccountResponse {
  id: string;
  username: string;
  createdAt: string;
}

async function ensureDataFile(): Promise<void> {
  await ensureDirectory(DATA_DIR);
  await ensureFileInitialized(ACCOUNTS_FILE, '[]');
}

async function readAccounts(): Promise<Account[]> {
  await ensureDataFile();
  const data = await fs.readFile(ACCOUNTS_FILE, 'utf-8');
  return JSON.parse(data);
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

  async verifyPassword(
    username: string,
    password: string
  ): Promise<Account | null> {
    const account = await this.getByUsername(username);
    if (!account) return null;

    const isValid = await bcrypt.compare(password, account.passwordHash);
    return isValid ? account : null;
  },

  async create(request: CreateAccountRequest): Promise<AccountResponse> {
    const accounts = await readAccounts();

    if (accounts.some((a) => a.username === request.username)) {
      throw new Error('Username already exists');
    }

    const newAccount: Account = {
      id: crypto.randomUUID(),
      username: request.username,
      passwordHash: await bcrypt.hash(request.password, 10),
      createdAt: new Date().toISOString(),
    };

    accounts.push(newAccount);
    await writeAccounts(accounts);

    return toResponse(newAccount);
  },
};
