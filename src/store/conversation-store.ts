import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { UIMessage } from 'ai';
import { CONVERSATIONS_DIR } from '@/constant/dir';
import {
  ensureDirectory,
  isFileNotFoundError,
  isPathSafe,
  writeFileAtomic,
} from '@/utils/file-utils';

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: UIMessage[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_V4_REGEX.test(value);
}

function validateIds(userId: string, conversationId?: string): void {
  if (!isValidUUID(userId)) {
    throw new Error('Invalid userId format');
  }
  if (conversationId && !isValidUUID(conversationId)) {
    throw new Error('Invalid conversationId format');
  }
}

function getUserDir(userId: string): string {
  return path.join(CONVERSATIONS_DIR, userId);
}

function getConversationPath(userId: string, conversationId: string): string {
  const userDir = getUserDir(userId);
  const filePath = path.join(userDir, `${conversationId}.json`);

  if (!isPathSafe(filePath, CONVERSATIONS_DIR)) {
    throw new Error('Invalid path: path traversal detected');
  }

  return filePath;
}

interface LockEntry {
  promise: Promise<void>;
  token: symbol;
}

const writeLocks = new Map<string, LockEntry>();

async function withWriteLock(
  filePath: string,
  fn: () => Promise<void>
): Promise<void> {
  const lockKey = filePath;
  const existing = writeLocks.get(lockKey);

  if (existing) {
    await existing.promise;
  }

  const entry: LockEntry = {
    promise: Promise.resolve(),
    token: Symbol('lock'),
  };

  const taskPromise = (async () => {
    try {
      await fn();
    } finally {
      if (writeLocks.get(lockKey)?.token === entry.token) {
        writeLocks.delete(lockKey);
      }
    }
  })();

  entry.promise = taskPromise;
  writeLocks.set(lockKey, entry);
  await taskPromise;
}

function deriveTitle(messages: UIMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (!firstUserMessage?.parts) return '新对话';

  for (const part of firstUserMessage.parts) {
    if (part.type === 'text' && part.text) {
      const trimmed = part.text.trim();
      return trimmed.length > 30 ? trimmed.slice(0, 30) + '...' : trimmed;
    }
  }

  return '新对话';
}

export const conversationStore = {
  async create(userId: string): Promise<Conversation> {
    validateIds(userId);

    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      userId,
      title: '新对话',
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    const filePath = getConversationPath(userId, conversation.id);
    await withWriteLock(filePath, async () => {
      await ensureDirectory(path.dirname(filePath));
      await writeFileAtomic(filePath, JSON.stringify(conversation, null, 2), {
        encoding: 'utf-8',
      });
    });

    return conversation;
  },

  async get(
    userId: string,
    conversationId: string
  ): Promise<Conversation | null> {
    validateIds(userId, conversationId);

    const filePath = getConversationPath(userId, conversationId);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as Conversation;
    } catch (error) {
      // 如果是文件不存在的其他错误，返回null
      if (isFileNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  },

  async listByUser(userId: string): Promise<ConversationSummary[]> {
    validateIds(userId);

    const userDir = getUserDir(userId);

    try {
      await fs.access(userDir);
    } catch {
      return [];
    }

    const files = await fs.readdir(userDir);
    const summaries: ConversationSummary[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const filePath = path.join(userDir, file);
        const data = await fs.readFile(filePath, 'utf-8');
        const conv = JSON.parse(data) as Conversation;
        summaries.push({
          id: conv.id,
          title: conv.title,
          updatedAt: conv.updatedAt,
        });
      } catch {
        // Skip corrupted files
      }
    }

    return summaries.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  async saveMessages(
    userId: string,
    conversationId: string,
    messages: UIMessage[]
  ): Promise<void> {
    validateIds(userId, conversationId);

    const filePath = getConversationPath(userId, conversationId);

    await withWriteLock(filePath, async () => {
      let existing: Conversation | null = null;
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        existing = JSON.parse(data) as Conversation;
      } catch (error) {
        // 如果是除文件不存在的其他错误，抛出error
        if (!isFileNotFoundError(error)) {
          throw error;
        }
      }

      const now = new Date().toISOString();
      const conversation: Conversation = existing
        ? {
            ...existing,
            messages,
            title:
              existing.title === '新对话'
                ? deriveTitle(messages)
                : existing.title,
            updatedAt: now,
          }
        : {
            id: conversationId,
            userId,
            title: deriveTitle(messages),
            createdAt: now,
            updatedAt: now,
            messages,
          };

      await writeFileAtomic(filePath, JSON.stringify(conversation, null, 2), {
        encoding: 'utf-8',
      });
    });
  },

  async delete(userId: string, conversationId: string): Promise<void> {
    validateIds(userId, conversationId);

    const filePath = getConversationPath(userId, conversationId);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      // 如果是除文件不存在的其他错误，抛出error
      if (!isFileNotFoundError(error)) {
        throw error;
      }
    }
  },

  async updateTitle(
    userId: string,
    conversationId: string,
    title: string
  ): Promise<void> {
    validateIds(userId, conversationId);

    const filePath = getConversationPath(userId, conversationId);

    await withWriteLock(filePath, async () => {
      const data = await fs.readFile(filePath, 'utf-8');
      const conv = JSON.parse(data) as Conversation;
      conv.title = title;
      conv.updatedAt = new Date().toISOString();
      await writeFileAtomic(filePath, JSON.stringify(conv, null, 2), {
        encoding: 'utf-8',
      });
    });
  },
};
