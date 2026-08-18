import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { UPLOADS_DIR } from '@/constant/dir';
import { requirePermission } from '@/lib/permissions';
import { isPathSafe } from '@/utils/file-utils';

const INTERNAL_SECRET = process.env.GO_API_SHARED_SECRET ?? '';
const BASE_URL = process.env.GO_API_INTERNAL_URL ?? 'http://localhost:8080';

// POST /api/upload-files - 转发 multipart 请求到 Go 后端
// 注意：multipart 的 Content-Type 必须保留 boundary，不能用 goFetch 的默认 application/json
export async function POST(request: NextRequest) {
  const permissionCheck = await requirePermission('files:upload');
  if (!permissionCheck.allowed) {
    return permissionCheck.response;
  }

  const { searchParams } = new URL(request.url);
  const relativePath = searchParams.get('path') || '';
  const targetDir = path.join(UPLOADS_DIR, relativePath);

  if (!isPathSafe(targetDir, UPLOADS_DIR)) {
    return NextResponse.json({ error: '非法路径' }, { status: 403 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    const body = await request.blob();
    const res = await fetch(
      `${BASE_URL}/api/upload-files?path=${encodeURIComponent(relativePath)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          'X-Internal-Secret': INTERNAL_SECRET,
        },
        body,
        cache: 'no-store',
      }
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('转发上传请求失败:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
