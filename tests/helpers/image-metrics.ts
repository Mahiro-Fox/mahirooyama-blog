/**
 * 图像质量指标：PSNR 与 SSIM（仅用于测试，不进入生产包）。
 */

const CHANNELS = 4;

function rgbAt(
  data: Uint8ClampedArray,
  pixelIndex: number
): [number, number, number] {
  const offset = pixelIndex * CHANNELS;
  return [data[offset], data[offset + 1], data[offset + 2]];
}

/**
 * 峰值信噪比（dB），只统计 RGB 通道。
 */
export function psnr(
  left: Uint8ClampedArray,
  right: Uint8ClampedArray
): number {
  if (left.length !== right.length) {
    throw new Error('PSNR inputs must have the same length');
  }

  const pixels = left.length / CHANNELS;
  let squaredError = 0;

  for (let index = 0; index < pixels; index += 1) {
    const offset = index * CHANNELS;
    for (let channel = 0; channel < 3; channel += 1) {
      const diff = left[offset + channel] - right[offset + channel];
      squaredError += diff * diff;
    }
  }

  const mse = squaredError / (pixels * 3);
  if (mse === 0) return Number.POSITIVE_INFINITY;

  return 10 * Math.log10((255 * 255) / mse);
}

function toGray(data: Uint8ClampedArray, pixels: number): Float64Array {
  const gray = new Float64Array(pixels);

  for (let index = 0; index < pixels; index += 1) {
    const [r, g, b] = rgbAt(data, index);
    gray[index] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  return gray;
}

/**
 * 分块 SSIM（8×8 窗口，步长 8），只统计亮度。
 */
export function ssim(
  left: Uint8ClampedArray,
  right: Uint8ClampedArray,
  width: number,
  height: number
): number {
  const pixels = width * height;
  const leftGray = toGray(left, pixels);
  const rightGray = toGray(right, pixels);

  const c1 = (0.01 * 255) ** 2;
  const c2 = (0.03 * 255) ** 2;
  const window = 8;
  let total = 0;
  let count = 0;

  for (let blockY = 0; blockY < height; blockY += window) {
    for (let blockX = 0; blockX < width; blockX += window) {
      let sumLeft = 0;
      let sumRight = 0;
      let sumLeftSq = 0;
      let sumRightSq = 0;
      let sumCross = 0;
      let samples = 0;

      const maxY = Math.min(blockY + window, height);
      const maxX = Math.min(blockX + window, width);

      for (let y = blockY; y < maxY; y += 1) {
        for (let x = blockX; x < maxX; x += 1) {
          const position = y * width + x;
          const l = leftGray[position];
          const r = rightGray[position];

          sumLeft += l;
          sumRight += r;
          sumLeftSq += l * l;
          sumRightSq += r * r;
          sumCross += l * r;
          samples += 1;
        }
      }

      if (samples === 0) continue;

      const meanLeft = sumLeft / samples;
      const meanRight = sumRight / samples;
      const varianceLeft = sumLeftSq / samples - meanLeft * meanLeft;
      const varianceRight = sumRightSq / samples - meanRight * meanRight;
      const covariance = sumCross / samples - meanLeft * meanRight;

      const numerator = (2 * meanLeft * meanRight + c1) * (2 * covariance + c2);
      const denominator =
        (meanLeft * meanLeft + meanRight * meanRight + c1) *
        (varianceLeft + varianceRight + c2);

      total += numerator / denominator;
      count += 1;
    }
  }

  return count === 0 ? 1 : total / count;
}
