'use client';

import type { UIMessage } from 'ai';

export interface StoredConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: UIMessage[];
}

export interface StoredConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

const STORAGE_KEY = 'chat:conversations';

function readAll(): Record<string, StoredConversation> {
  if (typeof window === 'undefined') return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, StoredConversation>): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or other error - silently ignore
  }
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

export const conversationLocalStorage = {
  create(): StoredConversation {
    const now = new Date().toISOString();
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const conversation: StoredConversation = {
      id,
      title: '新对话',
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    const all = readAll();
    all[id] = conversation;
    writeAll(all);

    return conversation;
  },

  get(conversationId: string): StoredConversation | null {
    const all = readAll();
    return all[conversationId] || null;
  },

  list(): StoredConversationSummary[] {
    const all = readAll();
    return Object.values(all)
      .map((c) => ({
        id: c.id,
        title: c.title,
        updatedAt: c.updatedAt,
      }))
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  },

  saveMessages(
    conversationId: string,
    messages: UIMessage[]
  ): StoredConversation {
    const all = readAll();
    const existing = all[conversationId];
    const now = new Date().toISOString();

    const conversation: StoredConversation = existing
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
          title: deriveTitle(messages),
          createdAt: now,
          updatedAt: now,
          messages,
        };

    all[conversationId] = conversation;
    writeAll(all);

    return conversation;
  },

  delete(conversationId: string): void {
    const all = readAll();
    delete all[conversationId];
    writeAll(all);
  },

  updateTitle(conversationId: string, title: string): void {
    const all = readAll();
    const existing = all[conversationId];
    if (!existing) return;

    all[conversationId] = {
      ...existing,
      title,
      updatedAt: new Date().toISOString(),
    };
    writeAll(all);
  },
};
