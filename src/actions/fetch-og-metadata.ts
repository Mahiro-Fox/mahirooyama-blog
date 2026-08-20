'use server';

import { cache } from 'react';
import dns from 'node:dns/promises';
import { isIP } from 'node:net';

interface OGData {
  title: string;
  description: string;
  image: string;
  url: string;
}

// 判断 IP 是否为内网/保留地址（SSRF 防护：阻止访问回环、私网、链路本地、多播等）
function isPrivateIpAddress(addr: string): boolean {
  const version = isIP(addr);
  if (version === 4) {
    const p = addr.split('.').map(Number);
    return (
      p[0] === 0 ||
      p[0] === 10 ||
      p[0] === 127 ||
      (p[0] === 169 && p[1] === 254) || // link-local
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || // 172.16-31
      (p[0] === 192 && p[1] === 168) ||
      (p[0] === 192 && p[1] === 0 && p[2] === 0) || // 192.0.0.x
      p[0] >= 224 // 多播/保留
    );
  }
  if (version === 6) {
    const lower = addr.toLowerCase();
    return (
      lower === '::' ||
      lower === '::1' ||
      lower.startsWith('fe80:') ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('ff')
    );
  }
  // 无法识别的 IP 一律视为不可信
  return true;
}

// 校验目标是否安全：仅允许 http/https，并确保解析后的 IP 非内网
async function isSafeTarget(rawUrl: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }
  const host = parsed.hostname;
  if (!host) return false;

  // 主机名本身是 IP 时直接校验
  if (isIP(host) > 0) {
    return !isPrivateIpAddress(host);
  }

  // 否则 DNS 解析并逐一校验（all:true 覆盖 IPv4/IPv6）
  let addresses: { address: string; family: number }[];
  try {
    addresses = await dns.lookup(host, { all: true, verbatim: true });
  } catch {
    return false;
  }
  if (!addresses || addresses.length === 0) return false;
  return !addresses.some((a) => isPrivateIpAddress(a.address));
}

export const getOGData = cache(
  async (url: string): Promise<Partial<OGData>> => {
    try {
      // SSRF 防护：协议白名单 + 内网 IP 拦截
      if (!(await isSafeTarget(url))) {
        console.error('OG 抓取目标被拦截（协议或 IP 不可信）:', url);
        return { url };
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'bot',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
      }

      const html = await response.text();

      const getMetaContent = (property: string): string | undefined => {
        const regex = new RegExp(
          `<meta[^>]+(?:property|name)="${property}"[^>]+content="([^"]+)"`,
          'i'
        );
        return regex.exec(html)?.[1];
      };

      const titleMatch = /<title>(.*?)<\/title>/i.exec(html);

      return {
        title: getMetaContent('og:title') || titleMatch?.[1] || '',
        description:
          getMetaContent('og:description') ||
          getMetaContent('description') ||
          '',
        image: getMetaContent('og:image') || '',
        url,
      };
    } catch (error) {
      console.error('Error fetching OG data:', error);
      return { url };
    }
  }
);