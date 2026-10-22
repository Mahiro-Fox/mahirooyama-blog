/**
 * 确定性伪随机数发生器（xoshiro128**）。
 * 仅使用 32 位整数运算，保证跨平台、跨浏览器结果一致。
 */

const TWO_POW_32 = 0x1_0000_0000;

function rotateLeft(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

/**
 * 用 16 字节种子初始化 PRNG，返回一个产生 uint32 的函数。
 */
export function createRng(seed: Uint8Array): () => number {
  if (seed.length < 16) {
    throw new Error('PRNG seed must contain at least 16 bytes');
  }

  const view = new DataView(seed.buffer, seed.byteOffset, seed.byteLength);
  let s0 = view.getUint32(0, true);
  let s1 = view.getUint32(4, true);
  let s2 = view.getUint32(8, true);
  let s3 = view.getUint32(12, true);

  // 全零状态会让 xoshiro 退化，做一次确定性修补
  if ((s0 | s1 | s2 | s3) === 0) {
    s0 = 0x9e3779b9;
    s1 = 0x243f6a88;
    s2 = 0xb7e15162;
    s3 = 0x1;
  }

  return function nextUint32(): number {
    const result = Math.imul(rotateLeft(Math.imul(s1, 5), 7), 9) >>> 0;
    const t = (s1 << 9) >>> 0;

    s2 = (s2 ^ s0) >>> 0;
    s3 = (s3 ^ s1) >>> 0;
    s1 = (s1 ^ s2) >>> 0;
    s0 = (s0 ^ s3) >>> 0;
    s2 = (s2 ^ t) >>> 0;
    s3 = rotateLeft(s3, 11);

    return result;
  };
}

/**
 * 产生 [0, maxExclusive) 的均匀随机整数。
 * 使用拒绝采样避免取模偏差。
 */
export function rngInt(rng: () => number, maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  if (maxExclusive === 1) return 0;

  const limit = TWO_POW_32 - (TWO_POW_32 % maxExclusive);

  // 极端参数下循环次数期望小于 2，安全
  for (;;) {
    const value = rng();
    if (value < limit) return value % maxExclusive;
  }
}

/**
 * 产生单个随机比特。
 */
export function rngBit(rng: () => number): number {
  return rng() & 1;
}
