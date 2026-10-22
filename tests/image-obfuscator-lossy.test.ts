import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  deobfuscateImageData,
  obfuscateImageData,
} from '@/lib/image-obfuscator';
import type { RgbaImage } from '@/lib/image-obfuscator/types';
import { psnr, ssim } from './helpers/image-metrics';

const SIZE = 256;
const TEST_ITERATIONS = 1_000;

/**
 * 构造一张平滑渐变 + 几何边缘的测试图，模拟真实照片的局部相关性。
 */
function makeTestImage(): RgbaImage {
  const data = new Uint8ClampedArray(SIZE * SIZE * 4);
  let noiseState = 20241022;

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const offset = (y * SIZE + x) * 4;
      const base = 40 + (x / SIZE) * 120 + (y / SIZE) * 60;
      const insideCircle = (x - 170) ** 2 + (y - 90) ** 2 < 45 ** 2 ? 70 : 0;
      const insideBar = x > 30 && x < 90 && y > 150 && y < 210 ? 55 : 0;
      const checker = ((x >> 2) + (y >> 2)) % 2 === 0 ? 18 : -18;

      noiseState = (Math.imul(noiseState, 1664525) + 1013904223) >>> 0;
      const noise = ((noiseState >>> 24) % 17) - 8;

      data[offset] = Math.min(255, base + insideCircle + checker + noise);
      data[offset + 1] = Math.min(
        255,
        base * 0.8 + insideBar + checker * 0.6 + noise
      );
      data[offset + 2] = Math.min(
        255,
        200 - (y / SIZE) * 90 + insideCircle / 2 - checker * 0.4 + noise
      );
      data[offset + 3] = 255;
    }
  }

  return { width: SIZE, height: SIZE, data };
}

function rgbaToRgb(image: RgbaImage): Buffer {
  const rgb = Buffer.alloc(SIZE * SIZE * 3);

  for (let index = 0; index < SIZE * SIZE; index += 1) {
    rgb[index * 3] = image.data[index * 4];
    rgb[index * 3 + 1] = image.data[index * 4 + 1];
    rgb[index * 3 + 2] = image.data[index * 4 + 2];
  }

  return rgb;
}

function rgbToRgba(data: Buffer): RgbaImage {
  const rgba = new Uint8ClampedArray(SIZE * SIZE * 4);

  for (let index = 0; index < SIZE * SIZE; index += 1) {
    rgba[index * 4] = data[index * 3];
    rgba[index * 4 + 1] = data[index * 3 + 1];
    rgba[index * 4 + 2] = data[index * 3 + 2];
    rgba[index * 4 + 3] = 255;
  }

  return { width: SIZE, height: SIZE, data: rgba };
}

describe('JPEG 有损场景', () => {
  it.each([1, 2])(
    '强度 %s 时解混淆后的图像保持可用的视觉质量',
    async (strength) => {
      const original = makeTestImage();
      const options = {
        password: 'lossy-test-password',
        strength,
        iterations: TEST_ITERATIONS,
      };

      const obfuscated = await obfuscateImageData(original, options);

      const jpegBuffer = await sharp(rgbaToRgb(obfuscated), {
        raw: { width: SIZE, height: SIZE, channels: 3 },
      })
        .jpeg({ quality: 80 })
        .toBuffer();

      const decoded = await sharp(jpegBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const lossy = rgbToRgba(decoded.data);
      const restored = await deobfuscateImageData(lossy, options);

      const obfuscatedPsnr = psnr(obfuscated.data, original.data);
      const restoredPsnr = psnr(restored.data, original.data);
      const restoredSsim = ssim(restored.data, original.data, SIZE, SIZE);

      // 混淆图与原图应当差异巨大
      expect(obfuscatedPsnr).toBeLessThan(20);

      // 有损场景下不要求逐像素一致，用指标验收
      expect(restoredPsnr).toBeGreaterThan(24);
      expect(restoredSsim).toBeGreaterThan(0.85);
    }
  );
});
