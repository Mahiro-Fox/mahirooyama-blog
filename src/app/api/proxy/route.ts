// import { NextRequest, NextResponse } from 'next/server';

// export async function GET(request: NextRequest) {
//   const encodedUrl = request.nextUrl.searchParams.get('url');

//   if (!encodedUrl) {
//     return NextResponse.json(
//       { error: '缺少 url 参数' },
//       { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
//     );
//   }

//   let targetUrl: string;
//   try {
//     targetUrl = decodeURIComponent(encodedUrl);
//   } catch {
//     return NextResponse.json(
//       { error: 'url 参数解码失败' },
//       { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
//     );
//   }

//   try {
//     const urlObj = new URL(targetUrl);

//     const response = await fetch(targetUrl, {
//       headers: {
//         'User-Agent':
//           'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//         Referer: `${urlObj.protocol}//${urlObj.host}`,
//       },
//     });

//     if (!response.ok) {
//       return new NextResponse(response.body, {
//         status: response.status,
//         headers: { 'Access-Control-Allow-Origin': '*' },
//       });
//     }

//     const isM3u8 = targetUrl.toLowerCase().endsWith('.m3u8');

//     if (isM3u8) {
//       const text = await response.text();

//       const rewriteUrl = (originalUrl: string): string => {
//         let targetUrl = originalUrl;

//         try {
//           const urlObj = new URL(originalUrl);
//           const existingProxyParam = urlObj.searchParams.get('url');
//           if (existingProxyParam) {
//             targetUrl = decodeURIComponent(existingProxyParam);
//           }
//         } catch {
//           console.error('URL 解码失败:', originalUrl);
//           return originalUrl;
//         }

//         return `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
//       };

//       const rewrittenText = text
//         .replace(/https?:\/\/[^\s"'#]+\.(ts|key|m3u8)/gi, (match) => {
//           return rewriteUrl(match);
//         })
//         .replace(
//           /([^\s"'#]+)\.(ts|key|m3u8)/gi,
//           (match, basePath, extension) => {
//             if (
//               basePath.startsWith('http://') ||
//               basePath.startsWith('https://')
//             ) {
//               return match;
//             }

//             let fullUrl: string;
//             if (basePath.startsWith('/')) {
//               fullUrl = `${urlObj.protocol}//${urlObj.host}${basePath}.${extension}`;
//             } else {
//               const targetPath = urlObj.pathname;
//               const basePathParts = targetPath.split('/');
//               basePathParts.pop();
//               const newPath = [
//                 ...basePathParts,
//                 `${basePath}.${extension}`,
//               ].join('/');
//               fullUrl = `${urlObj.protocol}//${urlObj.host}${newPath}`;
//             }

//             return rewriteUrl(fullUrl);
//           }
//         );

//       return new NextResponse(rewrittenText, {
//         headers: {
//           'Access-Control-Allow-Origin': '*',
//           'Content-Type': 'application/vnd.apple.mpegurl',
//           'Cache-Control': 'no-store',
//         },
//       });
//     }

//     if (targetUrl.toLowerCase().endsWith('.ts')) {
//       return new NextResponse(response.body, {
//         headers: {
//           'Access-Control-Allow-Origin': '*',
//           'Content-Type': 'video/mp2t',
//           'Cache-Control': 'no-store',
//         },
//       });
//     }

//     return new NextResponse(response.body, {
//       headers: {
//         'Access-Control-Allow-Origin': '*',
//         ...response.headers,
//       },
//     });
//   } catch (error) {
//     return NextResponse.json(
//       {
//         error: '代理请求失败',
//         details: error instanceof Error ? error.message : '未知错误',
//       },
//       { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
//     );
//   }
// }

// export function OPTIONS() {
//   return NextResponse.json(
//     {},
//     {
//       headers: {
//         'Access-Control-Allow-Origin': '*',
//         'Access-Control-Allow-Methods': 'GET, OPTIONS',
//         'Access-Control-Allow-Headers': '*',
//       },
//     }
//   );
// }
