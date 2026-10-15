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

/**
 * 写一次实例矩阵：z = -slot 固定，前进的小数部分交给 mesh.position.z。
 * 四壁朝向：地板法线朝上、天花板朝下、左右墙朝内。
 */
export function fillTileMatrices(
  mesh: THREE.InstancedMesh,
  lanes: number,
  gap: number
) {
  const rows = Math.floor(mesh.count / (SIDE_COUNT * lanes));
  const side = CELL - gap;
  const half = lanes / 2;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3(side, side, 1);
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();

  for (let slot = 0; slot < rows; slot += 1) {
    for (let face = 0; face < SIDE_COUNT; face += 1) {
      for (let lane = 0; lane < lanes; lane += 1) {
        const offset = (lane + 0.5 - half) * CELL;
        if (face === 0) {
          position.set(offset, -half, -slot);
          euler.set(-Math.PI / 2, 0, 0);
        } else if (face === 1) {
          position.set(offset, half, -slot);
          euler.set(Math.PI / 2, 0, 0);
        } else if (face === 2) {
          position.set(-half, offset, -slot);
          euler.set(0, Math.PI / 2, 0);
        } else {
          position.set(half, offset, -slot);
          euler.set(0, -Math.PI / 2, 0);
        }
        quaternion.setFromEuler(euler);
        matrix.compose(position, quaternion, scale);
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

/**
 * 按 base 重算整池内容。
 * photoFill 与 accentFill 都是「占全部格子的比例」，各自独立掷骰，同一格冲突时照片优先；
 * 没有可用照片时照片格降级成空格，避免采样到未就绪的图集。
 */
export function assignTunnelCells(
  assets: TunnelAssets,
  base: number,
  params: CellContentParams
) {
  const { rows, lanes } = assets;
  const kindArray = assets.kind.array as Float32Array;
  const texIndexArray = assets.texIndex.array as Float32Array;
  const seedArray = assets.cellSeed.array as Float32Array;
  const { photoFill, accentFill, seed, photoCount } = params;

  for (let slot = 0; slot < rows; slot += 1) {
    const index = base + slot;
    for (let face = 0; face < SIDE_COUNT; face += 1) {
      for (let lane = 0; lane < lanes; lane += 1) {
        const at = instanceIndex(rows, lanes, slot, face, lane);
        const wantsPhoto = hash01(index, lane, face, seed) < photoFill && photoCount > 0;
        const wantsAccent =
          !wantsPhoto && hash01(index, lane, face, seed + 3301) < accentFill;
        if (wantsPhoto) {
          kindArray[at] = KIND_PHOTO;
          texIndexArray[at] = Math.floor(
            hash01(index, lane, face, seed + 977) * photoCount
          );
        } else if (wantsAccent) {
          kindArray[at] = KIND_ACCENT;
          texIndexArray[at] = 0;
        } else {
          kindArray[at] = KIND_EMPTY;
          texIndexArray[at] = 0;
        }
        seedArray[at] = hash01(index, lane, face, seed + 5501);
      }
    }
  }

  assets.kind.needsUpdate = true;
  assets.texIndex.needsUpdate = true;
  assets.cellSeed.needsUpdate = true;
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
