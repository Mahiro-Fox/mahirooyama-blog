/**
 * 可插拔增强层。
 * 增强层必须提供严格互逆的 apply / revert；它只作为额外的视觉层，
 * 不参与核心置换，默认关闭。
 */
import type { EnhancementId } from './types';

export interface EnhancementLayer {
  readonly id: EnhancementId;
  apply(data: Uint8ClampedArray, seed: Uint8Array): void;
  revert(data: Uint8ClampedArray, seed: Uint8Array): void;
}

/**
 * 绿图增强（实验）：对绿色通道做模 256 的常量偏移。
 * 仅对无损格式（PNG）保证可逆；JPG 有损压缩后无法逐像素还原。
 */
const greenBoostLayer: EnhancementLayer = {
  id: 'green-boost',
  apply(data, seed) {
    const delta = (seed[0] % 128) + 1;
    for (let index = 1; index < data.length; index += 4) {
      data[index] = (data[index] + delta) & 0xff;
    }
  },
  revert(data, seed) {
    const delta = (seed[0] % 128) + 1;
    for (let index = 1; index < data.length; index += 4) {
      data[index] = (data[index] - delta + 256) & 0xff;
    }
  },
};

const enhancementRegistry: Record<EnhancementId, EnhancementLayer | null> = {
  none: null,
  'green-boost': greenBoostLayer,
};

/**
 * 按 id 取增强层，未知 id 视为 none。
 */
export function getEnhancementLayer(
  id: EnhancementId | undefined
): EnhancementLayer | null {
  if (!id) return null;
  return enhancementRegistry[id] ?? null;
}
