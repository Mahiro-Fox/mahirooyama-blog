import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  ensureFileInitialized,
  isPathSafe,
  resolveContentPath,
  validateSlug,
  writeFileAtomic,
} from '@/utils/file-utils';

// 所有文件操作都跑在临时目录，绝不触碰真实 data/、uploads/
const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mahiroo-file-utils-'));

afterAll(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('validateSlug', () => {
  it('接受合法的 slug（小写字母、数字、连字符）', () => {
    expect(validateSlug('hello-world')).toBeNull();
    expect(validateSlug('sample-01')).toBeNull();
    expect(validateSlug('abc123')).toBeNull();
    expect(validateSlug('12312324')).toBeNull();
  });

  it('拒绝空字符串', () => {
    expect(validateSlug('')).not.toBeNull();
    expect(validateSlug('   ')).not.toBeNull();
  });

  it('拒绝大写字母', () => {
    expect(validateSlug('Hello')).not.toBeNull();
  });

  it('拒绝路径穿越字符', () => {
    expect(validateSlug('..')).not.toBeNull();
    expect(validateSlug('../../data/users')).not.toBeNull();
    expect(validateSlug('..%2F..%2Fetc')).not.toBeNull();
  });

  it('拒绝以分隔符开头/结尾或连续分隔符', () => {
    expect(validateSlug('-abc')).not.toBeNull();
    expect(validateSlug('abc-')).not.toBeNull();
    expect(validateSlug('a--b')).not.toBeNull();
  });

  it('拒绝超长 slug', () => {
    expect(validateSlug('a'.repeat(101))).not.toBeNull();
  });
});

describe('isPathSafe', () => {
  const base = path.join(tmpRoot, 'safe-dir');

  it('目录内的路径是安全的', () => {
    expect(isPathSafe(path.join(base, 'a.md'), base)).toBe(true);
    expect(isPathSafe(path.join(base, 'sub', 'b.json'), base)).toBe(true);
  });

  it('逃逸出目录的路径被拒绝', () => {
    expect(isPathSafe(path.join(base, '..', 'evil'), base)).toBe(false);
    expect(isPathSafe(path.join(tmpRoot, 'outside'), base)).toBe(false);
  });
});

describe('resolveContentPath', () => {
  const dir = path.join(tmpRoot, 'content');

  it('合法 slug 返回目录内路径', () => {
    const p = resolveContentPath(dir, 'hello-world', '.mdx');
    expect(p).toBe(path.join(dir, 'hello-world.mdx'));
  });

  it('路径穿越 slug 返回 null', () => {
    expect(resolveContentPath(dir, '../../data/users', '.json')).toBeNull();
    expect(resolveContentPath(dir, '..', '.json')).toBeNull();
    expect(resolveContentPath(dir, '../etc/passwd', '.json')).toBeNull();
  });

  it('非法 slug（大写/空）返回 null', () => {
    expect(resolveContentPath(dir, 'UPPER', '.mdx')).toBeNull();
    expect(resolveContentPath(dir, '', '.mdx')).toBeNull();
  });
});

describe('writeFileAtomic', () => {
  const dir = path.join(tmpRoot, 'atomic');
  const filePath = path.join(dir, 'data.json');

  it('写入成功且内容正确', async () => {
    await writeFileAtomic(filePath, JSON.stringify({ a: 1 }), {
      encoding: 'utf-8',
    });
    const content = await fs.readFile(filePath, 'utf-8');
    expect(JSON.parse(content)).toEqual({ a: 1 });
  });

  it('再次写入原子替换，且不残留临时文件', async () => {
    await writeFileAtomic(filePath, JSON.stringify({ b: 2 }), {
      encoding: 'utf-8',
    });
    const content = await fs.readFile(filePath, 'utf-8');
    expect(JSON.parse(content)).toEqual({ b: 2 });

    const leftovers = (await fs.readdir(dir)).filter((f) => f.endsWith('.tmp'));
    expect(leftovers).toHaveLength(0);
  });
});

describe('ensureFileInitialized', () => {
  const dir = path.join(tmpRoot, 'init');

  it('文件缺失时创建默认内容', async () => {
    const filePath = path.join(dir, 'empty.json');
    await ensureFileInitialized(filePath, '[]');
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('[]');
  });

  it('文件已存在时不覆盖', async () => {
    const filePath = path.join(dir, 'existing.json');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, '{"keep":true}', 'utf-8');

    await ensureFileInitialized(filePath, '[]');
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('{"keep":true}');
  });
});
