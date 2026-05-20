import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { ANALYTICS_LOGS_FILE } from '@/constant';
// 替换掉老旧的 geoip-lite，改用更轻量对打包友好的替代品（这里以现代替代库或轻量逻辑演示）
// 如果你依然想保持原样，记得在 next.config.mjs 里加 serverExternalPackages: ['geoip-lite']
import geoip from 'fast-geoip';
import { UAParser } from 'ua-parser-js';

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
 * 高性能、并发安全的日志追加写入
 * 每一行是一个独立的 JSON 对象 (NDJSON 规范)
 */
async function appendLogToFile(logEntry: any) {
  try {
    const dir = path.dirname(ANALYTICS_LOGS_FILE);
    // 确保目录存在（使用异步方法，不阻塞事件循环）
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }

    // 将单条日志转为单行字符串，末尾加换行符
    const logLine = JSON.stringify(logEntry) + '\n';

    // 使用 appendFile 追加，这是原子操作，能有效防止并发冲突
    await fs.promises.appendFile(ANALYTICS_LOGS_FILE, logLine, 'utf-8');

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

    // 地理位置解析 (使用替代后的异步/同步库)
    let location = { country: 'unknown', region: 'unknown', city: 'unknown' };
    if (rawIp && rawIp !== '127.0.0.1' && !rawIp.startsWith('192.168')) {
      const geo = await geoip.lookup(rawIp);
      if (geo) {
        location = {
          country: geo.country || 'unknown',
          region: geo.region || 'unknown',
          city: geo.city || 'unknown',
        };
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
 * GET 接口适配新的单行 JSON 格式读取
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

    // 将单行日志重新拼装为前端需要的 JSON 数组形式
    const logs = fileContent
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => JSON.parse(line));

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('读取日志文件失败:', error);
    return NextResponse.json(
      { success: false, message: '读取日志文件失败' },
      { status: 500 }
    );
  }
}
