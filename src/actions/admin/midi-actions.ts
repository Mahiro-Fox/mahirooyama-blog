'use server';

import fs from 'fs/promises';
import path from 'path';
import { MIDI_DIR } from '@/constant/dir';
import { checkFileConflict, ensureDirectory } from '@/utils/file-utils';

import { requirePermission } from '@/lib/permissions';

export interface MidiAdminFile {
  slug: string;
  fileName: string;
  name: string;
  size: number;
  lastModified: string;
}

// GET - 获取 MIDI 文件列表
export async function adminGetMidiFiles(): Promise<
  { success: true; files: MidiAdminFile[] } | { success: false; error: string }
> {
  const permissionCheck = await requirePermission('midi:read');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
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
        };
      })
    );

    // 按修改时间排序
    filesWithStats.sort(
      (a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    return { success: true, files: filesWithStats };
  } catch (error) {
    console.error('获取 MIDI 文件列表失败:', error);
    return { success: false, error: '获取文件列表失败' };
  }
}

// POST - 上传 MIDI 文件
export async function adminUploadMidiFile(
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('midi:create');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: '没有提供文件' };
    }

    // 验证文件类型
    if (!file.name.toLowerCase().endsWith('.mid')) {
      return { success: false, error: '只支持 .mid 文件' };
    }

    // 获取文件名（不含扩展名）
    const baseName = path.basename(file.name, '.mid');

    const fileName = `${baseName}.mid`;
    const filePath = path.join(MIDI_DIR, fileName);

    // 检查文件是否已存在
    const conflict = await checkFileConflict(filePath);
    if (conflict) {
      return { success: false, error: conflict.error };
    }

    // 确保目录存在
    await ensureDirectory(MIDI_DIR);

    // 写入文件
    const bytes = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(bytes));

    return { success: true };
  } catch (error) {
    console.error('上传 MIDI 文件失败:', error);
    return { success: false, error: '上传文件失败' };
  }
}

// DELETE - 删除 MIDI 文件
export async function adminDeleteMidiFile(
  slug: string
): Promise<{ success: true } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('midi:delete');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    const fileName = `${slug}.mid`;
    const filePath = path.join(MIDI_DIR, fileName);

    // 安全检查
    if (!filePath.startsWith(MIDI_DIR)) {
      return { success: false, error: '非法路径' };
    }

    await fs.unlink(filePath);
    return { success: true };
  } catch (error) {
    console.error('删除 MIDI 文件失败:', error);
    return { success: false, error: '删除文件失败' };
  }
}

// POST - 重命名 MIDI 文件
export async function adminRenameMidiFile(
  oldSlug: string,
  newName: string
): Promise<{ success: true } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('midi:update');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    if (!newName || newName.trim() === '') {
      return { success: false, error: '新名称不能为空' };
    }

    const oldFileName = `${oldSlug}.mid`;
    const oldPath = path.join(MIDI_DIR, oldFileName);

    // 安全检查
    if (!oldPath.startsWith(MIDI_DIR)) {
      return { success: false, error: '非法路径' };
    }
    const newFileName = `${newName.trim()}.mid`;
    const newPath = path.join(MIDI_DIR, newFileName);

    // 检查新名称是否已存在
    const conflict = await checkFileConflict(newPath);
    if (conflict) {
      return { success: false, error: conflict.error };
    }

    await fs.rename(oldPath, newPath);
    return { success: true };
  } catch (error) {
    console.error('重命名 MIDI 文件失败:', error);
    return { success: false, error: '重命名文件失败' };
  }
}
