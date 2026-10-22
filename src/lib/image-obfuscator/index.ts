/**
 * 图片混淆核心 API（纯函数式，不依赖 DOM）。
 *
 * 混淆：曲线位移置换像素 → 可选增强
 * 还原：反向增强 → 曲线逆向位移
 *
 * 置换基于 Gilbert（广义 Hilbert）空间填充曲线：曲线给出覆盖全图的哈密顿路径，
 * 沿曲线整体循环位移 offset 位，offset 由密码派生。强度 < 1 时改为按 cellSize
 * 的方块整块搬运，强度 > 1 时额外叠加一轮转置曲线位移。
 *
 * 该模块可运行在 Web Worker 或 Node 测试环境中。
 */
import { buildCurveOrder, computeCellSize, type CurveVariant } from './curve';
import { getEnhancementLayer } from './enhancement';
import { createRng, rngInt } from './prng';
import {
  ALGORITHM_VERSION,
  createObfuscationError,
  DEFAULT_ITERATIONS,
  DEFAULT_SALT,
  DEFAULT_STRENGTH,
  MAX_PIXELS,
  MAX_SIDE,
  MAX_STRENGTH,
  MIN_STRENGTH,
  type ObfuscationMode,
  type ObfuscationOptions,
  type ObfuscationProgress,
  type ObfuscationStage,
  type RgbaImage,
} from './types';

const STAGE_RATIOS: Record<ObfuscationStage, [number, number]> = {
  'derive-key': [0, 0.1],
  'build-curve': [0.1, 0.3],
  permute: [0.3, 0.9],
  enhance: [0.9, 0.95],
  done: [1, 1],
};

const PERMUTE_PROGRESS_CHUNK = 1_048_576;

type Report = (stage: ObfuscationStage, ratio: number) => void;

function createReporter(options: ObfuscationOptions): Report {
  return (stage, ratio) => {
    const progress: ObfuscationProgress = { stage, ratio };
    options.onProgress?.(progress);
  };
}

function reportStage(
  report: Report,
  stage: ObfuscationStage,
  relative = 0
): void {
  const [start, end] = STAGE_RATIOS[stage];
  report(stage, start + (end - start) * relative);
}

function assertNotAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw createObfuscationError('ABORTED', 'Operation cancelled');
  }
}

function validateImage(image: RgbaImage): void {
  if (
    !image ||
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width <= 0 ||
    image.height <= 0
  ) {
    throw createObfuscationError(
      'INVALID_DIMENSION',
      'Image width and height must be positive integers'
    );
  }

  if (image.width > MAX_SIDE || image.height > MAX_SIDE) {
    throw createObfuscationError(
      'UNSUPPORTED_SIZE',
      `Image side must be <= ${MAX_SIDE}px`
    );
  }

  if (image.width * image.height > MAX_PIXELS) {
    throw createObfuscationError(
      'UNSUPPORTED_SIZE',
      `Image pixel count must be <= ${MAX_PIXELS}`
    );
  }

  if (
    !(image.data instanceof Uint8ClampedArray) ||
    image.data.length !== image.width * image.height * 4
  ) {
    throw createObfuscationError(
      'INVALID_IMAGE',
      'Image data length does not match width * height * 4'
    );
  }
}

function normalizeStrength(value: number | undefined): number {
  if (value === undefined) return DEFAULT_STRENGTH;
  if (!Number.isFinite(value)) {
    throw createObfuscationError('INVALID_STRENGTH', 'Strength must be finite');
  }
  return Math.min(MAX_STRENGTH, Math.max(MIN_STRENGTH, value));
}

function normalizeIterations(value: number | undefined): number {
  const iterations = value ?? DEFAULT_ITERATIONS;
  if (!Number.isInteger(iterations) || iterations <= 0) {
    throw createObfuscationError(
      'INTERNAL',
      'PBKDF2 iterations must be a positive integer'
    );
  }
  return iterations;
}

/**
 * PBKDF2-SHA256 派生 32 字节种子。
 * 盐只包含算法域与配置信息，不包含密码本身。
 */
async function deriveSeedMaterial(
  password: string,
  salt: string,
  iterations: number,
  version: number
): Promise<Uint8Array> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw createObfuscationError(
      'INSECURE_CONTEXT',
      'Web Crypto is unavailable; use HTTPS or localhost'
    );
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(`${DEFAULT_SALT}:v${version}:${salt}`),
      iterations,
      hash: 'SHA-256',
    },
    key,
    256
  );

  return new Uint8Array(bits);
}

/**
 * 由主种子和坐标派生 16 字节子种子，保证同一坐标在正向/逆向得到相同随机流。
 */
function deriveSubSeed(
  master: Uint8Array,
  a: number,
  b: number,
  c: number,
  d: number
): Uint8Array {
  const seed = new Uint8Array(16);
  const target = new DataView(seed.buffer);
  const source = new DataView(
    master.buffer,
    master.byteOffset,
    master.byteLength
  );

  for (let index = 0; index < 4; index += 1) {
    let hash = (source.getUint32(index * 4, true) ^ 0x9e3779b9) >>> 0;
    hash = Math.imul(hash ^ a, 0x85ebca6b) >>> 0;
    hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35) >>> 0;
    hash = Math.imul(hash ^ b, 0x27d4eb2f) >>> 0;
    hash = Math.imul(hash ^ (hash >>> 15), 0x9e3779b1) >>> 0;
    hash = Math.imul(hash ^ c, 0x165667b1) >>> 0;
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b) >>> 0;
    hash = (hash ^ (d + index * 0x9e3779b9)) >>> 0;
    target.setUint32(index * 4, hash, true);
  }

  return seed;
}

function copyImage(image: RgbaImage): RgbaImage {
  return {
    width: image.width,
    height: image.height,
    data: new Uint8ClampedArray(image.data),
  };
}

/**
 * 沿 Gilbert 曲线整体循环位移。
 *
 * 与 PNGPKG 的做法一致：曲线给出覆盖全图的哈密顿路径，位移量 offset 决定
 * 正向映射 dst[curve(i+offset)] = src[curve(i)]，逆向交换两者即为严格逆操作。
 *
 * 有密码时 offset 由密码派生；无密码时使用固定黄金分割偏移（与参考站一致）。
 * 强度 1 时只做一轮位移；高于 1 时依次叠加转置曲线、镜像曲线各一轮；
 * 强度 < 1 时改为按 cellSize 的方块整体搬运。
 */

/** 黄金分割比例，无密码模式下的固定位移比例 */
const GOLDEN_RATIO = (Math.sqrt(5) - 1) / 2;

/** 可用的曲线走向，按轮次依次使用 */
const CURVE_VARIANTS: CurveVariant[] = [0, 1, 2];

const MAX_ROUNDS = CURVE_VARIANTS.length;

function computeRounds(strength: number, cellSize: number): number {
  if (cellSize !== 1) return 1;
  if (strength > 1.5) return MAX_ROUNDS;
  return strength > 1 ? 2 : 1;
}

/**
 * 由密码派生的位移量。
 *
 * 位移落在 [total/4, 3total/4] 区间：位移量太接近 0 或 total 时
 * 只有曲线首尾的一小段像素被搬走，画面几乎看不出变化，因此排除这类取值。
 */
function deriveCurveOffset(
  seedMaterial: Uint8Array,
  round: number,
  total: number
): number {
  const rng = createRng(
    deriveSubSeed(seedMaterial, round * 2 + 1, 0x6f666673, 0, total)
  );

  if (total < 8) return rngInt(rng, total);

  const quarter = Math.floor(total / 4);
  return quarter + rngInt(rng, total - quarter * 2);
}

/**
 * 无密码模式的固定位移量：各轮使用黄金分割的连续小数倍，
 * 第一轮即参考站使用的 round(0.618 × total)。
 */
function derivePublicOffset(round: number, total: number): number {
  const fraction = ((round + 1) * GOLDEN_RATIO) % 1;
  return Math.round(fraction * total) % total;
}

/**
 * 无密码模式下的固定种子，仅用于增强层，保证正向/逆向得到同一随机流。
 * 不依赖 Web Crypto，因此无密码模式在非安全上下文下也能使用。
 */
function createPublicSeed(): Uint8Array {
  const seed = new Uint8Array(32);
  let state = 0x9e3779b9;

  for (let index = 0; index < seed.length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    seed[index] = state >>> 24;
  }

  return seed;
}

function applyCurvePass(
  source: Uint8ClampedArray,
  target: Uint8ClampedArray,
  width: number,
  height: number,
  cellSize: number,
  variant: CurveVariant,
  offset: number,
  inverse: boolean,
  report: Report,
  progressSpan: [number, number],
  signal: AbortSignal | undefined
): void {
  const gridWidth = width / cellSize;
  const gridHeight = height / cellSize;
  const total = gridWidth * gridHeight;
  const order = buildCurveOrder(gridWidth, gridHeight, variant);
  const totalPixels = width * height;

  let processed = 0;
  let nextProgress = PERMUTE_PROGRESS_CHUNK;

  const copyPixel = (destination: number, origin: number) => {
    const from = origin << 2;
    const to = destination << 2;
    target[to] = source[from];
    target[to + 1] = source[from + 1];
    target[to + 2] = source[from + 2];
    target[to + 3] = source[from + 3];
  };

  for (let index = 0; index < total; index += 1) {
    let shifted = index + offset;
    if (shifted >= total) shifted -= total;

    // 目标位置用 shifted，来源位置用 index；逆向时两者互换
    const destinationCell = order[inverse ? index : shifted];
    const originCell = order[inverse ? shifted : index];

    if (cellSize === 1) {
      copyPixel(destinationCell, originCell);
    } else {
      const destinationX = (destinationCell % gridWidth) * cellSize;
      const destinationY = ((destinationCell / gridWidth) | 0) * cellSize;
      const originX = (originCell % gridWidth) * cellSize;
      const originY = ((originCell / gridWidth) | 0) * cellSize;

      for (let dy = 0; dy < cellSize; dy += 1) {
        const destinationRow = (destinationY + dy) * width + destinationX;
        const originRow = (originY + dy) * width + originX;
        for (let dx = 0; dx < cellSize; dx += 1) {
          copyPixel(destinationRow + dx, originRow + dx);
        }
      }
    }

    processed += cellSize * cellSize;

    if (processed >= nextProgress) {
      nextProgress += PERMUTE_PROGRESS_CHUNK;
      assertNotAborted(signal);
      reportStage(
        report,
        'permute',
        progressSpan[0] +
          (progressSpan[1] - progressSpan[0]) * (processed / totalPixels)
      );
    }
  }
}

/**
 * 按轮次依次做曲线位移；还原时按相反顺序做逆位移。
 * 多轮时在另外两块缓冲区之间来回搬运，保证每轮读写不重叠。
 * `offsetFor` 决定每一轮的位移量来源（密码派生或固定常量）。
 */
function applyPermutationPipeline(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number,
  cellSize: number,
  offsetFor: (round: number, total: number) => number,
  inverse: boolean,
  report: Report,
  signal: AbortSignal | undefined
): Uint8ClampedArray {
  const rounds = computeRounds(strength, cellSize);
  const gridTotal = (width / cellSize) * (height / cellSize);
  const passes: Array<{ variant: CurveVariant; offset: number }> = [];

  for (let round = 0; round < rounds; round += 1) {
    passes.push({
      variant: CURVE_VARIANTS[round],
      offset: offsetFor(round, gridTotal),
    });
  }

  const ordered = inverse ? [...passes].reverse() : passes;
  const first = new Uint8ClampedArray(source.length);

  if (ordered.length === 1) {
    applyCurvePass(
      source,
      first,
      width,
      height,
      cellSize,
      ordered[0].variant,
      ordered[0].offset,
      inverse,
      report,
      [0, 1],
      signal
    );
    return first;
  }

  const second = new Uint8ClampedArray(source.length);
  let input = source;

  for (let round = 0; round < ordered.length; round += 1) {
    const target = round % 2 === 0 ? first : second;
    applyCurvePass(
      input,
      target,
      width,
      height,
      cellSize,
      ordered[round].variant,
      ordered[round].offset,
      inverse,
      report,
      [round / ordered.length, (round + 1) / ordered.length],
      signal
    );
    input = target;
  }

  return input;
}

async function transform(
  image: RgbaImage,
  options: ObfuscationOptions,
  mode: ObfuscationMode
): Promise<RgbaImage> {
  validateImage(image);

  const password = options.password ?? '';
  const hasPassword = password.length > 0;

  const strength = normalizeStrength(options.strength);
  const salt = options.salt ?? DEFAULT_SALT;
  const version = options.version ?? ALGORITHM_VERSION;
  const enhancementId = options.enhancement ?? 'none';
  const report = createReporter(options);

  assertNotAborted(options.signal);

  // 强度 0：明确的直通语义，不做任何像素操作
  if (strength === MIN_STRENGTH) {
    reportStage(report, 'done', 1);
    return copyImage(image);
  }

  // 粗粒度单元必须整除宽高，否则回退为逐像素置换
  let cellSize = computeCellSize(strength);
  if (
    cellSize > 1 &&
    (image.width % cellSize !== 0 || image.height % cellSize !== 0)
  ) {
    cellSize = 1;
  }

  reportStage(report, 'derive-key', 0);
  const seedMaterial = hasPassword
    ? await deriveSeedMaterial(
        password,
        salt,
        normalizeIterations(options.iterations),
        version
      )
    : createPublicSeed();
  assertNotAborted(options.signal);
  reportStage(report, 'derive-key', 1);

  // 有密码时 offset 由密码派生；无密码时使用固定黄金分割偏移
  const offsetFor = hasPassword
    ? (round: number, total: number) =>
        deriveCurveOffset(seedMaterial, round, total)
    : derivePublicOffset;

  const enhancement = getEnhancementLayer(enhancementId);
  let output: Uint8ClampedArray;

  if (mode === 'obfuscate') {
    output = applyPermutationPipeline(
      image.data,
      image.width,
      image.height,
      strength,
      cellSize,
      offsetFor,
      false,
      report,
      options.signal
    );

    if (enhancement) {
      reportStage(report, 'enhance', 0);
      enhancement.apply(output, seedMaterial);
      reportStage(report, 'enhance', 1);
    }
  } else {
    // 先在不破坏入参的前提下反向增强
    const working = enhancement
      ? new Uint8ClampedArray(image.data)
      : image.data;

    if (enhancement) {
      reportStage(report, 'enhance', 0);
      enhancement.revert(working, seedMaterial);
      reportStage(report, 'enhance', 1);
    }

    output = applyPermutationPipeline(
      working,
      image.width,
      image.height,
      strength,
      cellSize,
      offsetFor,
      true,
      report,
      options.signal
    );
  }

  assertNotAborted(options.signal);
  reportStage(report, 'done', 1);

  return {
    width: image.width,
    height: image.height,
    data: output,
  };
}

/**
 * 混淆图片像素。相同密码 + 相同参数 + 相同尺寸才可还原。
 */
export function obfuscateImageData(
  image: RgbaImage,
  options: ObfuscationOptions
): Promise<RgbaImage> {
  return transform(image, options, 'obfuscate');
}

/**
 * 还原图片像素，是 obfuscateImageData 的严格逆操作。
 */
export function deobfuscateImageData(
  image: RgbaImage,
  options: ObfuscationOptions
): Promise<RgbaImage> {
  return transform(image, options, 'deobfuscate');
}
