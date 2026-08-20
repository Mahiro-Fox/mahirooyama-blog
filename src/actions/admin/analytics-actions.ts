'use server';

import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { createLogger } from '@/utils/logger';
import { goFetch } from '@/lib/server/api-client';

const logger = createLogger('AnalyticsActions');

export interface AnalyticsLog {
  timestamp: string;
  event: string;
  url: string;
  referrer: string;
  screen: string;
  properties: Record<string, unknown>;
  location: {
    country: string;
    region: string;
    city: string;
  };
  device: {
    browser: string;
    os: string;
    isMobile: boolean;
  };
  ip_masked: string;
}

export interface AnalyticsStats {
  totalLogs: number;
  totalFiles: number;
  expiredFiles: number;
  expiredLogsCount: number;
  retentionDays: number;
}

/**
 * 读取访问日志 + 统计（数据已迁移到 Go/PostgreSQL）
 */
export async function adminGetAnalyticsLogs(): Promise<
  ActionResponse<{
    logs: AnalyticsLog[];
    stats: AnalyticsStats;
  }>
> {
  return withActionPermission('analytics:read', async () => {
    try {
      const data = await goFetch<{ logs: AnalyticsLog[]; stats: AnalyticsStats }>(
        '/api/admin/analytics'
      );
      return { success: true, data };
    } catch (error) {
      logger.error('获取访问日志失败', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '读取日志失败',
      };
    }
  });
}

/**
 * 删除过期的分析日志
 */
export async function deleteExpiredAnalyticsLogs(): Promise<
  ActionResponse<{
    deletedFiles: number;
    deletedLogs: number;
  }>
> {
  return withActionPermission('analytics:delete', async () => {
    try {
      const data = await goFetch<{
        deletedFiles: number;
        deletedLogs: number;
        message?: string;
      }>('/api/admin/analytics', { method: 'DELETE' });

      const message = data?.message ?? `成功删除 ${data?.deletedLogs ?? 0} 条过期记录`;
      logger.info(message);
      return {
        success: true,
        message,
        data: {
          deletedFiles: data?.deletedFiles ?? 0,
          deletedLogs: data?.deletedLogs ?? 0,
        },
      };
    } catch (error) {
      logger.error('删除过期日志失败', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
      };
    }
  });
}