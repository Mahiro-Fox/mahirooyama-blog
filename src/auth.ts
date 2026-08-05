import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { authConfig } from '@/auth.config';
import { createLogger } from '@/utils/logger';
import { accountStore } from '@/store/account-store';

const logger = createLogger('Auth');

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? '').trim();
        const password = String(credentials?.password ?? '');
        if (!username || !password) return null;

        // 限流在 userLogin server action 中做（需返回 resetTime 给 UI）
        const account = await accountStore.verifyPassword(username, password);
        if (!account) {
          // 抗时序攻击：与原 userLogin 一致加随机延迟
          await new Promise((r) => setTimeout(r, Math.random() * 100 + 50));
          return null;
        }

        return {
          id: account.id,
          accountId: account.id,
          username: account.username,
          email: account.email,
          provider: 'credentials' as const,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      // Credentials provider：authorize 已返回带 accountId 的 user
      if (account?.provider === 'credentials') {
        return true;
      }

      // Google provider：需要链接到 account.json
      if (account?.provider === 'google') {
        const email = String(profile?.email ?? user.email ?? '');
        if (!email) {
          logger.warn('Google sign-in without email', {
            providerAccountId: account.providerAccountId,
          });
          return false;
        }

        // 1. 按 email 查找既有 account.json 记录
        const existing = await accountStore.getByEmail(email);

        if (existing) {
          // 2a. 链接到既有记录（无论原 provider 是什么）
          (user as Record<string, unknown>).accountId = existing.id;
          (user as Record<string, unknown>).username = existing.username;
          (user as Record<string, unknown>).provider = existing.provider;
          user.email = existing.email;
          (user as Record<string, unknown>).id = existing.id;
          return true;
        }

        // 2b. 新建 account.json 记录
        const baseUsername = String(
          profile?.name ?? email.split('@')[0]
        );
        const username =
          await accountStore.generateUniqueUsername(baseUsername);
        const newAccount = await accountStore.createWithGoogle({
          email,
          username,
        });

        (user as Record<string, unknown>).accountId = newAccount.id;
        (user as Record<string, unknown>).username = newAccount.username;
        (user as Record<string, unknown>).provider = newAccount.provider;
        user.email = newAccount.email;
        (user as Record<string, unknown>).id = newAccount.id;
        return true;
      }

      return true;
    },
  },
});
