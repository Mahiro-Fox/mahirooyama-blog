/**
 * 前台用户（accounts）类型
 *
 * 数据由 Go 后端管理，本模块只声明形状，取数逻辑见 src/store/account-store.ts。
 */

type AccountProvider = 'credentials' | 'google';

interface Account {
  id: string;
  username: string;
  email: string | null;
  provider: AccountProvider;
  createdAt: string;
  lastUpdated: string;
}

interface CreateAccountRequest {
  username: string;
  password: string;
}

interface UpdateAccountRequest {
  username?: string;
  email?: string | null;
}

interface AccountResponse {
  id: string;
  username: string;
  email: string | null;
  provider: AccountProvider;
  createdAt: string;
  lastUpdated: string;
}
