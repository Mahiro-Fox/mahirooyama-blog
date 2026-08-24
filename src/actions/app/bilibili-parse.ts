'use server';

import { createLogger } from '@/utils/logger';

const logger = createLogger('BilibiliParse');

/** B 站视频解析结果 */
export interface ParseResult {
  title: string;
  cover: string;
  mp4Url: string;
  duration: number;
  fileSize: number;
  quality: number;
  format: string;
  acceptDescription: string[];
  supportFormats: Array<{
    quality: number;
    format: string;
    description: string;
    displayDesc: string;
  }>;
}

/** 统一返回风格 */
export type ParseActionResponse =
  | { success: true; data: ParseResult }
  | { success: false; error: string };

interface BilibiliViewResponse {
  code: number;
  message: string;
  data: {
    bvid: string;
    cid: number;
    title: string;
    pic: string;
  };
}

interface BilibiliPlayurlResponse {
  code: number;
  message: string;
  data: {
    quality: number;
    format: string;
    timelength: number;
    accept_description: string[];
    durl: Array<{
      order: number;
      length: number;
      size: number;
      url: string;
    }>;
    support_formats: Array<{
      quality: number;
      format: string;
      new_description: string;
      display_desc: string;
    }>;
  };
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * 解析 B 站视频链接，返回直链播放地址与元信息。
 * 用 BV 号替代整条 URL 作为输入，规避 SSRF 风险（服务端只会去调 B 站官方接口）。
 */
export async function parseBilibiliVideo(url: string): Promise<ParseActionResponse> {
  const bvid = url.match(/(BV[a-zA-Z0-9]{10})/)?.[1];

  if (!bvid) {
    return { success: false, error: '无法从 URL 中提取 BV 号，请检查链接格式' };
  }

  try {
    // 步骤一：获取视频基本信息（cid、title、pic）
    const viewApiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
    const viewRes = await fetch(viewApiUrl, {
      headers: { 'User-Agent': UA, Referer: 'https://www.bilibili.com' },
    });

    if (!viewRes.ok) {
      return { success: false, error: '获取视频信息失败，B 站接口返回错误' };
    }

    const viewData = (await viewRes.json()) as BilibiliViewResponse;
    if (viewData.code !== 0) {
      return { success: false, error: `B 站接口返回错误: ${viewData.message}` };
    }

    const { cid, title, pic } = viewData.data;

    // 步骤二：获取 MP4 直链（durl 方案，不拆音视频）
    const playurlApiUrl = `https://api.bilibili.com/x/player/wbi/playurl?bvid=${bvid}&cid=${cid}&qn=80&fnval=0&fnver=0&fourk=1&platform=html5`;
    const playurlRes = await fetch(playurlApiUrl, {
      headers: { 'User-Agent': UA, Referer: 'https://www.bilibili.com' },
    });

    if (!playurlRes.ok) {
      return { success: false, error: '获取播放地址失败，B 站接口返回错误' };
    }

    const playurlData = (await playurlRes.json()) as BilibiliPlayurlResponse;
    if (playurlData.code !== 0) {
      return { success: false, error: `B 站播放接口返回错误: ${playurlData.message}` };
    }

    if (!playurlData.data.durl || playurlData.data.durl.length === 0) {
      return {
        success: false,
        error: '未获取到视频播放地址，可能该视频需要特殊权限或已失效',
      };
    }

    const mp4Url = playurlData.data.durl[0].url;

    return {
      success: true,
      data: {
        title,
        cover: pic,
        mp4Url,
        duration: playurlData.data.timelength,
        fileSize: playurlData.data.durl[0].size,
        quality: playurlData.data.quality,
        format: playurlData.data.format,
        acceptDescription: playurlData.data.accept_description,
        supportFormats: playurlData.data.support_formats.map((fmt) => ({
          quality: fmt.quality,
          format: fmt.format,
          description: fmt.new_description,
          displayDesc: fmt.display_desc,
        })),
      },
    };
  } catch (error) {
    logger.error('B 站视频解析失败', error);
    return { success: false, error: '服务器内部错误，请稍后重试' };
  }
}