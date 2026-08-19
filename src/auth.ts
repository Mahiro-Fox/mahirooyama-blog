/**
 * 已停用 next-auth：登录逻辑已迁移到 Go 后端 JWT + PostgreSQL（admin_sessions / user_sessions）。
 *
 * 本文件不再导出任何有意义的实现。历史遗留的引用链会导致 route handler 与 import 失败，
 * 因此保留兼容 stub：handlers.GET/POST 返回 410 Gone，auth() 返回 null，
 * signIn/signOut 直接抛「已停用」错误。这样即便老 import 路径被用到，也能稳定 fail-fast。
 */

export const handlers = {
  GET: async () =>
    new Response('next-auth route disabled', {
      status: 410,
      statusText: 'Gone',
    }),
  POST: async () =>
    new Response('next-auth route disabled', {
      status: 410,
      statusText: 'Gone',
    }),
};

export async function auth() {
  return null;
}

export async function signIn(
  _provider?: string,
  _options?: { redirectTo?: string; redirect?: boolean; [key: string]: unknown }
) {
  throw new Error('signIn disabled: login has been migrated to Go backend');
}

export async function signOut(_options?: { redirect?: boolean; redirectTo?: string }) {
  throw new Error('signOut disabled: logout has been migrated to Go backend');
}
