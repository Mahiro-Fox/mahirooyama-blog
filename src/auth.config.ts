import type { AccountProvider } from '@/store/account-store';
import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

/**
 * Edge-safe / proxy-safe 配置。
 * - 不含 Credentials provider 的 authorize（避免 bcrypt 进 proxy bundle）
 * - 不含 signIn callback（避免文件系统操作进 proxy bundle）
 * - jwt / session callbacks 只读 token，不碰 DB/FS
 */
export const authConfig = {
  pages: {
    signIn: '/signin',
  },
  providers: [Google],
  session: {
    strategy: 'jwt' as const,
    maxAge: 24 * 60 * 60, // 24h，与原 SESSION_EXPIRY 一致
  },
  trustHost: !!process.env.AUTH_TRUST_HOST,
  callbacks: {
    async jwt({ token, user }) {
      // 首次登录时 user 存在（由 signIn callback 或 authorize 注入 accountId/username/provider）
      if (user) {
        const u = user as {
          accountId?: string;
          username?: string;
          provider?: AccountProvider;
          email?: string | null;
        };
        token.accountId = u.accountId;
        token.username = u.username;
        token.provider = u.provider;
        token.email = u.email ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // 通过 unknown 断言绕过 AdapterUser.email: string 与我们的 email: string | null 的交集问题
        const user = session.user as unknown as {
          id: string;
          username: string;
          email: string | null;
          provider: AccountProvider;
        };
        user.id = token.accountId as string; // account.json id，不是 Google sub
        user.username = token.username as string;
        user.email = (token.email as string | null) ?? null;
        user.provider = token.provider as AccountProvider;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
