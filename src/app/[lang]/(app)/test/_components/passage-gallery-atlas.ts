/**
 * 照片图集。
 *
 * InstancedMesh 是一份几何体 + 一份材质，逐实例只能换属性、不能换贴图，
 * 所以照片必须先离屏拼成一张图集，再由片元着色器按 aTexIndex 取子矩形。
 * 图集格子统一按「中心方形裁切（cover）」绘制，着色器里就不必再做长宽比换算。
 */
import * as THREE from 'three';

/** 图集最长边上限 */
const MAX_ATLAS_EDGE = 4096;
/** 单格像素上限／下限 */
const MAX_TILE = 384;
const MIN_TILE = 128;

export interface AtlasInfo {
  texture: THREE.Texture;
  /** 成功加载并写入图集的照片数，着色器的 aTexIndex 落在 [0, count) */
  count: number;
  /** 图集格子下标 → 原始 items 下标（失败的图会被剔除，两者不一定相等） */
  itemIndices: number[];
  columns: number;
  rows: number;
  tile: number;
  /** 图集边长（正方形，着色器只需一个标量换算像素坐标） */
  edge: number;
}

export interface AtlasLayout {
  columns: number;
  rows: number;
  tile: number;
  edge: number;
}

/** 由照片数推出接近正方形的排布；图集本身也是正方形，边长不超过上限 */
export function atlasLayout(count: number): AtlasLayout {
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const grid = Math.max(columns, rows);
  const tile = Math.min(
    MAX_TILE,
    Math.max(MIN_TILE, Math.floor(MAX_ATLAS_EDGE / grid))
  );
  return { columns, rows, tile, edge: grid * tile };
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

/** 把原图中心方形区域缩放绘制到图集格子（等价于 CSS 的 object-fit: cover） */
function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  size: number
) {
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  if (side <= 0) return;
  const sx = (image.naturalWidth - side) / 2;
  const sy = (image.naturalHeight - side) / 2;
  ctx.drawImage(image, sx, sy, side, side, x, y, size, size);
}

/**
 * 并行加载所有照片并拼成图集。
 * 加载失败的图片会被剔除（不占格子），因此图集里的下标是连续的，
 * 同时返回「图集格子下标 → items 下标」的映射供 caption 取标题。
 */
export async function buildAtlas(
  sources: string[]
): Promise<AtlasInfo | null> {
  if (sources.length === 0) return null;

  const images = await Promise.all(sources.map(loadImage));
  const available = images
    .map((image, index) => ({ image, index }))
    .filter(
      (entry): entry is { image: HTMLImageElement; index: number } =>
        entry.image !== null
    );
  if (available.length === 0) return null;

  const layout = atlasLayout(available.length);
  const canvas = document.createElement('canvas');
  canvas.width = layout.edge;
  canvas.height = layout.edge;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  available.forEach((entry, slot) => {
    drawCover(
      ctx,
      entry.image,
      (slot % layout.columns) * layout.tile,
      Math.floor(slot / layout.columns) * layout.tile,
      layout.tile
    );
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // 图集不能开 mipmap：跨格采样会把相邻照片混进来
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return {
    texture,
    count: available.length,
    itemIndices: available.map((entry) => entry.index),
    ...layout,
  };
}
