'use server';

import fs from 'fs/promises';
import path from 'path';
import { GALLERY_DIR } from '@/constant/dir';
import {
  checkFileConflict,
  ensureDirectory,
  validateSlug,
} from '@/utils/file-utils';
import matter from 'gray-matter';

import { requirePermission } from '@/lib/permissions';

export interface GalleryFile {
  slug: string;
  fileName: string;
  title: string;
  description: string;
  src: string;
  tags: string[];
  size: number;
  lastUpdated: string;
}

// GET - 获取图库文件列表
export async function adminGetGalleryFiles(): Promise<
  { success: true; files: GalleryFile[] } | { success: false; error: string }
> {
  const permissionCheck = await requirePermission('gallery:read');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

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
          src: parsed.data.thumbnail || '',
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

    return { success: true, files: images };
  } catch (error) {
    console.error('获取图库文件列表失败:', error);
    return { success: false, error: '获取文件列表失败' };
  }
}

// GET - 获取单个文件内容
export async function adminGetGalleryFile(
  slug: string
): Promise<
  { success: true; content: string } | { success: false; error: string }
> {
  const permissionCheck = await requirePermission('gallery:read');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    // 尝试 .yml 和 .yaml 扩展名
    let filePath = path.join(GALLERY_DIR, `${slug}.yml`);
    try {
      await fs.access(filePath);
    } catch {
      filePath = path.join(GALLERY_DIR, `${slug}.yaml`);
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    console.error('获取图库文件失败:', error);
    return { success: false, error: '文件不存在或读取失败' };
  }
}

// POST - 创建文件（JSON 格式）
export async function adminCreateGalleryFile(input: {
  slug: string;
  content: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('gallery:create');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    const { slug, content } = input;

    if (!slug || !content) {
      return { success: false, error: '缺少必需字段 (slug, content)' };
    }

    // 检查文件名是否合法
    const cleanSlug = slug.trim().toLowerCase();
    const nameCheck = validateSlug(cleanSlug);
    if (nameCheck) {
      return { success: false, error: nameCheck.error };
    }

    // 验证 YAML 格式
    const parsed = matter(content);
    if (!parsed.data.title || !parsed.data.thumbnail) {
      return {
        success: false,
        error: 'YAML 内容缺少必需的字段 (title, thumbnail)',
      };
    }

    const fileName = `${cleanSlug}.yml`;
    const filePath = path.join(GALLERY_DIR, fileName);

    // 检查文件是否已存在
    const conflict = await checkFileConflict(filePath);
    if (conflict) {
      return { success: false, error: conflict.error };
    }

    // 确保目录存在
    await ensureDirectory(GALLERY_DIR);

    // 写入文件
    await fs.writeFile(filePath, content, 'utf-8');

    return { success: true };
  } catch (error) {
    console.error('创建图库文件失败:', error);
    return { success: false, error: '创建失败，请稍后重试' };
  }
}

// PUT - 更新文件内容
export async function adminUpdateGalleryFile(
  slug: string,
  content: string
): Promise<{ success: true } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('gallery:update');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    // 尝试 .yml 和 .yaml 扩展名
    let filePath = path.join(GALLERY_DIR, `${slug}.yml`);
    try {
      await fs.access(filePath);
    } catch {
      filePath = path.join(GALLERY_DIR, `${slug}.yaml`);
    }

    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('更新图库文件失败:', error);
    return { success: false, error: '更新失败' };
  }
}

// PATCH - 重命名文件
export async function adminRenameGalleryFile(
  slug: string,
  newSlug: string
): Promise<{ success: true } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('gallery:update');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    // 检查新文件名是否合法
    const cleanNewSlug = newSlug.trim().toLowerCase();
    const nameCheck = validateSlug(cleanNewSlug);
    if (nameCheck) {
      return { success: false, error: nameCheck.error };
    }

    // 尝试找到原文件（支持 .yml 和 .yaml）
    let oldFilePath = path.join(GALLERY_DIR, `${slug}.yml`);
    let oldExt = '.yml';
    try {
      await fs.access(oldFilePath);
    } catch {
      oldFilePath = path.join(GALLERY_DIR, `${slug}.yaml`);
      oldExt = '.yaml';
      try {
        await fs.access(oldFilePath);
      } catch {
        return { success: false, error: '原文件不存在' };
      }
    }

    // 检查新文件名是否已存在
    const newFilePath = path.join(GALLERY_DIR, `${cleanNewSlug}${oldExt}`);
    const conflictCheck = await checkFileConflict(newFilePath);
    if (conflictCheck) {
      return { success: false, error: conflictCheck.error || '文件已存在' };
    }

    // 重命名文件
    await fs.rename(oldFilePath, newFilePath);

    return { success: true };
  } catch (error) {
    console.error('重命名图库文件失败:', error);
    return { success: false, error: '重命名失败' };
  }
}

// DELETE - 删除文件
export async function adminDeleteGalleryFile(
  slug: string
): Promise<{ success: true } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('gallery:delete');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    // 尝试 .yml 和 .yaml 扩展名
    let filePath = path.join(GALLERY_DIR, `${slug}.yml`);
    try {
      await fs.access(filePath);
    } catch {
      filePath = path.join(GALLERY_DIR, `${slug}.yaml`);
    }

    await fs.unlink(filePath);
    return { success: true };
  } catch (error) {
    console.error('删除图库文件失败:', error);
    return { success: false, error: '删除失败，文件可能不存在' };
  }
}
