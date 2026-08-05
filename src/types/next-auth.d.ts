import type { AccountProvider } from '@/store/account-store';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string; // account.json 的 id
      username: string;
      email: string | null;
      provider: AccountProvider;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    accountId?: string;
    username?: string;
    provider?: AccountProvider;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accountId?: string;
    username?: string;
    email?: string | null;
    provider?: AccountProvider;
  }
}
