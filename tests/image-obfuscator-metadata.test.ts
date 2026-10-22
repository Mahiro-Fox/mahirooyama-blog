import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  embedObfuscationMeta,
  readObfuscationMeta,
  type ObfuscationMeta,
} from '@/lib/image-obfuscator/metadata';
import { ALGORITHM_VERSION } from '@/lib/image-obfuscator/types';

const SAMPLE_META: ObfuscationMeta = {
  version: ALGORITHM_VERSION,
  strength: 1.35,
  enhancement: 'green-boost',
  password: 'meta-test-pass',
  format: 'jpeg',
  quality: 0.72,
};

async function makePng(): Promise<Uint8Array> {
  const buffer = await sharp({
    create: {
      width: 16,
      height: 12,
      channels: 4,
      background: { r: 30, g: 60, b: 90, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  return new Uint8Array(buffer);
}

async function makeJpeg(): Promise<Uint8Array> {
  const buffer = await sharp({
    create: {
      width: 16,
      height: 12,
      channels: 3,
      background: { r: 200, g: 120, b: 40 },
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();

  return new Uint8Array(buffer);
}

describe('图片参数元数据', () => {
  it('PNG 写入后可以完整读回，且图片仍能解码', async () => {
    const original = await makePng();
    const output = embedObfuscationMeta(original, SAMPLE_META);

    expect(output.length).toBeGreaterThan(original.length);
    expect(readObfuscationMeta(output)).toEqual(SAMPLE_META);

    const decoded = await sharp(Buffer.from(output)).metadata();
    expect(decoded.format).toBe('png');
    expect(decoded.width).toBe(16);
    expect(decoded.height).toBe(12);
  });

  it('JPEG 写入后可以完整读回，且图片仍能解码', async () => {
    const original = await makeJpeg();
    const output = embedObfuscationMeta(original, SAMPLE_META);

    expect(output.length).toBeGreaterThan(original.length);
    expect(readObfuscationMeta(output)).toEqual(SAMPLE_META);

    const decoded = await sharp(Buffer.from(output)).metadata();
    expect(decoded.format).toBe('jpeg');
    expect(decoded.width).toBe(16);
    expect(decoded.height).toBe(12);
  });

  it('没有写入过参数时返回 null', async () => {
    expect(readObfuscationMeta(await makePng())).toBeNull();
    expect(readObfuscationMeta(await makeJpeg())).toBeNull();
  });

  it('非图片字节不抛错并返回 null', () => {
    const text = new TextEncoder().encode('not an image at all');

    expect(readObfuscationMeta(text)).toBeNull();
    expect(embedObfuscationMeta(text, SAMPLE_META)).toBe(text);
  });

  it('无密码模式的元数据不写入密码字段', async () => {
    const meta: ObfuscationMeta = {
      version: ALGORITHM_VERSION,
      strength: 1,
      enhancement: 'none',
      format: 'png',
      quality: 0.85,
    };

    const output = embedObfuscationMeta(await makePng(), meta);
    const parsed = readObfuscationMeta(output);

    expect(parsed).toEqual(meta);
    expect(parsed?.password).toBeUndefined();
  });

  it('字段非法或版本不一致时不采信', async () => {
    const png = await makePng();

    const wrongVersion = embedObfuscationMeta(png, {
      ...SAMPLE_META,
      version: ALGORITHM_VERSION + 1,
    });
    expect(readObfuscationMeta(wrongVersion)).toBeNull();

    const brokenStrength = embedObfuscationMeta(png, {
      ...SAMPLE_META,
      strength: 5,
    });
    expect(readObfuscationMeta(brokenStrength)).toBeNull();
  });
});
