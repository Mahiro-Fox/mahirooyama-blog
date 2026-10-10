/**
 * 云音乐流式转发共用逻辑。
 *
 * 浏览器无法直连 Go 后端（跨域 + 需 X-Internal-Secret），因此音频流 / 封面图
 * 统一由 Next 的 route handler 转发：浏览器请求 Next → Next 带内部密钥请求 Go →
 * 原样透传状态码与头部，并把 Go 返回的响应体作为流返回浏览器。
 */
import { NextRequest, NextResponse } from 'next/server';

function baseUrl(): string {
  if (!process.env.GO_API_INTERNAL_URL) {
    throw new Error('GO_API_INTERNAL_URL 环境变量未配置');
  }
  return process.env.GO_API_INTERNAL_URL;
}

function internalSecret(): string {
  if (!process.env.GO_API_SHARED_SECRET) {
    throw new Error('GO_API_SHARED_SECRET 环境变量未配置');
  }
  return process.env.GO_API_SHARED_SECRET;
}

export async function proxyGoStream(
  path: string,
  request: NextRequest
): Promise<NextResponse> {
  const upstream = `${baseUrl()}${path}`;
  const headers: Record<string, string> = {
    'X-Internal-Secret': internalSecret(),
  };

  // 转发浏览器 Range 头（音频拖动 / <audio> seek）与其它下游需要的头
  const range = request.headers.get('range');
  if (range) headers['Range'] = range;
  const referer = request.headers.get('referer');
  if (referer) headers['Referer'] = referer;
  const ua = request.headers.get('user-agent');
  if (ua) headers['User-Agent'] = ua;

  const res = await fetch(upstream, { headers, cache: 'no-store' });
  if (!res.ok) {
    return NextResponse.json(
      { error: `upstream ${res.status}` },
      { status: res.status }
    );
  }

  if (!res.body) {
    return new NextResponse(null, { status: 200 });
  }

  const respHeaders = new Headers();
  const contentType = res.headers.get('content-type');
  if (contentType) respHeaders.set('Content-Type', contentType);
  const contentLength = res.headers.get('content-length');
  if (contentLength) respHeaders.set('Content-Length', contentLength);
  const contentRange = res.headers.get('content-range');
  if (contentRange) respHeaders.set('Content-Range', contentRange);
  const acceptRanges = res.headers.get('accept-ranges');
  if (acceptRanges) respHeaders.set('Accept-Ranges', acceptRanges);
  // 音频不做缓存；封面允许浏览器强缓存
  const cacheControl = res.headers.get('cache-control');
  if (cacheControl) respHeaders.set('Cache-Control', cacheControl);

  return new NextResponse(
    new ReadableStream({
      async start(controller) {
        const reader = res.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    }),
    { status: res.status, headers: respHeaders }
  );
}