'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { InstancedMesh } from 'three';
import { buildAtlas, type AtlasInfo } from './passage-gallery-atlas';
import { applyTileUniforms } from './passage-gallery-shader';
import {
  CELL,
  applyAtlasUniforms,
  assignTunnelCells,
  createTunnelAssets,
  fillTileMatrices,
} from './passage-gallery-tunnel';

export interface PassageGalleryItem {
  src: string;
  alt: string;
  title?: string;
}

export interface TunnelSceneProps {
  items: PassageGalleryItem[];
  colors: [string, string];
  backgroundColor: string;
  /** 地板／天花板横向格数，四壁同数；隧道横截面即 lanes × lanes */
  lanes: number;
  gap: number;
  radius: number;
  photoFill: number;
  accentFill: number;
  lineOpacity: number;
  fog: number;
  /** 巡航速度，单位「格 / 秒」 */
  speed: number;
  seed: number;
  paused: boolean;
}

/** 单帧最大步长，避免标签页切回时位置跳变 */
const MAX_STEP = 0.05;

/** 尊重系统的「减弱动态效果」：这类用户永远不巡航 */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export function TunnelScene(props: TunnelSceneProps) {
  const {
    items,
    colors,
    backgroundColor,
    lanes,
    gap,
    radius,
    photoFill,
    accentFill,
    lineOpacity,
    fog,
    speed,
    seed,
    paused,
  } = props;
  const [colorA, colorB] = colors;

  const [atlas, setAtlas] = useState<AtlasInfo | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const { gl, size } = useThree();

  // 图集与渲染解耦：先出隧道骨架，照片就绪后再补上照片格
  useEffect(() => {
    let alive = true;
    setAtlas(null);
    buildAtlas(items.map((item) => item.src)).then((next) => {
      if (alive) setAtlas(next);
    });
    return () => {
      alive = false;
    };
  }, [items]);

  const assets = useMemo(
    () =>
      createTunnelAssets({
        lanes,
        gap,
        radius,
        colors: [colorA, colorB],
        backgroundColor,
        lineOpacity,
        fog,
        viewportHeight: 1,
        seed,
      }),
    [lanes, gap, radius, colorA, colorB, backgroundColor, lineOpacity, fog, seed]
  );

  const meshRef = useRef<InstancedMesh>(null);
  const baseRef = useRef(Number.NaN);
  const travelRef = useRef(0);

  // 实例矩阵只跟池内行号／壁面／车道有关，只写一次
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    fillTileMatrices(mesh, assets.lanes, gap);
  }, [assets, gap]);

  // uniform 同步（用 layout effect，保证首帧渲染前就已就绪）
  useLayoutEffect(() => {
    applyTileUniforms(assets.uniforms, {
      colors: [colorA, colorB],
      backgroundColor,
      lineOpacity,
      radius,
      gap,
      fog,
      viewportHeight: size.height * gl.getPixelRatio(),
    });
  }, [
    assets,
    colorA,
    colorB,
    backgroundColor,
    lineOpacity,
    radius,
    gap,
    fog,
    size.height,
    gl,
  ]);

  useLayoutEffect(() => {
    applyAtlasUniforms(assets.uniforms, atlas);
    // 图集到位后需要重算一遍内容，才能把照片格点亮
    baseRef.current = Number.NaN;
  }, [assets, atlas]);

  useLayoutEffect(() => {
    baseRef.current = Number.NaN;
  }, [assets, photoFill, accentFill, seed]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const cruise = paused || reducedMotion ? 0 : speed;
    travelRef.current += cruise * Math.min(delta, MAX_STEP);

    const travel = travelRef.current;
    const base = Math.floor(travel);
    // 前进的小数部分由整个 mesh 平移承担，整数部分由内容回收承担
    mesh.position.z = (travel - base) * CELL;

    if (base !== baseRef.current) {
      baseRef.current = base;
      assignTunnelCells(assets, base, {
        lanes: assets.lanes,
        seed,
        photoFill,
        accentFill,
        photoCount: atlas?.count ?? 0,
      });
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[assets.geometry, assets.material, assets.count]}
      frustumCulled={false}
    />
  );
}
