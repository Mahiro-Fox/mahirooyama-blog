'use client';

import { Canvas, useThree } from '@react-three/fiber';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { PerspectiveCamera } from 'three';
import { cn } from '@/utils/utils';
import {
  TunnelScene,
  type PassageGalleryItem,
  type PointerInput,
} from './passage-gallery-scene';

/**
 * 照片隧道（passage-gallery）。
 *
 * 对照 React Bits Pro 的同名组件按「公开 prop 语义 + 观测到的行为」重写，
 * 未使用其源码：Pro 版只走付费 registry 分发，拿不到实现。
 * 本文件只负责画布装配、参数默认值与指针输入，
 * 几何／着色器见 passage-gallery-tunnel.ts、passage-gallery-shader.ts，
 * 图集见 passage-gallery-atlas.ts，拖尾后处理见 passage-gallery-trail.tsx。
 */

const DEFAULT_ARIA_LABEL = '照片隧道：一条可以穿行浏览照片的走廊';

/** 判定为「点击」而非「按住加速」：时长与位移都要够小 */
const CLICK_MAX_MS = 260;
const CLICK_MAX_PX = 8;

function resolveParams(props: PassageGalleryProps) {
  return {
    ariaLabel: props.ariaLabel ?? DEFAULT_ARIA_LABEL,
    colors: props.colors ?? (['#5227FF', '#FF9FFC'] as [string, string]),
    backgroundColor: props.backgroundColor ?? '#0a0a0a',
    lanes: props.lanes ?? 5,
    gap: props.gap ?? 0.1,
    radius: props.radius ?? 0.06,
    photoFill: props.photoFill ?? 0.3,
    accentFill: props.accentFill ?? 0.06,
    lineOpacity: props.lineOpacity ?? 0.12,
    fog: props.fog ?? 1,
    speed: props.speed ?? 0.6,
    fov: props.fov ?? 72,
    seed: props.seed ?? 0,
    paused: props.paused ?? false,
    dpr: props.dpr ?? 2,
    interactive: props.interactive ?? true,
    look: props.look ?? 1,
    boost: props.boost ?? 3,
    blur: props.blur ?? 1,
    focusOnClick: props.focusOnClick ?? true,
    captions: props.captions ?? true,
  };
}

/** R3F 的默认相机只吃创建时的 fov，改动需要手动同步 */
function FovSync({ fov }: { fov: number }) {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    const perspective = camera as PerspectiveCamera;
    if (!perspective.isPerspectiveCamera) return;
    perspective.fov = fov;
    perspective.updateProjectionMatrix();
  }, [camera, fov]);
  return null;
}

/** backgroundColor 为 'transparent' 时清成透明，让页面背景透上来 */
function Backdrop({ backgroundColor }: { backgroundColor: string }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    if (backgroundColor === 'transparent') {
      gl.setClearAlpha(0);
      return;
    }
    gl.setClearColor(backgroundColor, 1);
  }, [gl, backgroundColor]);
  return null;
}

/** 指针相对画面的归一化坐标，向右 / 向上为正 */
function pointerNdc(element: HTMLElement, clientX: number, clientY: number) {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -(((clientY - rect.top) / rect.height) * 2 - 1),
  };
}

export interface PassageGalleryProps {
  items: PassageGalleryItem[];
  className?: string;
  style?: CSSProperties;
  /** 无障碍描述 */
  ariaLabel?: string;
  /** 强调瓦片渐变的两端颜色 */
  colors?: [string, string];
  /** 隧道壁与远端渐隐的颜色，传 'transparent' 显示页面背景 */
  backgroundColor?: string;
  /** 地板／天花板横向格数，四壁同数 */
  lanes?: number;
  /** 格子间距，占一格的比值 */
  gap?: number;
  /** 瓦片圆角，0 为直角、1 为圆形 */
  radius?: number;
  /** 照片格占全部格子的比例 */
  photoFill?: number;
  /** 渐变强调格占全部格子的比例 */
  accentFill?: number;
  /** 发丝网格线的不透明度 */
  lineOpacity?: number;
  /** 远端隐入背景的快慢 */
  fog?: number;
  /** 巡航速度，单位「格 / 秒」，可为负 */
  speed?: number;
  /** 竖直视场角（度） */
  fov?: number;
  /** 改变照片与强调格的分布 */
  seed?: number;
  /** 停住巡航 */
  paused?: boolean;
  /** 画布最大像素比 */
  dpr?: number;
  /** 指针视差、按住加速、点击飞出总开关 */
  interactive?: boolean;
  /** 指针视差幅度，1 为默认 */
  look?: number;
  /** 按住时的巡航倍率 */
  boost?: number;
  /** 拖尾模糊强度，0 关闭 */
  blur?: number;
  /** 点击照片是否飞到镜前 */
  focusOnClick?: boolean;
  /** 是否显示飞出时的标题叠加层 */
  captions?: boolean;
  /** 焦点变化回调，收回时 item 为 null、index 为 -1 */
  onFocusChange?: (item: PassageGalleryItem | null, index: number) => void;
}

export default function PassageGallery(props: PassageGalleryProps) {
  const { items, className, style, onFocusChange } = props;
  const params = resolveParams(props);

  const inputRef = useRef<PointerInput>({
    ndcX: 0,
    ndcY: 0,
    holding: false,
    pendingClick: null,
    pendingRelease: false,
  });
  const pressRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [focused, setFocused] = useState<{
    item: PassageGalleryItem | null;
    index: number;
  } | null>(null);

  // 焦点由场景在命中时回调，这里只做叠加层与对外通知
  const handleFocusChange = (
    item: PassageGalleryItem | null,
    index: number
  ) => {
    setFocused(item ? { item, index } : null);
    onFocusChange?.(item, index);
  };

  useEffect(() => {
    if (!params.interactive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') inputRef.current.pendingRelease = true;
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [params.interactive]);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const ndc = pointerNdc(
      event.currentTarget,
      event.clientX,
      event.clientY
    );
    if (!ndc) return;
    inputRef.current.ndcX = ndc.x;
    inputRef.current.ndcY = ndc.y;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pressRef.current = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };
    inputRef.current.holding = true;
    handlePointerMove(event);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const press = pressRef.current;
    pressRef.current = null;
    inputRef.current.holding = false;
    if (!press) return;

    const heldFor = performance.now() - press.time;
    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    // 按得久或拖得远都算「按住加速」，只有短促原位的一下才算点击
    if (heldFor > CLICK_MAX_MS || moved > CLICK_MAX_PX) return;

    const ndc = pointerNdc(event.currentTarget, event.clientX, event.clientY);
    if (!ndc) return;
    inputRef.current.pendingClick = ndc;
  };

  const releasePress = () => {
    pressRef.current = null;
    inputRef.current.holding = false;
  };

  const handlePointerLeave = () => {
    releasePress();
    inputRef.current.ndcX = 0;
    inputRef.current.ndcY = 0;
  };

  return (
    <div
      className={cn(
        'relative h-full min-h-[420px] w-full overflow-hidden',
        className
      )}
      style={style}
      role="img"
      aria-label={params.ariaLabel}
      onPointerMove={params.interactive ? handlePointerMove : undefined}
      onPointerDown={params.interactive ? handlePointerDown : undefined}
      onPointerUp={params.interactive ? handlePointerUp : undefined}
      onPointerLeave={params.interactive ? handlePointerLeave : undefined}
      onPointerCancel={params.interactive ? releasePress : undefined}
    >
      <Canvas
        flat
        dpr={[1, params.dpr]}
        frameloop="always"
        camera={{
          fov: params.fov,
          near: 0.05,
          far: 400,
          position: [0, 0, 0],
        }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <FovSync fov={params.fov} />
        <Backdrop backgroundColor={params.backgroundColor} />
        <TunnelScene
          items={items}
          colors={params.colors}
          backgroundColor={params.backgroundColor}
          lanes={params.lanes}
          gap={params.gap}
          radius={params.radius}
          photoFill={params.photoFill}
          accentFill={params.accentFill}
          lineOpacity={params.lineOpacity}
          fog={params.fog}
          speed={params.speed}
          seed={params.seed}
          paused={params.paused}
          interactive={params.interactive}
          look={params.look}
          boost={params.boost}
          blur={params.blur}
          focusOnClick={params.focusOnClick}
          input={inputRef}
          onFocusChange={handleFocusChange}
        />
      </Canvas>

      {params.captions && focused && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 p-4 text-center">
          <span className="bg-card/85 text-card-foreground rounded-md px-3 py-1 text-sm font-medium">
            {focused.item?.title ?? focused.item?.alt ?? ''}
          </span>
          <span className="text-muted-foreground text-xs">
            {focused.index + 1} / {items.length}
          </span>
        </div>
      )}
    </div>
  );
}

export type { PassageGalleryItem };
