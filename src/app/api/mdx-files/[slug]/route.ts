import fs from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const BLOG_DIR = path.join(process.cwd(), 'src', 'content', 'blog');

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// 获取单个文件内容
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const filePath = path.join(BLOG_DIR, `${slug}.mdx`);

    const content = await fs.readFile(filePath, 'utf-8');

    return NextResponse.json({ content });
  } catch (error) {
    console.error('获取 MDX 文件失败:', error);
    return NextResponse.json(
      { error: '文件不存在或读取失败' },
      { status: 404 }
    );
  }
}

// 删除文件
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const filePath = path.join(BLOG_DIR, `${slug}.mdx`);

    await fs.unlink(filePath);

    return NextResponse.json({ message: '文件删除成功' });
  } catch (error) {
    console.error('删除 MDX 文件失败:', error);
    return NextResponse.json(
      { error: '删除失败，文件可能不存在' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const { content } = await request.json();
    const filePath = path.join(BLOG_DIR, `${slug}.mdx`);

    await fs.writeFile(filePath, content, 'utf-8');

    return NextResponse.json({ message: '文件更新成功' });
  } catch (error) {
    console.error('更新 MDX 文件失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
