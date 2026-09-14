import { PostgresStore } from '@mastra/pg';

// Mastra 记忆存储：PostgreSQL（取代原 LibSQL 文件，避免 /app/data 只读挂载问题）。
// 连接串解析策略：优先读 MASTRA_PG_URL，否则用 DB_* 组装。

// 注意：实例化必须惰性化到首个运行时调用（getStorage）。因为 next build(standalone)
// 会在构建期执行 server 模块顶层，而构建期不会注入运行时环境变量；若在顶层构造
// PostgresStore 或抛错，会导致构建失败，且顶层固化连接值后运行时注入 env 也无效。
const resolveConnectionString = (): string =>
  process.env.MASTRA_PG_URL ??
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

let storageInstance: PostgresStore | undefined;

// 运行时惰性单例：首次调用时读取 process.env（此时容器已注入 MASTRA_PG_URL / DB_*）
const getStorage = (): PostgresStore => {
  if (storageInstance) return storageInstance;
  const connectionString = resolveConnectionString();
  if (!/^postgres(ql)?:\/\//.test(connectionString)) {
    throw new Error('缺少 Mastra 存储的 PostgreSQL 连接配置：请设置 MASTRA_PG_URL 或 DB_* 环境变量');
  }
  storageInstance = new PostgresStore({
    id: 'mastra-pg-storage',
    connectionString,
  });
  return storageInstance;
};

export { getStorage };