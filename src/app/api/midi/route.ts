import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { MIDI_DIR } from '@/constant/dir';
import { ensureDirectory } from '@/utils/file-utils';

export async function GET() {
  try {
    // 确保目录存在
    await ensureDirectory(MIDI_DIR);
    
    const files = await fs.readdir(MIDI_DIR);
    const midiFiles = files.filter((file) =>
      file.toLowerCase().endsWith('.mid')
    );

    const filesWithStats = await Promise.all(
      midiFiles.map(async (file) => {
        const filePath = path.join(MIDI_DIR, file);
        const stats = await fs.stat(filePath);

        return {
          slug: path.basename(file, '.mid'),
          fileName: file,
          name: path.basename(file, '.mid'),
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          // 同时也提供可以直接访问的 web 路径
          path: `/uploads/midisongs/${file}`,
        };
      })
    );

    // 按修改时间排序
    filesWithStats.sort(
      (a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    return NextResponse.json({
      success: true,
      files: filesWithStats,
    });
  } catch (error) {
    console.error('API 获取 MIDI 列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取文件列表失败' },
      { status: 500 }
    );
  }
}
