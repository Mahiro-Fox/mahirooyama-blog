import fs from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import matter from 'gray-matter';

const GALLERY_DIR = path.join(process.cwd(), 'src', 'content', 'gallery');

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
          src: parsed.data.src || '',
          tags: parsed.data.tags || [],
          size: (await fs.stat(filePath)).size,
          updatedAt: (await fs.stat(filePath)).mtime.toISOString(),
        };
      })
    );

    // 按更新时间排序
    images.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return NextResponse.json(images);
  } catch (error) {
    console.error('获取图库文件列表失败:', error);
    return NextResponse.json({ error: '获取文件列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const content = await file.text();

    // 验证 YAML 格式 - 检查是否有 frontmatter
    const parsed = matter(content);
    if (!parsed.data.title || !parsed.data.src) {
      return NextResponse.json(
        { error: 'YAML 文件缺少必需的字段 (title, src)' },
        { status: 400 }
      );
    }

    // 确定文件名
    const fileName = slug
      ? `${slug}.yml`
      : file.name.replace(/[^a-zA-Z0-9.-]/g, '-');

    const filePath = path.join(GALLERY_DIR, fileName);

    // 检查文件是否已存在
    try {
      await fs.access(filePath);
      return NextResponse.json(
        { error: `文件 ${fileName} 已存在` },
        { status: 409 }
      );
    } catch {
      // 文件不存在，可以继续
    }

    // 确保目录存在
    await fs.mkdir(GALLERY_DIR, { recursive: true });

    // 写入文件
    await fs.writeFile(filePath, content, 'utf-8');

    return NextResponse.json(
      {
        message: '文件上传成功',
        fileName,
        slug: path.basename(fileName, path.extname(fileName)),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('上传图库文件失败:', error);
    return NextResponse.json(
      { error: '上传失败，请稍后重试' },
      { status: 500 }
    );
  }
}
