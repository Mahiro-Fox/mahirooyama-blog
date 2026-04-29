import fs from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { checkFileConflict, FileUtils } from '@/utils/file-utils';
import matter from 'gray-matter';

import { requirePermission } from '@/lib/permissions';

const BLOG_DIR = path.join(process.cwd(), 'src', 'content', 'blog');

export async function GET() {
  try {
    const files = await fs.readdir(BLOG_DIR);
    const mdxFiles = files.filter((file) => file.endsWith('.mdx'));

    const posts = await Promise.all(
      mdxFiles.map(async (file) => {
        const filePath = path.join(BLOG_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = matter(content);

        return {
          slug: path.basename(file, '.mdx'),
          fileName: file,
          title: parsed.data.title || '无标题',
          description: parsed.data.description || '',
          createdAt: parsed.data.createdAt || '',
          tags: parsed.data.tags || [],
          size: (await fs.stat(filePath)).size,
          updatedAt: (await fs.stat(filePath)).mtime.toISOString(),
        };
      })
    );

    // 按日期排序
    posts.sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    );

    return NextResponse.json(posts);
  } catch (error) {
    console.error('获取 MDX 文件列表失败:', error);
    return NextResponse.json({ error: '获取文件列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 检查 blog:create 权限
    const permissionCheck = await requirePermission('blog:create');
    if (!permissionCheck.allowed) {
      return permissionCheck.response;
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const slug = formData.get('slug') as string | null;

    if (!file) {
      return NextResponse.json({ error: '没有提供文件' }, { status: 400 });
    }

    // 验证文件类型
    if (!file.name.endsWith('.mdx') && file.type !== 'text/mdx') {
      return NextResponse.json({ error: '只接受 .mdx 文件' }, { status: 400 });
    }

    // 读取文件内容
    const content = await file.text();

    // 验证 MDX 格式 - 检查是否有 frontmatter
    const parsed = matter(content);
    if (!parsed.data.title || !parsed.data.createdAt) {
      return NextResponse.json(
        { error: 'MDX 文件缺少必需的 frontmatter 字段 (title, createdAt)' },
        { status: 400 }
      );
    }

    // 确定文件名
    const fileName = slug
      ? `${slug}.mdx`
      : file.name.replace(/[^a-zA-Z0-9.-]/g, '-');

    const filePath = path.join(BLOG_DIR, fileName);

    // 检查文件是否已存在
    const conflict = await checkFileConflict(filePath);
    if (conflict) {
      return NextResponse.json(
        { error: conflict.error },
        { status: conflict.status }
      );
    }

    // 确保目录存在
    await FileUtils.ensureDirectory(BLOG_DIR);

    // 写入文件
    await fs.writeFile(filePath, content, 'utf-8');

    // 刷新缓存
    const newSlug = path.basename(fileName, '.mdx');

    return NextResponse.json(
      {
        message: '文件上传成功',
        fileName,
        slug: newSlug,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('上传 MDX 文件失败:', error);
    return NextResponse.json(
      { error: '上传失败，请稍后重试' },
      { status: 500 }
    );
  }
}
