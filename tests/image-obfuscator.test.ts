import { describe, expect, it } from 'vitest';
import {
  deobfuscateImageData,
  obfuscateImageData,
} from '@/lib/image-obfuscator';
import { buildCurveOrder, computeCellSize } from '@/lib/image-obfuscator/curve';
import type { RgbaImage } from '@/lib/image-obfuscator/types';

const TEST_ITERATIONS = 1_000;

function makeImage(width: number, height: number, seed = 1): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  let state = seed >>> 0;

  for (let index = 0; index < data.length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    data[index] = state >>> 24;
  }

  // 让 alpha 保持不透明，贴近照片场景
  for (let index = 3; index < data.length; index += 4) {
    data[index] = 255;
  }

  return { width, height, data };
}

function sameBytes(left: Uint8ClampedArray, right: Uint8ClampedArray): boolean {
  if (left.length !== right.length) return false;
  return Buffer.from(left.buffer, left.byteOffset, left.byteLength).equals(
    Buffer.from(right.buffer, right.byteOffset, right.byteLength)
  );
}

function createOptions(password = 'correct horse battery staple') {
  return {
    password,
    strength: 1,
    iterations: TEST_ITERATIONS,
  };
}

describe('obfuscateImageData / deobfuscateImageData', () => {
  it.each([
    [8, 8, 0.5],
    [17, 13, 1],
    [23, 37, 2],
    [64, 64, 0.37],
  ])('%i×%i 在强度 %s 下逐像素可逆', async (width, height, strength) => {
    const original = makeImage(width, height, width * 31 + height);
    const options = { ...createOptions(), strength };

    const obfuscated = await obfuscateImageData(original, options);
    const restored = await deobfuscateImageData(obfuscated, options);

    expect(restored.width).toBe(width);
    expect(restored.height).toBe(height);
    expect(sameBytes(restored.data, original.data)).toBe(true);
  });

  it('相同密码与参数产生完全相同的结果', async () => {
    const image = makeImage(48, 32, 7);
    const options = createOptions();

    const first = await obfuscateImageData(image, options);
    const second = await obfuscateImageData(image, options);

    expect(sameBytes(first.data, second.data)).toBe(true);
  });

  it('不同密码产生明显不同的结果', async () => {
    const image = makeImage(48, 32, 7);

    const first = await obfuscateImageData(image, createOptions('alpha'));
    const second = await obfuscateImageData(image, createOptions('beta'));

    let differentPixels = 0;
    const totalPixels = image.width * image.height;
    for (let index = 0; index < totalPixels; index += 1) {
      const offset = index * 4;
      if (
        first.data[offset] !== second.data[offset] ||
        first.data[offset + 1] !== second.data[offset + 1] ||
        first.data[offset + 2] !== second.data[offset + 2]
      ) {
        differentPixels += 1;
      }
    }

    expect(differentPixels / totalPixels).toBeGreaterThan(0.9);
  });

  it.each([
    [1, 1],
    [1, 257],
    [257, 1],
    [3, 5],
    [31, 1],
  ])('%i×%i 等极端尺寸不崩溃且可逆', async (width, height) => {
    const original = makeImage(width, height, 99);
    const options = createOptions();

    const obfuscated = await obfuscateImageData(original, options);
    const restored = await deobfuscateImageData(obfuscated, options);

    expect(sameBytes(restored.data, original.data)).toBe(true);
  });

  it('强度 0 为直通，输出与输入完全一致', async () => {
    const original = makeImage(12, 9, 3);
    const output = await obfuscateImageData(original, {
      ...createOptions(),
      strength: 0,
    });

    expect(sameBytes(output.data, original.data)).toBe(true);

    const restored = await deobfuscateImageData(output, {
      ...createOptions(),
      strength: 0,
    });
    expect(sameBytes(restored.data, original.data)).toBe(true);
  });

  it('强度超界会被夹取到 2', async () => {
    const image = makeImage(20, 20, 5);
    const base = createOptions();

    const clamped = await obfuscateImageData(image, {
      ...base,
      strength: 3,
    });
    const max = await obfuscateImageData(image, { ...base, strength: 2 });

    expect(sameBytes(clamped.data, max.data)).toBe(true);
  });

  it('非法强度会抛错', async () => {
    const image = makeImage(4, 4, 1);

    await expect(
      obfuscateImageData(image, {
        ...createOptions(),
        strength: Number.NaN,
      })
    ).rejects.toMatchObject({ code: 'INVALID_STRENGTH' });
  });

  it('省略密码时无需密码即可混淆与还原', async () => {
    const original = makeImage(32, 24, 17);
    const options = { strength: 1 };

    const obfuscated = await obfuscateImageData(original, options);
    const restored = await deobfuscateImageData(obfuscated, options);

    expect(sameBytes(restored.data, original.data)).toBe(true);
    expect(sameBytes(obfuscated.data, original.data)).toBe(false);
  });

  it('空字符串密码与省略密码结果一致', async () => {
    const original = makeImage(32, 24, 23);

    const empty = await obfuscateImageData(original, {
      password: '',
      strength: 1,
    });
    const omitted = await obfuscateImageData(original, { strength: 1 });

    expect(sameBytes(empty.data, omitted.data)).toBe(true);
  });

  it('无密码模式使用与参考站一致的固定黄金分割偏移', async () => {
    const width = 32;
    const height = 24;
    const total = width * height;
    const original = makeImage(width, height, 29);
    const obfuscated = await obfuscateImageData(original, { strength: 1 });

    const order = buildCurveOrder(width, height, 0);
    const offset = Math.round(((Math.sqrt(5) - 1) / 2) * total);
    const expected = new Uint8ClampedArray(original.data.length);

    for (let index = 0; index < total; index += 1) {
      const destination = order[(index + offset) % total] * 4;
      const source = order[index] * 4;
      expected[destination] = original.data[source];
      expected[destination + 1] = original.data[source + 1];
      expected[destination + 2] = original.data[source + 2];
      expected[destination + 3] = original.data[source + 3];
    }

    expect(sameBytes(obfuscated.data, expected)).toBe(true);
  });

  it('设置密码后结果与无密码模式不同', async () => {
    const original = makeImage(32, 24, 31);

    const withoutPassword = await obfuscateImageData(original, {
      strength: 1,
    });
    const withPassword = await obfuscateImageData(original, createOptions());

    expect(sameBytes(withoutPassword.data, withPassword.data)).toBe(false);
  });

  it('像素缓冲区长度不匹配会抛错', async () => {
    const broken: RgbaImage = {
      width: 4,
      height: 4,
      data: new Uint8ClampedArray(8),
    };

    await expect(
      obfuscateImageData(broken, createOptions())
    ).rejects.toMatchObject({ code: 'INVALID_IMAGE' });
  });

  it('不修改输入像素缓冲区', async () => {
    const original = makeImage(16, 16, 11);
    const snapshot = new Uint8ClampedArray(original.data);
    const options = createOptions();

    await obfuscateImageData(original, options);
    await deobfuscateImageData(original, options);

    expect(sameBytes(original.data, snapshot)).toBe(true);
  });

  it('绿图增强启用后 PNG 场景仍可逐像素还原', async () => {
    const original = makeImage(24, 18, 13);
    const options = {
      ...createOptions(),
      enhancement: 'green-boost' as const,
    };

    const obfuscated = await obfuscateImageData(original, options);
    const restored = await deobfuscateImageData(obfuscated, options);

    expect(sameBytes(restored.data, original.data)).toBe(true);
    expect(sameBytes(obfuscated.data, original.data)).toBe(false);
  });
});

describe('Gilbert 曲线顺序', () => {
  it.each([
    [1, 1],
    [1, 257],
    [257, 1],
    [3, 5],
    [5, 3],
    [9, 17],
    [17, 9],
    [31, 7],
    [64, 64],
    [24, 25],
  ])('%i×%i 生成覆盖全图的哈密顿路径', (width, height) => {
    const total = width * height;

    for (const variant of [0, 1, 2] as const) {
      const order = buildCurveOrder(width, height, variant);

      expect(order.length).toBe(total);

      // 双射：每个下标出现且仅出现一次
      const seen = new Uint8Array(total);
      for (const index of order) {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(total);
        seen[index] += 1;
      }
      expect(seen.every((count) => count === 1)).toBe(true);

      // 相邻曲线位置在网格上局部连续（8-邻接；广义 Gilbert 在个别尺寸下会出现对角步）
      for (let step = 1; step < total; step += 1) {
        const previous = order[step - 1];
        const current = order[step];
        const dx = Math.abs((previous % width) - (current % width));
        const dy = Math.abs(
          Math.floor(previous / width) - Math.floor(current / width)
        );
        expect(Math.max(dx, dy)).toBe(1);
      }
    }
  });

  it('computeCellSize 随强度降低而变粗', () => {
    expect(computeCellSize(0)).toBe(0);
    expect(computeCellSize(0.25)).toBe(4);
    expect(computeCellSize(0.5)).toBe(2);
    expect(computeCellSize(1)).toBe(1);
    expect(computeCellSize(2)).toBe(1);
  });
});
