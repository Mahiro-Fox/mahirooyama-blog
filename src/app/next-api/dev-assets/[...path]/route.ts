import fs from 'fs';
import path from 'path';
import { UPLOADS_DIR } from '@/constant/dir';

/**
 * 临时取证路由：本地 dev 下 nginx 不参与，/uploads/* 会 404，
 * 照片隧道（/test）需要真实图片才能验证，验证完即删。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const target = path.join(UPLOADS_DIR, ...segments);
  if (!target.startsWith(UPLOADS_DIR)) {
    return new Response('not found', { status: 404 });
  }

  try {
    const buffer = await fs.promises.readFile(target);
    const ext = path.extname(target).toLowerCase();
    const type =
      ext === '.webp'
        ? 'image/webp'
        : ext === '.png'
          ? 'image/png'
          : 'application/octet-stream';
    return new Response(new Uint8Array(buffer), {
      headers: { 'Content-Type': type },
    });
  } catch {
    return new Response('not found', { status: 404 });
  }
}
