'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import type { ShaderMaterial } from 'three';
import { useMemo, useRef } from 'react';
import {
  createGroundUniforms,
  groundFragmentShader,
  groundVertexShader,
} from './ground-shader';

/** 流动速度系数：1 = 每秒推进 1 个时间单位。数值越大流动越快。 */
const FLOW_SPEED = 0.5;

/** 全屏四边形：铺满屏幕并逐帧推进 uTime */
function GroundPlane() {
  const materialRef = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(createGroundUniforms, []);

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;
    // uTime 以「秒」推进；单帧上限 0.05s，避免标签页切回时相位移跳变。
    material.uniforms.uTime.value += Math.min(delta, 0.05) * FLOW_SPEED;
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={groundVertexShader}
        fragmentShader={groundFragmentShader}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * 背景渲染器（仅在客户端加载）。
 * 顶点着色器忽略相机矩阵，故 camera 只用于满足 R3F 的初始化要求。
 */
export default function GroundCanvas() {
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      camera={{ position: [0, 0, 1] }}
      // 必须常驻渲染循环：demand 模式下 useFrame 只在 invalidate 时执行，
      // 会导致 uTime 不再推进、画面彻底静止。
      frameloop="always"
      gl={{
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance',
      }}
    >
      <GroundPlane />
    </Canvas>
  );
}
