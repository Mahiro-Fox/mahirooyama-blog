'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, type CSSProperties } from 'react';
import type { PerspectiveCamera } from 'three';
import { cn } from '@/utils/utils';
import { TunnelScene, type PassageGalleryItem } from './passage-gallery-scene';

/**
 * 照片隧道（passage-gallery）。
 *
 * 对照 React Bits Pro 的同名组件按「公开 prop 语义 + 观测到的行为」重写，
 * 未使用其源码：Pro 版只走付费 registry 分发，拿不到实现。
 * 本文件只负责画布装配与参数默认值，几何／着色器见 passage-gallery-tunnel.ts、
 * passage-gallery-shader.ts，图集见 passage-gallery-atlas.ts。
 *
 * 当前阶段只做「静态隧道」：回收网格 + 圆角 + 图集照片 + 渐变格 + 距离雾化 + 巡航。
 * 指针视差、按住加速、点击飞出、拖尾模糊留待下一阶段。
 */

const DEFAULT_ARIA_LABEL = '照片隧道：一条可以穿行浏览照片的走廊';

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
}

export default function PassageGallery(props: PassageGalleryProps) {
  const { items, className, style } = props;
  const params = resolveParams(props);

  return (
    <div
      className={cn(
        'relative h-full min-h-[420px] w-full overflow-hidden',
        className
      )}
      style={style}
      role="img"
      aria-label={params.ariaLabel}
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
        />
      </Canvas>
    </div>
  );
}

export type { PassageGalleryItem };
