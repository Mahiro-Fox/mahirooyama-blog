import { NextRequest, NextResponse } from 'next/server';

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
    accept_quality: number[];
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

interface ParseRequestBody {
  url: string;
}

interface ParseResponseBody {
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

interface ErrorResponse {
  error: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ParseRequestBody = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json<ErrorResponse>(
        { error: 'URL 参数不能为空' },
        { status: 400 }
      );
    }

    // 从 URL 中提取 BV 号
    const bvidMatch = url.match(/(BV[a-zA-Z0-9]{10})/);
    const bvid = bvidMatch ? bvidMatch[1] : null;

    if (!bvid) {
      return NextResponse.json<ErrorResponse>(
        { error: '无法从 URL 中提取 BV 号，请检查链接格式' },
        { status: 400 }
      );
    }

    // 步骤一：获取视频基本信息（cid、title、pic）
    const viewApiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
    const viewResponse = await fetch(viewApiUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://www.bilibili.com',
      },
    });

    if (!viewResponse.ok) {
      return NextResponse.json<ErrorResponse>(
        { error: '获取视频信息失败，B 站接口返回错误' },
        { status: 500 }
      );
    }

    const viewData: BilibiliViewResponse = await viewResponse.json();

    if (viewData.code !== 0) {
      return NextResponse.json<ErrorResponse>(
        { error: `B 站接口返回错误: ${viewData.message}` },
        { status: 400 }
      );
    }

    const { cid, title, pic } = viewData.data;

    // 步骤二：获取 MP4 直链（使用 durl 方案，不带音视频分离）
    const playurlApiUrl = `https://api.bilibili.com/x/player/wbi/playurl?bvid=${bvid}&cid=${cid}&qn=80&fnval=0&fnver=0&fourk=1&platform=html5`;
    const playurlResponse = await fetch(playurlApiUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://www.bilibili.com',
      },
    });

    if (!playurlResponse.ok) {
      return NextResponse.json<ErrorResponse>(
        { error: '获取播放地址失败，B 站接口返回错误' },
        { status: 500 }
      );
    }

    const playurlData: BilibiliPlayurlResponse = await playurlResponse.json();

    if (playurlData.code !== 0) {
      return NextResponse.json<ErrorResponse>(
        { error: `B 站播放接口返回错误: ${playurlData.message}` },
        { status: 400 }
      );
    }

    if (!playurlData.data.durl || playurlData.data.durl.length === 0) {
      return NextResponse.json<ErrorResponse>(
        { error: '未获取到视频播放地址，可能该视频需要特殊权限或已失效' },
        { status: 400 }
      );
    }
    const mp4Url = playurlData.data.durl[0].url;

    // 返回解析结果
    const responseBody: ParseResponseBody = {
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
    };

    return NextResponse.json<ParseResponseBody>(responseBody, { status: 200 });
  } catch (error) {
    console.error('B 站视频解析错误:', error);
    return NextResponse.json<ErrorResponse>(
      { error: '服务器内部错误，请稍后重试' },
      { status: 500 }
    );
  }
}
