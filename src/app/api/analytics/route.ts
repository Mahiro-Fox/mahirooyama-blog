import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
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

/**
 * 日志追加写入（数组形式）
 */
async function appendLogToFile(logEntry: any) {
  try {
    const dir = path.dirname(ANALYTICS_LOGS_FILE);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }

    let logs: any[] = [];
    try {
      const content = await fs.promises.readFile(ANALYTICS_LOGS_FILE, 'utf-8');
      if (content.trim()) {
        logs = JSON.parse(content);
        if (!Array.isArray(logs)) {
          logs = [];
        }
      }
    } catch {
      logs = [];
    }

    logs.push(logEntry);
    await fs.promises.writeFile(
      ANALYTICS_LOGS_FILE,
      JSON.stringify(logs, null, 2),
      'utf-8'
    );

    console.log(`[Analytics] 埋点事件 ${logEntry.event} 写入成功`);
  } catch (error) {
    console.error('[Analytics] 写入埋点日志失败:', error);
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

    const logEntry = {
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

    // 使用 Next.js 推荐的 Edge 安全后台等待机制，防止进程提前休漫
    // 如果你的 Next.js 版本不支持，可以直接去掉包裹，直接 await appendLogToFile(logEntry);
    if (typeof process !== 'undefined' && (process as any).waitUntil) {
      (process as any).waitUntil(appendLogToFile(logEntry));
    } else {
      // 降级策略：虽然会稍微占用一点该请求的响应时间(极短)，但绝对安全，不会丢数据
      await appendLogToFile(logEntry);
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

    const logs = JSON.parse(fileContent);
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
