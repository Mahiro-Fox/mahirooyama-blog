import fs, { promises as fsPromises } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { UAParser } from 'ua-parser-js';
import { AnalyticsLog } from '@/actions/admin/analytics-actions';
import { ANALYTICS_DIR, ANALYTICS_RETENTION_DAYS } from '@/constant/dir';

/**
 * 严格判断是否为公网 IP（排除本地回环和私有局域网 IP）
 */
function isPublicIp(ip: string): boolean {
  if (!ip) return false;
  // 排除 IPv4 本地/局域网
  if (
    ip === '127.0.0.1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.')
  ) {
    return false;
  }
  // 排除 IPv6 本地回环
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return false;
  }
  return true;
}

function maskIpAddress(ip: string): string {
  if (!ip) return 'unknown';
  // 处理 IPv4 映射的 IPv6 地址 (如 ::ffff:192.168.1.100)
  const cleanIp = ip.replace(/^::ffff:/, '');
  const parts = cleanIp.split('.');
  if (parts.length === 4) {
    parts[3] = '*';
    return parts.join('.');
  }
  return ip;
}

/**
 * 根据日期获取日志文件路径
 */
function getLogFilePath(date: Date = new Date()): string {
  const dateStr = date.toISOString().split('T')[0];
  return path.join(ANALYTICS_DIR, `analytics-${dateStr}.json`);
}

/**
 * 内存中的临时队列
 */
const logQueue: AnalyticsLog[] = [];
let isWriting = false;

async function appendLogToFile(analyticsLog: AnalyticsLog) {
  // 1. 收到埋点，立刻塞入内存队列（速度极快，不占用请求时间）
  logQueue.push(analyticsLog);

  // 2. 触发消费队列的方法
  processQueue();
}

/**
 * 队列消费者（互斥锁机制）
 */
async function processQueue() {
  // 如果当前正有写入任务在执行，直接返回，静静等待上一个任务完成
  if (isWriting || logQueue.length === 0) return;

  isWriting = true; // 上锁

  try {
    await fsPromises.mkdir(ANALYTICS_DIR, { recursive: true });

    const currentBatch = logQueue.splice(0, logQueue.length);

    for (const log of currentBatch) {
      const filePath = getLogFilePath(new Date(log.timestamp));
      let logs: AnalyticsLog[] = [];

      try {
        const fileContent = await fsPromises.readFile(filePath, 'utf-8');
        logs = JSON.parse(fileContent);
        if (!Array.isArray(logs)) logs = [];
      } catch {
        logs = [];
      }

      logs.push(log);

      await fsPromises.writeFile(
        filePath,
        JSON.stringify(logs, null, 2),
        'utf-8'
      );
    }
  } catch (error) {
    console.error('[Analytics] 批量写入日志失败:', error);
  } finally {
    isWriting = false;

    if (logQueue.length > 0) {
      processQueue();
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, url, referrer, screen, properties, timestamp } = body;

    // 获取 IP
    const rawIp =
      request.headers.get('x-real-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0] || // 偶尔会有多个代理 IP，取第一个真实的
      '';

    const maskedIp = maskIpAddress(rawIp);

    // 地理位置解析
    let location = { country: 'unknown', region: 'unknown', city: 'unknown' };

    if (rawIp && isPublicIp(rawIp)) {
      try {
        // 请求免费的高速 IP 解析接口
        // ip-api.com 对非商业用途免费，且支持返回中英文
        const res = await fetch(`http://ip-api.com/json/${rawIp}?lang=zh-CN`, {
          next: { revalidate: 86400 }, // Next.js 缓存一天，避免重复请求相同 IP
        });

        if (res.ok) {
          const geo = await res.json();
          if (geo.status === 'success') {
            location = {
              country: geo.country || 'unknown',
              region: geo.regionName || 'unknown',
              city: geo.city || 'unknown',
            };
          }
        }
      } catch (e) {
        console.error('解析地理位置发生错误:', e);
      }
    }

    // UA 解析
    const userAgent = request.headers.get('user-agent') || '';
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();

    const deviceInfo = {
      browser: browser.name || 'unknown',
      os: os.name || 'unknown',
      isMobile: device.type === 'mobile' || /mobile/i.test(userAgent),
    };

    const analyticsLog: AnalyticsLog = {
      timestamp: timestamp || new Date().toISOString(),
      event,
      url,
      referrer,
      screen,
      properties: properties || {},
      location,
      device: deviceInfo,
      ip_masked: maskedIp,
    };

    // 使用 Next.js 推荐的 Edge 安全后台等待机制，防止进程提前休眠
    // 如果你的 Next.js 版本不支持，可以直接去掉包裹，直接 await appendLogToFile(logEntry);
    const anyProcess = process as any;
    if (typeof process !== 'undefined' && anyProcess.waitUntil) {
      anyProcess.waitUntil(appendLogToFile(analyticsLog));
    } else {
      // 降级策略：虽然会稍微占用一点该请求的响应时间(极短)，但绝对安全，不会丢数据
      await appendLogToFile(analyticsLog);
    }

    return NextResponse.json({ success: true, message: '埋点数据接收成功' });
  } catch (error) {
    console.error('处理埋点请求失败:', error);
    return NextResponse.json(
      { success: false, message: '处理埋点请求失败' },
      { status: 500 }
    );
  }
}

/**
 * GET 接口：读取日志并返回统计信息
 */
export async function GET() {
  try {
    if (!fs.existsSync(ANALYTICS_DIR)) {
      return NextResponse.json({
        logs: [],
        stats: {
          totalLogs: 0,
          totalFiles: 0,
          expiredFiles: 0,
          expiredLogsCount: 0,
          retentionDays: ANALYTICS_RETENTION_DAYS,
        },
      });
    }

    const files = await fsPromises.readdir(ANALYTICS_DIR);
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
        const content = await fsPromises.readFile(filePath, 'utf-8');
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

    return NextResponse.json({
      logs: allLogs,
      stats: {
        totalLogs: allLogs.length,
        totalFiles: logFiles.length,
        expiredFiles: expiredFiles.length,
        expiredLogsCount,
        retentionDays: ANALYTICS_RETENTION_DAYS,
      },
    });
  } catch (error) {
    console.error('读取日志文件失败:', error);
    return NextResponse.json(
      { success: false, message: '读取日志文件失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE 接口：删除过期的日志文件
 */
export async function DELETE() {
  try {
    if (!fs.existsSync(ANALYTICS_DIR)) {
      return NextResponse.json({
        success: true,
        message: '没有找到日志目录',
        deletedFiles: 0,
        deletedLogs: 0,
      });
    }

    const files = await fsPromises.readdir(ANALYTICS_DIR);
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
          const content = await fsPromises.readFile(filePath, 'utf-8');
          const logs: AnalyticsLog[] = JSON.parse(content);
          deletedLogs += logs.length;

          await fsPromises.unlink(filePath);
          deletedFiles++;
        } catch {
          continue;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `成功删除 ${deletedFiles} 个过期日志文件，共 ${deletedLogs} 条记录`,
      deletedFiles,
      deletedLogs,
    });
  } catch (error) {
    console.error('删除过期日志失败:', error);
    return NextResponse.json(
      { success: false, message: '删除过期日志失败' },
      { status: 500 }
    );
  }
}
