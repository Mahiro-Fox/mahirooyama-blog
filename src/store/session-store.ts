// 简单的内存会话存储（生产环境建议使用 Redis）
interface SessionInfo {
  userId: string;
  sessionId: string;
  createdAt: string;
  lastUsedAt: string;
  userAgent?: string;
  ip?: string;
}

const sessions: Map<string, SessionInfo> = new Map();

// 清理过期会话（24小时无活动）
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24小时

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    const lastUsed = new Date(session.lastUsedAt).getTime();
    if (now - lastUsed > SESSION_MAX_AGE) {
      sessions.delete(token);
    }
  }
}

// 每10分钟清理一次
setInterval(cleanupExpiredSessions, 10 * 60 * 1000);

export const sessionStore = {
  // 创建新会话，使旧会话失效（单设备登录）
  create: (
    token: string,
    sessionInfo: Omit<SessionInfo, 'createdAt' | 'lastUsedAt'>
  ): void => {
    sessions.set(token, {
      ...sessionInfo,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    });
  },

  // 根据用户ID删除会话（单设备登录：新登录使旧会话失效）
  deleteByUserId: (userId: string): void => {
    for (const [token, session] of sessions.entries()) {
      if (session.userId === userId) {
        sessions.delete(token);
      }
    }
  },

  // 更新会话最后使用时间
  update: (token: string): boolean => {
    const session = sessions.get(token);
    if (!session) return false;

    session.lastUsedAt = new Date().toISOString();
    sessions.set(token, session);
    return true;
  },

  // 删除会话（登出）
  delete: (token: string): void => {
    sessions.delete(token);
  },

  // 验证会话是否存在
  exists: (token: string): boolean => {
    return sessions.has(token);
  },

  // 获取所有会话（调试用）
  getAll: (): Map<string, SessionInfo> => {
    return new Map(sessions);
  },

  // 根据用户ID获取会话
  getByUserId: (userId: string): SessionInfo | undefined => {
    for (const [, session] of sessions.entries()) {
      if (session.userId === userId) {
        return session;
      }
    }
    return undefined;
  },
};
