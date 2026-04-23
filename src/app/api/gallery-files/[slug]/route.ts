import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

const GALLERY_DIR = path.join(process.cwd(), 'src', 'content', 'gallery');

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// 获取单个文件内容
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    // 尝试 .yml 和 .yaml 扩展名
    let filePath = path.join(GALLERY_DIR, `${slug}.yml`);
    try {
      await fs.access(filePath);
    } catch {
      filePath = path.join(GALLERY_DIR, `${slug}.yaml`);
    }

    const content = await fs.readFile(filePath, 'utf-8');

    return NextResponse.json({ content });
  } catch (error) {
    console.error('获取图库文件失败:', error);
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

    // 尝试 .yml 和 .yaml 扩展名
    let filePath = path.join(GALLERY_DIR, `${slug}.yml`);
    try {
      await fs.access(filePath);
    } catch {
      filePath = path.join(GALLERY_DIR, `${slug}.yaml`);
    }

    await fs.unlink(filePath);

    // 刷新缓存
    revalidatePath('/gallery');
    revalidatePath(`/gallery/${slug}`);
    revalidatePath('/');

    return NextResponse.json({ message: '文件删除成功' });
  } catch (error) {
    console.error('删除图库文件失败:', error);
    return NextResponse.json(
      { error: '删除失败，文件可能不存在' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const { content, ext = 'yml' } = await request.json();

    const filePath = path.join(GALLERY_DIR, `${slug}.${ext}`);

    await fs.writeFile(filePath, content, 'utf-8');

    // 刷新缓存
    revalidatePath('/gallery');
    revalidatePath(`/gallery/${slug}`);
    revalidatePath('/');

    return NextResponse.json({ message: '文件更新成功' });
  } catch (error) {
    console.error('更新图库文件失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
