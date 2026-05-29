'use server';

import fs from 'fs/promises';
import path from 'path';
import { ANALYTICS_DIR, ANALYTICS_RETENTION_DAYS } from '@/constant/dir';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { createLogger } from '@/utils/logger';

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

export async function adminGetAnalyticsLogs(): Promise<
  ActionResponse<{
    logs: AnalyticsLog[];
    stats: AnalyticsStats;
  }>
> {
  return withActionPermission('analytics:read', async () => {
    try {
      try {
        await fs.access(ANALYTICS_DIR);
      } catch {
        return {
          success: true,
          data: {
            logs: [],
            stats: {
              totalLogs: 0,
              totalFiles: 0,
              expiredFiles: 0,
              expiredLogsCount: 0,
              retentionDays: ANALYTICS_RETENTION_DAYS,
            },
          },
        };
      }

      const files = await fs.readdir(ANALYTICS_DIR);
      const logFiles = files
        .filter((f) => f.startsWith('analytics-') && f.endsWith('.json'))
        .sort()
        .reverse();

      let allLogs: AnalyticsLog[] = [];
      let expiredLogsCount = 0;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - ANALYTICS_RETENTION_DAYS);

      for (const file of logFiles) {
        const filePath = path.join(ANALYTICS_DIR, file);
        const fileDateStr = file.replace('analytics-', '').replace('.json', '');
        const fileDate = new Date(fileDateStr);
        const isExpired = fileDate < cutoffDate;

        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const logs: AnalyticsLog[] = JSON.parse(content);

          if (isExpired) {
            expiredLogsCount += logs.length;
          } else {
            allLogs = [...allLogs, ...logs];
          }
        } catch {
          continue;
        }
      }

      allLogs.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const expiredFiles = logFiles.filter((f) => {
        const dateStr = f.replace('analytics-', '').replace('.json', '');
        return new Date(dateStr) < cutoffDate;
      });

      return {
        success: true,
        data: {
          logs: allLogs,
          stats: {
            totalLogs: allLogs.length,
            totalFiles: logFiles.length,
            expiredFiles: expiredFiles.length,
            expiredLogsCount,
            retentionDays: ANALYTICS_RETENTION_DAYS,
          },
        },
      };
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
      try {
        await fs.access(ANALYTICS_DIR);
      } catch {
        return {
          success: true,
          message: '没有找到日志目录',
          data: {
            deletedFiles: 0,
            deletedLogs: 0,
          },
        };
      }

      const files = await fs.readdir(ANALYTICS_DIR);
      const logFiles = files.filter(
        (f) => f.startsWith('analytics-') && f.endsWith('.json')
      );

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - ANALYTICS_RETENTION_DAYS);

      let deletedFiles = 0;
      let deletedLogs = 0;

      for (const file of logFiles) {
        const dateStr = file.replace('analytics-', '').replace('.json', '');
        const fileDate = new Date(dateStr);

        if (fileDate < cutoffDate) {
          const filePath = path.join(ANALYTICS_DIR, file);

          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const logs: AnalyticsLog[] = JSON.parse(content);
            deletedLogs += logs.length;

            await fs.unlink(filePath);
            deletedFiles++;
          } catch {
            continue;
          }
        }
      }

      const message = `成功删除 ${deletedFiles} 个过期日志文件，共 ${deletedLogs} 条记录`;
      logger.info(message);
      return {
        success: true,
        message,
        data: {
          deletedFiles,
          deletedLogs,
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
