import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { LibSQLStore } from '@mastra/libsql';

// LibSQL 文件存储单例：按 resource(用户)+thread(会话) 隔离，跨进程重启保留。
// 数据落在 data/mastra/memory.db（归属 AI 记忆数据，版本/迁移时需排除覆盖）。
const MEMORY_DIR = path.join(process.cwd(), 'data', 'mastra');
mkdirSync(MEMORY_DIR, { recursive: true });

export const storage = new LibSQLStore({
  id: 'mastra-poc-storage',
  url: `file:${path.join(MEMORY_DIR, 'memory.db')}`,
});