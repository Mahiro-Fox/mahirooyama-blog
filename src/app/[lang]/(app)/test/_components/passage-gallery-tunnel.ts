/**
 * 隧道本体：无限走廊靠「行索引回收」实现，而不是靠把隧道造得很长。
 *
 * 关键约定：
 * 1. 横截面是 lanes × lanes 格的正方形，四壁（地板 / 天花板 / 左墙 / 右墙）各 lanes 格。
 * 2. 实例矩阵只跟「池内行号 slot、壁面、车道」有关，因此只在初始化时写一次；
 *    相机前进的整数部分 base 决定每一行显示哪个 index，小数部分 frac 由整个 mesh 的 position.z 平移承担。
 *    这样每帧只更新一个平移量，跨过整数边界时才重算一遍内容。
 * 3. 内容（照片 / 渐变 / 空）由 hash(base + slot, lane, side, seed) 决定，所以同一个 index 的内容恒定，
 *    照片经过身边时不会跳动，也不需要保存任何历史。
 */
import * as THREE from 'three';
import type { AtlasInfo } from './passage-gallery-atlas';
import {
  createTileUniforms,
  tileFragmentShader,
  tileVertexShader,
  type TileUniformParams,
  type TileUniforms,
} from './passage-gallery-shader';

/** 单元格世界尺寸 */
export const CELL = 1;
/** 壁面数量：地板、天花板、左墙、右墙 */
const SIDE_COUNT = 4;
/** 池中行数下限 / 上限 */
const MIN_ROWS = 32;
const MAX_ROWS = 96;

export const KIND_EMPTY = 0;
export const KIND_PHOTO = 1;
export const KIND_ACCENT = 2;

/** 四壁编号：地板 / 天花板 / 左墙 / 右墙（与着色器、命中测试共用同一套约定） */
export const SIDE_FLOOR = 0;
export const SIDE_CEILING = 1;
export const SIDE_LEFT = 2;
export const SIDE_RIGHT = 3;

/** 一行的实例数：四壁 × 车道 */
function rowBlock(lanes: number) {
  return SIDE_COUNT * lanes;
}

/** 由雾强度推出「远端淡到不可见」所需行数，雾越弱池子越长 */
export function rowsForFog(fog: number): number {
  const falloff = 0.16 * Math.max(fog, 0.01);
  return Math.min(MAX_ROWS, Math.max(MIN_ROWS, Math.ceil(7 / falloff)));
}

function hash32(value: number): number {
  let h = value | 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

/** 三个整数 + 盐 → [0,1) 的确定性随机数（同输入永远同结果） */
export function hash01(a: number, b: number, c: number, salt: number): number {
  const mixed =
    Math.imul(a + 0x9e3779b9, 0x85ebca6b) ^
    Math.imul(b + 0x7f4a7c15, 0xc2b2ae35) ^
    Math.imul(c + 0x165667b1, 0x27d4eb2f) ^
    Math.imul(salt, 0x2545f491);
  return hash32(mixed) / 4294967296;
}

export interface TunnelAssets {
  mesh: THREE.InstancedMesh;
  material: THREE.ShaderMaterial;
  geometry: THREE.BufferGeometry;
  uniforms: TileUniforms;
  kind: THREE.InstancedBufferAttribute;
  texIndex: THREE.InstancedBufferAttribute;
  cellSeed: THREE.InstancedBufferAttribute;
  count: number;
  rows: number;
  lanes: number;
}

export interface TunnelParams extends TileUniformParams {
  lanes: number;
  seed: number;
  viewportHeight: number;
}

export function createTunnelAssets(params: TunnelParams): TunnelAssets {
  const lanes = Math.max(1, Math.round(params.lanes));
  const rows = rowsForFog(params.fog);
  const count = rows * SIDE_COUNT * lanes;

  // 复用单张单位平面：所有朝向都靠实例矩阵里的旋转完成
  const plane = new THREE.PlaneGeometry(CELL, CELL);
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(plane.getIndex());
  geometry.setAttribute('position', plane.getAttribute('position'));
  geometry.setAttribute('uv', plane.getAttribute('uv'));

  const kind = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  const texIndex = new THREE.InstancedBufferAttribute(
    new Float32Array(count),
    1
  );
  const cellSeed = new THREE.InstancedBufferAttribute(
    new Float32Array(count),
    1
  );
  geometry.setAttribute('aKind', kind);
  geometry.setAttribute('aTexIndex', texIndex);
  geometry.setAttribute('aSeed', cellSeed);

  const uniforms = createTileUniforms(params);
  const material = new THREE.ShaderMaterial({
    vertexShader: tileVertexShader,
    fragmentShader: tileFragmentShader,
    uniforms,
    transparent: true,
  });
  material.depthWrite = true;

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;

  return {
    mesh,
    material,
    geometry,
    uniforms,
    kind,
    texIndex,
    cellSeed,
    count,
    rows,
    lanes,
  };
}

/** 池内实例序号：((slot × 四壁) + side) × lanes + lane */
export function instanceIndex(
  rows: number,
  lanes: number,
  slot: number,
  side: number,
  lane: number
) {
  return (slot * SIDE_COUNT + side) * lanes + lane;
}

/** 复用同一组临时量，避免在初始化循环里反复分配 */
const TILE_POSITION = new THREE.Vector3();
const TILE_QUATERNION = new THREE.Quaternion();
const TILE_EULER = new THREE.Euler();
const TILE_SCALE = new THREE.Vector3();

/**
 * 写一格的世界变换：位置 + 朝向 + 缩放。
 * 四壁朝向：地板法线朝上、天花板朝下、左右墙朝内。
 * 飞到镜前的焦点瓦片也用同一套变换，保证起飞姿态与墙上那格完全一致。
 */
export function composeTileMatrix(
  out: THREE.Matrix4,
  side: number,
  lane: number,
  z: number,
  lanes: number,
  gap: number
) {
  const half = lanes / 2;
  const size = CELL - gap;
  const offset = (lane + 0.5 - half) * CELL;

  if (side === SIDE_FLOOR) {
    TILE_POSITION.set(offset, -half, z);
    TILE_EULER.set(-Math.PI / 2, 0, 0);
  } else if (side === SIDE_CEILING) {
    TILE_POSITION.set(offset, half, z);
    TILE_EULER.set(Math.PI / 2, 0, 0);
  } else if (side === SIDE_LEFT) {
    TILE_POSITION.set(-half, offset, z);
    TILE_EULER.set(0, Math.PI / 2, 0);
  } else {
    TILE_POSITION.set(half, offset, z);
    TILE_EULER.set(0, -Math.PI / 2, 0);
  }

  TILE_QUATERNION.setFromEuler(TILE_EULER);
  TILE_SCALE.set(size, size, 1);
  return out.compose(TILE_POSITION, TILE_QUATERNION, TILE_SCALE);
}

/**
 * 写一次实例矩阵：z = -slot 固定，前进的小数部分交给 mesh.position.z。
 */
export function fillTileMatrices(
  mesh: THREE.InstancedMesh,
  lanes: number,
  gap: number
) {
  const rows = Math.floor(mesh.count / rowBlock(lanes));
  const matrix = new THREE.Matrix4();

  for (let slot = 0; slot < rows; slot += 1) {
    for (let face = 0; face < SIDE_COUNT; face += 1) {
      for (let lane = 0; lane < lanes; lane += 1) {
        composeTileMatrix(matrix, face, lane, -slot, lanes, gap);
        mesh.setMatrixAt(instanceIndex(rows, lanes, slot, face, lane), matrix);
      }
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
}

export interface CellContentParams {
  lanes: number;
  seed: number;
  photoFill: number;
  accentFill: number;
  photoCount: number;
}

export interface CellContent {
  kind: number;
  texIndex: number;
  seed: number;
}

/**
 * 单格内容的纯函数判定。
 * photoFill 与 accentFill 都是「占全部格子的比例」，各自独立掷骰，同一格冲突时照片优先；
 * 没有可用照片时照片格降级成空格，避免采样到未就绪的图集。
 *
 * 命中测试与内容写入共用这一个函数，这样「点到的」与「看到的」永远一致，
 * 不需要去读实例缓冲。
 */
export function cellContentAt(
  index: number,
  lane: number,
  side: number,
  params: CellContentParams
): CellContent {
  const { photoFill, accentFill, seed, photoCount } = params;
  const grain = hash01(index, lane, side, seed + 5501);

  if (photoCount > 0 && hash01(index, lane, side, seed) < photoFill) {
    return {
      kind: KIND_PHOTO,
      texIndex: Math.floor(hash01(index, lane, side, seed + 977) * photoCount),
      seed: grain,
    };
  }
  if (hash01(index, lane, side, seed + 3301) < accentFill) {
    return { kind: KIND_ACCENT, texIndex: 0, seed: grain };
  }
  return { kind: KIND_EMPTY, texIndex: 0, seed: grain };
}

/** 写入一行（同一 index 的四壁 × lanes 格） */
function writeTunnelRow(
  assets: TunnelAssets,
  slot: number,
  index: number,
  params: CellContentParams
) {
  const { lanes } = assets;
  const kindArray = assets.kind.array as Float32Array;
  const texIndexArray = assets.texIndex.array as Float32Array;
  const seedArray = assets.cellSeed.array as Float32Array;

  for (let face = 0; face < SIDE_COUNT; face += 1) {
    for (let lane = 0; lane < lanes; lane += 1) {
      const at = instanceIndex(assets.rows, lanes, slot, face, lane);
      const content = cellContentAt(index, lane, face, params);
      kindArray[at] = content.kind;
      texIndexArray[at] = content.texIndex;
      seedArray[at] = content.seed;
    }
  }
}

function markContentDirty(assets: TunnelAssets) {
  assets.kind.needsUpdate = true;
  assets.texIndex.needsUpdate = true;
  assets.cellSeed.needsUpdate = true;
}

/** 按 base 重算整池内容 */
export function assignTunnelCells(
  assets: TunnelAssets,
  base: number,
  params: CellContentParams
) {
  for (let slot = 0; slot < assets.rows; slot += 1) {
    writeTunnelRow(assets, slot, base + slot, params);
  }
  markContentDirty(assets);
}

/**
 * base 一次跨过多个整数时的增量回收：把仍在池里的行整块平移，只补新进入的行。
 * 新 slot 的 index 为 base + slot，因此新 slot s 与旧 slot (s + delta) 内容相同，
 * 用 copyWithin 一次搬完（它内部按 memmove 处理重叠，方向安全）。
 * 步长超过池长或方向为负时退回整池重算，逻辑简单且只发生在极端情况。
 */
export function advanceTunnelCells(
  assets: TunnelAssets,
  base: number,
  delta: number,
  params: CellContentParams
) {
  const step = Math.trunc(delta);
  if (step === 0) return;

  const { rows, lanes } = assets;
  if (step < 0 || step >= rows) {
    assignTunnelCells(assets, base, params);
    return;
  }

  const block = rowBlock(lanes);
  const kindArray = assets.kind.array as Float32Array;
  const texIndexArray = assets.texIndex.array as Float32Array;
  const seedArray = assets.cellSeed.array as Float32Array;

  kindArray.copyWithin(0, step * block, rows * block);
  texIndexArray.copyWithin(0, step * block, rows * block);
  seedArray.copyWithin(0, step * block, rows * block);

  for (let slot = rows - step; slot < rows; slot += 1) {
    writeTunnelRow(assets, slot, base + slot, params);
  }
  markContentDirty(assets);
}

export interface TunnelRay {
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
}

export interface TunnelHit {
  /** 命中的壁面编号 */
  side: number;
  /** 命中的车道 */
  lane: number;
  /** 命中瓦片的内容 index（base + slot） */
  index: number;
  /** 命中点在隧道内的世界坐标 */
  x: number;
  y: number;
  z: number;
}

/**
 * 解析法命中判定：射线与 x = ±half / y = ±half 四个平面求交，取最近的有效命中。
 * 「有效」指另一个坐标落在 [-half, half] 内，且交点在相机前方。
 * 比 raycaster 便宜得多，也不会受实例缓冲影响。
 */
export function hitTunnel(
  ray: TunnelRay,
  lanes: number,
  travel: number
): TunnelHit | null {
  const half = lanes / 2;
  let best = Number.POSITIVE_INFINITY;
  let side = -1;
  let lane = -1;
  let hx = 0;
  let hy = 0;
  let hz = 0;

  const EPSILON = 1e-6;

  // 地板（y = -half）与天花板（y = +half）：车道沿 x 排布
  if (Math.abs(ray.dy) > EPSILON) {
    for (let sign = -1; sign <= 1; sign += 2) {
      const t = (sign * half - ray.y) / ray.dy;
      if (t <= EPSILON || t >= best) continue;
      const x = ray.x + t * ray.dx;
      if (x < -half || x > half) continue;
      best = t;
      side = sign < 0 ? SIDE_FLOOR : SIDE_CEILING;
      lane = clampLane(Math.floor(x + half), lanes);
      hx = x;
      hy = sign * half;
      hz = ray.z + t * ray.dz;
    }
  }

  // 左墙（x = -half）与右墙（x = +half）：车道沿 y 排布
  if (Math.abs(ray.dx) > EPSILON) {
    for (let sign = -1; sign <= 1; sign += 2) {
      const t = (sign * half - ray.x) / ray.dx;
      if (t <= EPSILON || t >= best) continue;
      const y = ray.y + t * ray.dy;
      if (y < -half || y > half) continue;
      best = t;
      side = sign < 0 ? SIDE_LEFT : SIDE_RIGHT;
      lane = clampLane(Math.floor(y + half), lanes);
      hx = sign * half;
      hy = y;
      hz = ray.z + t * ray.dz;
    }
  }

  if (side < 0) return null;
  // 世界 z 与 index 的关系：z = travel - index（整数部分已由内容回收承担）
  return { side, lane, index: Math.round(travel - hz), x: hx, y: hy, z: hz };
}

function clampLane(value: number, lanes: number) {
  return Math.min(lanes - 1, Math.max(0, value));
}

/** 把图集尺寸写进 uniform（图集就绪／替换时调用） */
export function applyAtlasUniforms(
  uniforms: TileUniforms,
  atlas: AtlasInfo | null
) {
  uniforms.uAtlas.value = atlas?.texture ?? null;
  uniforms.uAtlasGrid.value.set(atlas?.columns ?? 1, atlas?.rows ?? 1);
  uniforms.uAtlasTile.value = atlas?.tile ?? 1;
  uniforms.uAtlasEdge.value = atlas?.edge ?? 1;
}
