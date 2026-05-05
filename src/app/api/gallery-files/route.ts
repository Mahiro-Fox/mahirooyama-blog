import fs from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { GALLERY_DIR } from '@/constant/dir';
import { checkFileConflict, ensureDirectory } from '@/utils/file-utils';
import matter from 'gray-matter';

import { requirePermission } from '@/lib/permissions';

export async function GET() {
  try {
    const files = await fs.readdir(GALLERY_DIR);
    const yamlFiles = files.filter(
      (file) => file.endsWith('.yml') || file.endsWith('.yaml')
    );

    const images = await Promise.all(
      yamlFiles.map(async (file) => {
        const filePath = path.join(GALLERY_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = matter(content);

        return {
          slug: path.basename(file, path.extname(file)),
          fileName: file,
          title: parsed.data.title || '无标题',
          description: parsed.data.description || '',
          thumbnail: parsed.data.thumbnail || '',
          tags: parsed.data.tags || [],
          size: (await fs.stat(filePath)).size,
          lastUpdated: parsed.data.lastUpdated || '',
        };
      })
    );

    // 按更新时间排序
    images.sort(
      (a, b) =>
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );

    return NextResponse.json(images);
  } catch (error) {
    console.error('获取图库文件列表失败:', error);
    return NextResponse.json({ error: '获取文件列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 检查 gallery:create 权限
    const permissionCheck = await requirePermission('gallery:create');
    if (!permissionCheck.allowed) {
      return permissionCheck.response;
    }

    const contentType = request.headers.get('content-type') || '';

    let fileName: string;
    let content: string;

    if (contentType.includes('application/json')) {
      // JSON 格式：直接创建文件
      const json = await request.json();
      const { slug, content: yamlContent } = json;

      if (!slug || !yamlContent) {
        return NextResponse.json(
          { error: '缺少必需字段 (slug, content)' },
          { status: 400 }
        );
      }

      // 验证 YAML 格式
      const parsed = matter(yamlContent);
      if (!parsed.data.title || !parsed.data.thumbnail) {
        return NextResponse.json(
          { error: 'YAML 内容缺少必需的字段 (title, thumbnail)' },
          { status: 400 }
        );
      }

      // 清理文件名
      const cleanSlug = slug.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      fileName = `${cleanSlug}.yml`;
      content = yamlContent;
    } else {
      // FormData 格式：文件上传
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const slug = formData.get('slug') as string | null;

      if (!file) {
        return NextResponse.json({ error: '没有提供文件' }, { status: 400 });
      }

      // 验证文件类型
      const isYaml =
        file.name.endsWith('.yml') ||
        file.name.endsWith('.yaml') ||
        file.type === 'application/x-yaml' ||
        file.type === 'text/yaml';

      if (!isYaml) {
        return NextResponse.json(
          { error: '只接受 .yml 或 .yaml 文件' },
          { status: 400 }
        );
      }

      // 读取文件内容
      content = await file.text();

      // 验证 YAML 格式
      const parsed = matter(content);
      if (!parsed.data.title || !parsed.data.thumbnail) {
        return NextResponse.json(
          { error: 'YAML 文件缺少必需的字段 (title, thumbnail)' },
          { status: 400 }
        );
      }

      // 确定文件名
      fileName = slug
        ? `${slug}.yml`
        : file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
    }

    const filePath = path.join(GALLERY_DIR, fileName);

    // 检查文件是否已存在
    const conflict = await checkFileConflict(filePath);
    if (conflict) {
      return NextResponse.json(
        { error: conflict.error },
        { status: conflict.status }
      );
    }

    // 确保目录存在
    await ensureDirectory(GALLERY_DIR);

    // 写入文件
    await fs.writeFile(filePath, content, 'utf-8');

    // 刷新缓存
    const newSlug = path.basename(fileName, path.extname(fileName));

    return NextResponse.json(
      {
        message: '文件创建成功',
        fileName,
        slug: newSlug,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('创建图库文件失败:', error);
    return NextResponse.json(
      { error: '创建失败，请稍后重试' },
      { status: 500 }
    );
  }
}
