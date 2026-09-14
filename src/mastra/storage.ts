import { PostgresStore } from '@mastra/pg';

// Mastra 记忆存储：PostgreSQL（取代原 LibSQL 文件，避免 /app/data 只读挂载问题）。
// 连接串解析策略：优先读 MASTRA_PG_URL（本地 .env 指向 127.0.0.1），
// 否则用 DB_* 组装（Docker 生产由 compose 显式注入 MASTRA_PG_URL）。
const resolveConnectionString = (): string =>
  process.env.MASTRA_PG_URL ??
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const assertDbConfig = (connectionString: string): void => {
  const hasParts = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'DB_NAME'].every(
    (key) => Boolean(process.env[key]),
  );
  if (!process.env.MASTRA_PG_URL && !hasParts) {
    throw new Error('缺少 Mastra 存储的 PostgreSQL 连接配置：请设置 MASTRA_PG_URL 或 DB_* 环境变量');
  }
  // 校验连接串结构，提前暴露拼写错误
  if (!/^postgres(ql)?:\/\//.test(connectionString)) {
    throw new Error(`Mastra 存储连接串格式非法: ${connectionString}`);
  }
};

const connectionString = resolveConnectionString();
assertDbConfig(connectionString);

// 按 resource(用户)+thread(会话) 隔离；Mastra 启动时自动建表（mastra_*）。
export const storage = new PostgresStore({
  id: 'mastra-pg-storage',
  connectionString,
});