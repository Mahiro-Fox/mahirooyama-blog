import fs, { promises as fsPromises } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsLog } from '@/actions/admin/analytics-actions';
import { ANALYTICS_LOGS_FILE } from '@/constant';
import { UAParser } from 'ua-parser-js';

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
// 内存中的临时队列
const logQueue: AnalyticsLog[] = [];
let isWriting = false; // 写入锁状态

async function appendLogToFile(analyticsLog: AnalyticsLog) {
  // 1. 收到埋点，立刻塞入内存队列（速度极快，不占用请求时间）
  logQueue.push(analyticsLog);

  // 2. 触发消费队列的方法
  processQueue();
}

/**
 * 队列消费者（互斥锁机制，保证同一时间只有一个文件读写在进行）
 */
async function processQueue() {
  // 如果当前正有写入任务在执行，直接返回，静静等待上一个任务完成
  if (isWriting || logQueue.length === 0) return;

  isWriting = true; // 上锁

  try {
    const dir = path.dirname(ANALYTICS_LOGS_FILE);
    await fsPromises.mkdir(dir, { recursive: true });

    // 一次性取出当前队列里的所有数据，清空队列
    // 这样哪怕并发再高，也是批量写入，极大地减少了磁盘 I/O 次数
    const currentBatch = logQueue.splice(0, logQueue.length);

    let logs: AnalyticsLog[] = [];
    try {
      const fileContent = await fsPromises.readFile(
        ANALYTICS_LOGS_FILE,
        'utf-8'
      );
      logs = JSON.parse(fileContent);
      if (!Array.isArray(logs)) logs = [];
    } catch {
      // 文件不存在或解析失败，直接走空数组
      logs = [];
    }

    // 将这一批数据合并进去
    logs.push(...currentBatch);

    // 重新写回文件
    await fsPromises.writeFile(
      ANALYTICS_LOGS_FILE,
      JSON.stringify(logs, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('[Analytics] 批量写入日志失败:', error);
  } finally {
    isWriting = false; // 释放锁

    // 关键：写入结束后，检查在写入期间有没有新进来的埋点，如果有，继续消费
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
 * GET 接口读取日志
 */
export async function GET() {
  try {
    if (!fs.existsSync(ANALYTICS_LOGS_FILE)) {
      return NextResponse.json({ logs: [] });
    }

    const fileContent = await fs.promises.readFile(
      ANALYTICS_LOGS_FILE,
      'utf-8'
    );

    const logs: AnalyticsLog[] = JSON.parse(fileContent);
    if (!Array.isArray(logs)) {
      return NextResponse.json({ logs: [] });
    }

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('读取日志文件失败:', error);
    return NextResponse.json(
      { success: false, message: '读取日志文件失败' },
      { status: 500 }
    );
  }
}
