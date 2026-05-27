'use server';

import fs from 'fs/promises';
import { ANALYTICS_LOGS_FILE } from '@/constant/dir';
import { ensureFileInitialized } from '@/utils/file-utils';

import { requirePermission } from '@/lib/permissions';

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

export async function adminGetAnalyticsLogs(): Promise<
  | {
      success: true;
      logs: AnalyticsLog[];
    }
  | {
      success: false;
      error: string;
    }
> {
  const permissionCheck = await requirePermission('analytics:read');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    await ensureFileInitialized(ANALYTICS_LOGS_FILE);
    const content = await fs.readFile(ANALYTICS_LOGS_FILE, 'utf-8');
    let logs: AnalyticsLog[] = [];

    if (content.trim()) {
      try {
        const parsed = JSON.parse(content);
        logs = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        logs = [];
      }
    }

    logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return { success: true, logs };
  } catch (error) {
    console.error('获取访问日志失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '读取日志失败',
    };
  }
}
