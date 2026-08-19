/**
 * 历史遗留：auth.config.ts 原本给 next-auth / proxy 提供 edge 配置。
 * 迁移到 Go JWT + PG 会话后不再需要 next-auth，这里只保留空对象防止老 import 报错。
 */
export const authConfig: {
  pages?: { signIn?: string };
  providers?: unknown[];
  session?: { strategy?: string; maxAge?: number };
  trustHost?: boolean;
  callbacks?: Record<string, unknown>;
} = {};
