import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/utils/logger';

const logger = createLogger('BilibiliParse');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  /** 当前分P序号（从 1 开始） */
  page: number;
  /** 总分P数 */
  totalPages: number;
  /** 当前分P标题 */
  partTitle: string;
}

type ParseSuccess = { success: true; data: ParseResult };
type ParseFailure = { success: false; error: string; status: number };
type ParseOutcome = ParseSuccess | ParseFailure;

interface BilibiliPage {
  cid: number;
  page: number;
  part: string;
  duration: number;
}

interface BilibiliViewResponse {
  code: number;
  message: string;
  data: {
    bvid: string;
    cid: number;
    title: string;
    pic: string;
    videos: number;
    pages: BilibiliPage[];
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

/** 从原始输入中尝试解析分P号（支持完整 URL、BV号+?p=、裸 ?p= 查询串） */
function extractPageFromInput(raw: string): number | null {
  try {
    const normalized = raw.startsWith('http')
      ? raw
      : `https://www.bilibili.com/video/${raw}`;
    const p = new URL(normalized).searchParams.get('p');
    if (p) {
      const n = Number.parseInt(p, 10);
      if (Number.isFinite(n)) return n;
    }
  } catch {
    // 忽略 URL 解析失败，走下方正则兜底
  }
  const m = raw.match(/[?&]p=(\d+)/);
  if (m) return Number.parseInt(m[1], 10);
  return null;
}

/**
 * 解析 B 站视频链接，返回指定分P的直链播放地址与元信息。
 * 用 BV 号替代整条 URL 作为输入，规避 SSRF 风险（服务端只会去调 B 站官方接口）。
 */
async function parseBilibiliVideo(
  url: string,
  pParam?: string | null
): Promise<ParseOutcome> {
  const bvid = url.match(/(BV[a-zA-Z0-9]{10})/)?.[1];

  if (!bvid) {
    return {
      success: false,
      status: 400,
      error: '无法从 URL 中提取 BV 号，请检查链接格式',
    };
  }

  // 确定目标分P：显式 p 参数优先，其次从 url 中解析，默认第 1P
  let pageNum = 1;
  if (pParam != null && pParam !== '') {
    const n = Number.parseInt(pParam, 10);
    if (!Number.isFinite(n) || n < 1) {
      return {
        success: false,
        status: 400,
        error: 'p 参数必须为大于等于 1 的整数',
      };
    }
    pageNum = n;
  } else {
    const fromUrl = extractPageFromInput(url);
    if (fromUrl != null) {
      if (fromUrl < 1) {
        return {
          success: false,
          status: 400,
          error: 'p 参数必须为大于等于 1 的整数',
        };
      }
      pageNum = fromUrl;
    }
  }

  try {
    // 步骤一：获取视频基本信息（含分集列表 pages）
    const viewApiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
    const viewRes = await fetch(viewApiUrl, {
      headers: { 'User-Agent': UA, Referer: 'https://www.bilibili.com' },
    });

    if (!viewRes.ok) {
      return {
        success: false,
        status: 502,
        error: '获取视频信息失败，B 站接口返回错误',
      };
    }

    const viewData = (await viewRes.json()) as BilibiliViewResponse;
    if (viewData.code !== 0) {
      return {
        success: false,
        status: 502,
        error: `B 站接口返回错误: ${viewData.message}`,
      };
    }

    const { title, pic, pages, cid: firstCid } = viewData.data;

    // 构造分集列表（兼容 pages 缺失的极少数情况）
    const pageList: BilibiliPage[] =
      Array.isArray(pages) && pages.length > 0
        ? pages
        : [{ cid: firstCid, page: 1, part: 'P1', duration: 0 }];

    const totalPages = pageList.length;

    if (pageNum > totalPages) {
      return {
        success: false,
        status: 400,
        error: `p 参数超出范围，该视频共有 ${totalPages} 个分集`,
      };
    }

    // 按 page 字段匹配，兜底用数组下标（pages 通常按 page 升序且从 1 连续）
    const targetPage =
      pageList.find((pg) => pg.page === pageNum) ?? pageList[pageNum - 1];
    const cid = targetPage.cid;

    // 步骤二：用目标分P的 cid 获取 MP4 直链（durl 方案，不拆音视频）
    const playurlApiUrl = `https://api.bilibili.com/x/player/wbi/playurl?bvid=${bvid}&cid=${cid}&qn=80&fnval=0&fnver=0&fourk=1&platform=html5`;
    const playurlRes = await fetch(playurlApiUrl, {
      headers: { 'User-Agent': UA, Referer: 'https://www.bilibili.com' },
    });

    if (!playurlRes.ok) {
      return {
        success: false,
        status: 502,
        error: '获取播放地址失败，B 站接口返回错误',
      };
    }

    const playurlData = (await playurlRes.json()) as BilibiliPlayurlResponse;
    if (playurlData.code !== 0) {
      return {
        success: false,
        status: 502,
        error: `B 站播放接口返回错误: ${playurlData.message}`,
      };
    }

    if (!playurlData.data.durl || playurlData.data.durl.length === 0) {
      return {
        success: false,
        status: 502,
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
        acceptDescription: playurlData.data.accept_description ?? [],
        supportFormats: (playurlData.data.support_formats ?? []).map((fmt) => ({
          quality: fmt.quality,
          format: fmt.format,
          description: fmt.new_description,
          displayDesc: fmt.display_desc,
        })),
        page: pageNum,
        totalPages,
        partTitle: targetPage.part,
      },
    };
  } catch (error) {
    logger.error('B 站视频解析失败', error);
    return { success: false, status: 500, error: '服务器内部错误，请稍后重试' };
  }
}

/**
 * GET /next-api/bilibili-parse
 *
 * 请求：
 *   ?url=string   B 站视频链接或 BV 号（链接中可自带 ?p=N）
 *   &p=number     可选，目标分P序号（从 1 开始），优先级高于 url 中的 p
 *   &json=1       可选，返回 JSON 而不是 302 重定向
 *
 * 成功：
 *   - 默认：302 重定向到目标分P的 mp4 直链
 *   - json=1：200 { success: true, data: ParseResult }
 * 失败：400（入参/链接/分P序号非法）、502（B 站接口异常）、500（服务端异常）
 *      { success: false, error: string }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { success: false, error: '缺少 url 参数' },
      { status: 400 }
    );
  }

  const pParam = searchParams.get('p');
  const asJson = searchParams.get('json') === '1';

  const outcome = await parseBilibiliVideo(url, pParam);
  if (!outcome.success) {
    return NextResponse.json(
      { success: false, error: outcome.error },
      { status: outcome.status }
    );
  }

  if (asJson) {
    return NextResponse.json({ success: true, data: outcome.data });
  }

  return NextResponse.redirect(outcome.data.mp4Url, 302);
}
