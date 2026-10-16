'use client';

import { useFrame, useThree } from '@react-three/fiber';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import * as THREE from 'three';
import { buildAtlas, type AtlasInfo } from './passage-gallery-atlas';
import { applyTileUniforms, createFocusMaterial } from './passage-gallery-shader';
import { TrailRenderer } from './passage-gallery-trail';
import {
  CELL,
  KIND_PHOTO,
  advanceTunnelCells,
  applyAtlasUniforms,
  assignTunnelCells,
  cellContentAt,
  composeTileMatrix,
  createTunnelAssets,
  fillTileMatrices,
  hitTunnel,
  type CellContent,
  type CellContentParams,
  type TunnelHit,
} from './passage-gallery-tunnel';

export interface PassageGalleryItem {
  src: string;
  alt: string;
  title?: string;
}

/**
 * 指针输入。
 * 用可变对象在 DOM 事件与渲染帧之间传值：视差如果走 React state，
 * 指针一动就是 60fps 的重渲染，纯属自找麻烦。
 */
export interface PointerInput {
  /** 归一化坐标，[-1, 1]，向右 / 向上为正 */
  ndcX: number;
  ndcY: number;
  /** 是否按住（用于加速巡航） */
  holding: boolean;
  /** 待处理的点击位置，场景消费后置空 */
  pendingClick: { x: number; y: number } | null;
  /** 待处理的收回请求（Esc） */
  pendingRelease: boolean;
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
  /** 关掉指针视差与加速 */
  interactive: boolean;
  /** 指针视差幅度，1 为默认 */
  look: number;
  /** 按住时的巡航倍率 */
  boost: number;
  /** 拖尾模糊强度，0 关闭 */
  blur: number;
  /** 点击照片是否飞到镜前 */
  focusOnClick: boolean;
  input: RefObject<PointerInput>;
  onFocusChange?: (item: PassageGalleryItem | null, index: number) => void;
}

/** 单帧最大步长，避免标签页切回时位置跳变 */
const MAX_STEP = 0.05;

/** 视差：位移与朝向一起朝指针方向阻尼跟随（位移很小，隧道横截面只有 lanes 宽） */
const LOOK_POSITION_X = 0.34;
const LOOK_POSITION_Y = 0.3;
const LOOK_ROTATION_X = 0.08;
const LOOK_ROTATION_Y = -0.09;
const LOOK_DAMP = 7;

/** 焦点瓦片：飞出时长、镜前距离、占画面比例 */
const FOCUS_DURATION = 0.42;
const FOCUS_DISTANCE = 2.3;
const FOCUS_FILL = 0.62;

const TEMP_NDC = new THREE.Vector2();
const TEMP_MATRIX = new THREE.Matrix4();
const FOCUS_DIRECTION = new THREE.Vector3();
const FOCUS_POSITION = new THREE.Vector3();
const FOCUS_QUATERNION = new THREE.Quaternion();
const FOCUS_SCALE = new THREE.Vector3();

/** 焦点状态：起飞位姿 + 进度 + 它来自哪一格 */
interface FocusState {
  active: boolean;
  mode: 'in' | 'out';
  progress: number;
  side: number;
  lane: number;
  index: number;
  itemIndex: number;
  startPosition: THREE.Vector3;
  startQuaternion: THREE.Quaternion;
  startScale: THREE.Vector3;
}

function createFocusState(): FocusState {
  return {
    active: false,
    mode: 'in',
    progress: 0,
    side: 0,
    lane: 0,
    index: 0,
    itemIndex: -1,
    startPosition: new THREE.Vector3(),
    startQuaternion: new THREE.Quaternion(),
    startScale: new THREE.Vector3(1, 1, 1),
  };
}

/** 尊重系统的「减弱动态效果」：这类用户永远不巡航、不视差，飞出也近乎瞬时 */
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

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function applyLook(
  camera: THREE.Camera,
  ndcX: number,
  ndcY: number,
  look: number,
  delta: number
) {
  const k = 1 - Math.exp(-LOOK_DAMP * delta);
  camera.position.x += (ndcX * look * LOOK_POSITION_X - camera.position.x) * k;
  camera.position.y += (ndcY * look * LOOK_POSITION_Y - camera.position.y) * k;
  camera.rotation.x += (ndcY * look * LOOK_ROTATION_X - camera.rotation.x) * k;
  camera.rotation.y += (ndcX * look * LOOK_ROTATION_Y - camera.rotation.y) * k;
}

/**
 * 镜前目标位姿：贴在相机正前方固定距离、正面朝向相机。
 * 返回该位姿下的边长（按画面较窄的一边取占比，竖屏也不会溢出）。
 */
function focusTargetPose(
  camera: THREE.Camera,
  outPosition: THREE.Vector3,
  outQuaternion: THREE.Quaternion
) {
  const perspective = camera as THREE.PerspectiveCamera;
  camera.getWorldDirection(FOCUS_DIRECTION);
  outPosition
    .copy(camera.position)
    .addScaledVector(FOCUS_DIRECTION, FOCUS_DISTANCE);
  outQuaternion.copy(camera.quaternion);

  const height =
    2 * FOCUS_DISTANCE * Math.tan((perspective.fov * Math.PI) / 360);
  const width = height * (perspective.aspect || 1);
  return Math.min(height, width) * FOCUS_FILL;
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
    interactive,
    look,
    boost,
    blur,
    focusOnClick,
    input,
    onFocusChange,
  } = props;
  const [colorA, colorB] = colors;

  const [atlas, setAtlas] = useState<AtlasInfo | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const { gl, size, camera } = useThree();

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

  // 隧道骨架与焦点瓦片材质同批创建，色／雾／圆角等一旦变化就整体重建
  const rig = useMemo(() => {
    const tileParams = {
      colors: [colorA, colorB] as [string, string],
      backgroundColor,
      lineOpacity,
      radius,
      gap,
      fog,
      viewportHeight: 1,
    };
    return {
      assets: createTunnelAssets({ ...tileParams, lanes, seed }),
      focus: createFocusMaterial(tileParams),
    };
  }, [
    lanes,
    gap,
    radius,
    colorA,
    colorB,
    backgroundColor,
    lineOpacity,
    fog,
    seed,
  ]);

  const contentParams = useMemo<CellContentParams>(
    () => ({
      lanes: rig.assets.lanes,
      seed,
      photoFill,
      accentFill,
      photoCount: atlas?.count ?? 0,
    }),
    [rig, seed, photoFill, accentFill, atlas]
  );

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const focusMeshRef = useRef<THREE.Mesh>(null);
  const focusStateRef = useRef<FocusState>(createFocusState());
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const velocityRef = useRef(0);
  const baseRef = useRef(Number.NaN);
  const travelRef = useRef(0);

  const focusMesh = useMemo(() => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(CELL, CELL),
      rig.focus.material
    );
    mesh.visible = false;
    mesh.frustumCulled = false;
    return mesh;
  }, [rig]);

  useEffect(
    () => () => {
      focusMesh.geometry.dispose();
      rig.focus.material.dispose();
    },
    [focusMesh, rig]
  );

  // 实例矩阵只跟池内行号／壁面／车道有关，只写一次
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    fillTileMatrices(mesh, rig.assets.lanes, gap);
  }, [rig, gap]);

  // uniform 同步（用 layout effect，保证首帧渲染前就已就绪）
  useLayoutEffect(() => {
    const tileParams = {
      colors: [colorA, colorB] as [string, string],
      backgroundColor,
      lineOpacity,
      radius,
      gap,
      fog,
      viewportHeight: size.height * gl.getPixelRatio(),
    };
    applyTileUniforms(rig.assets.uniforms, tileParams);
    applyTileUniforms(rig.focus.uniforms, tileParams);
  }, [
    rig,
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
    applyAtlasUniforms(rig.assets.uniforms, atlas);
    applyAtlasUniforms(rig.focus.uniforms, atlas);
    // 图集到位后需要重算一遍内容，才能把照片格点亮
    baseRef.current = Number.NaN;
  }, [rig, atlas]);

  useLayoutEffect(() => {
    baseRef.current = Number.NaN;
  }, [rig, contentParams]);

  /** 命中点的内容判定与墙上写入共用同一套哈希，所以点到的就是看到的 */
  function hitAt(ndcX: number, ndcY: number): TunnelHit | null {
    raycaster.setFromCamera(TEMP_NDC.set(ndcX, ndcY), camera);
    const { origin, direction } = raycaster.ray;
    return hitTunnel(
      {
        x: origin.x,
        y: origin.y,
        z: origin.z,
        dx: direction.x,
        dy: direction.y,
        dz: direction.z,
      },
      rig.assets.lanes,
      travelRef.current
    );
  }

  function startFocus(hit: TunnelHit, content: CellContent, itemIndex: number) {
    const mesh = focusMeshRef.current;
    const state = focusStateRef.current;
    if (!mesh) return;

    // 起飞姿态与墙上那一格完全一致，否则一眼就看出是另一个东西
    composeTileMatrix(
      TEMP_MATRIX,
      hit.side,
      hit.lane,
      hit.z,
      rig.assets.lanes,
      gap
    );
    TEMP_MATRIX.decompose(
      state.startPosition,
      state.startQuaternion,
      state.startScale
    );

    rig.focus.uniforms.uTexIndex.value = content.texIndex;
    rig.focus.uniforms.uKind.value = content.kind;
    rig.focus.uniforms.uSeed.value = content.seed;

    state.active = true;
    state.mode = 'in';
    state.progress = 0;
    state.side = hit.side;
    state.lane = hit.lane;
    state.index = hit.index;
    state.itemIndex = itemIndex;

    mesh.position.copy(state.startPosition);
    mesh.quaternion.copy(state.startQuaternion);
    mesh.scale.copy(state.startScale);
    mesh.visible = true;

    onFocusChange?.(itemIndex >= 0 ? (items[itemIndex] ?? null) : null, itemIndex);
  }

  /** 收回：目标位姿跟着仍在巡航的那一格走，落回时与墙上严丝合缝 */
  function refreshStartPose(state: FocusState) {
    composeTileMatrix(
      TEMP_MATRIX,
      state.side,
      state.lane,
      travelRef.current - state.index,
      rig.assets.lanes,
      gap
    );
    TEMP_MATRIX.decompose(
      state.startPosition,
      state.startQuaternion,
      state.startScale
    );
  }

  function startRetract() {
    const state = focusStateRef.current;
    if (!state.active) return;
    state.mode = 'out';
    onFocusChange?.(null, -1);
  }

  function handleClick(ndcX: number, ndcY: number) {
    const state = focusStateRef.current;
    // 已经有一张飞在镜头前时，再点一下就是收回
    if (state.active) {
      startRetract();
      return;
    }
    if ((atlas?.count ?? 0) === 0) return;

    const hit = hitAt(ndcX, ndcY);
    if (!hit) return;

    const content = cellContentAt(
      hit.index,
      hit.lane,
      hit.side,
      contentParams
    );
    // 空瓦片只是隧道壁，点它没有意义；渐变格也不承载照片信息
    if (content.kind !== KIND_PHOTO) return;

    const itemIndex = atlas?.itemIndices[content.texIndex] ?? -1;
    startFocus(hit, content, itemIndex);
  }

  function updateFocus(delta: number) {
    const mesh = focusMeshRef.current;
    const state = focusStateRef.current;
    if (!mesh || !state.active) return;

    const duration = reducedMotion ? 0.01 : FOCUS_DURATION;
    const step = delta / duration;
    state.progress = Math.min(
      1,
      Math.max(0, state.progress + (state.mode === 'in' ? step : -step))
    );

    // 退回时起点跟着格子走，避免落回一个空位
    if (state.mode === 'out') refreshStartPose(state);

    const eased =
      state.mode === 'in' ? easeOutCubic(state.progress) : state.progress;
    const edge = focusTargetPose(camera, FOCUS_POSITION, FOCUS_QUATERNION);
    FOCUS_SCALE.set(edge, edge, 1);

    mesh.position.lerpVectors(state.startPosition, FOCUS_POSITION, eased);
    mesh.quaternion.slerpQuaternions(
      state.startQuaternion,
      FOCUS_QUATERNION,
      eased
    );
    mesh.scale.lerpVectors(state.startScale, FOCUS_SCALE, eased);

    if (state.mode === 'out' && state.progress <= 0) {
      state.active = false;
      mesh.visible = false;
    }
  }

  useFrame((_, rawDelta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const delta = Math.min(rawDelta, MAX_STEP);
    const pending = input.current;

    // 1. 巡航：按住即加速
    const holding = interactive && pending.holding;
    const cruise =
      paused || reducedMotion ? 0 : speed * (holding ? boost : 1);
    const previousTravel = travelRef.current;
    travelRef.current += cruise * delta;
    const travel = travelRef.current;
    velocityRef.current =
      delta > 1e-4 ? Math.abs(travel - previousTravel) / delta : 0;

    // 2. 内容回收：整数部分换内容，小数部分由整池平移承担
    const base = Math.floor(travel);
    mesh.position.z = (travel - base) * CELL;
    if (base !== baseRef.current) {
      const previousBase = baseRef.current;
      baseRef.current = base;
      if (Number.isFinite(previousBase)) {
        advanceTunnelCells(
          rig.assets,
          base,
          base - previousBase,
          contentParams
        );
      } else {
        assignTunnelCells(rig.assets, base, contentParams);
      }
    }

    // 3. 视差
    const parallax = interactive && !reducedMotion ? look : 0;
    applyLook(camera, pending.ndcX, pending.ndcY, parallax, delta);

    // 4. 点击与收回
    if (interactive && pending.pendingClick) {
      const click = pending.pendingClick;
      pending.pendingClick = null;
      if (focusOnClick) handleClick(click.x, click.y);
    }
    if (pending.pendingRelease) {
      pending.pendingRelease = false;
      startRetract();
    }

    // 5. 焦点动画
    updateFocus(delta);
  });

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[rig.assets.geometry, rig.assets.material, rig.assets.count]}
        frustumCulled={false}
      />
      <primitive object={focusMesh} />
      <TrailRenderer
        velocity={velocityRef}
        blur={blur}
        disabled={reducedMotion}
      />
    </>
  );
}
