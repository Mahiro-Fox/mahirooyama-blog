'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import {
  copyFragmentShader,
  screenVertexShader,
  trailFragmentShader,
  trailKeeper,
} from './passage-gallery-shader';

function makeTarget(width: number, height: number, withDepth: boolean) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: withDepth,
    stencilBuffer: false,
  });
  // 渲染目标默认就是线性空间，这里显式声明，避免后续改动引入隐式转换
  target.texture.colorSpace = THREE.NoColorSpace;
  return target;
}

interface TrailTargets {
  /** 接场景的那张（需要深度） */
  scene: THREE.WebGLRenderTarget;
  /** 拖尾累积乒乓的两张（不需要深度） */
  prev: THREE.WebGLRenderTarget;
  out: THREE.WebGLRenderTarget;
  width: number;
  height: number;
}

export interface TrailRendererProps {
  /** 当前巡航速度（格 / 秒，取绝对值），由场景每帧写入 */
  velocity: RefObject<number>;
  /** 拖尾强度，0 关闭 */
  blur: number;
  /** 减弱动态效果时为真，直接走普通渲染 */
  disabled: boolean;
}

/**
 * 手写拖尾后处理：场景 → mix(上一帧, 当前帧) → 拷贝到屏幕。
 *
 * 用 useFrame 的 priority = 1 接管整帧渲染（R3F 见到非零优先级后不再自动渲染）。
 * 需要三张渲染目标：一张接场景，两张乒乓做累积——读与写不能是同一张，
 * 因此除「当前」外还要一张额外的输出。
 * blur = 0 或关闭时整条管线短路，直接退化成普通渲染。
 */
export function TrailRenderer({
  velocity,
  blur,
  disabled,
}: TrailRendererProps) {
  const { gl, scene, camera, size, viewport } = useThree();

  const resources = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const trail = new THREE.ShaderMaterial({
      vertexShader: screenVertexShader,
      fragmentShader: trailFragmentShader,
      uniforms: {
        tPrev: { value: null as THREE.Texture | null },
        tCur: { value: null as THREE.Texture | null },
        uKeeper: { value: 1 },
      },
      transparent: false,
      depthTest: false,
      depthWrite: false,
    });
    const copy = new THREE.ShaderMaterial({
      vertexShader: screenVertexShader,
      fragmentShader: copyFragmentShader,
      uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
      transparent: false,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, trail);
    mesh.frustumCulled = false;
    const quadScene = new THREE.Scene();
    quadScene.add(mesh);
    const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    return { geometry, trail, copy, mesh, quadScene, quadCamera };
  }, []);

  const targetsRef = useRef<TrailTargets | null>(null);

  // 尺寸（含像素比）变化时重建渲染目标
  useEffect(() => {
    const dpr = gl.getPixelRatio();
    const width = Math.max(1, Math.floor(size.width * dpr));
    const height = Math.max(1, Math.floor(size.height * dpr));
    const current = targetsRef.current;
    if (current && current.width === width && current.height === height) {
      return;
    }
    if (current) {
      current.scene.dispose();
      current.prev.dispose();
      current.out.dispose();
    }
    targetsRef.current = {
      scene: makeTarget(width, height, true),
      prev: makeTarget(width, height, false),
      out: makeTarget(width, height, false),
      width,
      height,
    };
  }, [gl, size.width, size.height, viewport.dpr]);

  useEffect(
    () => () => {
      const current = targetsRef.current;
      if (current) {
        current.scene.dispose();
        current.prev.dispose();
        current.out.dispose();
        targetsRef.current = null;
      }
      resources.geometry.dispose();
      resources.trail.dispose();
      resources.copy.dispose();
    },
    [resources]
  );

  useFrame(() => {
    const targets = targetsRef.current;
    const { trail, copy, mesh, quadScene, quadCamera } = resources;

    if (disabled || blur <= 0 || !targets) {
      gl.setRenderTarget(null);
      gl.render(scene, camera);
      return;
    }

    trail.uniforms.uKeeper.value = trailKeeper(velocity.current, blur);
    trail.uniforms.tPrev.value = targets.prev.texture;
    trail.uniforms.tCur.value = targets.scene.texture;

    gl.setRenderTarget(targets.scene);
    gl.render(scene, camera);

    mesh.material = trail;
    gl.setRenderTarget(targets.out);
    gl.render(quadScene, quadCamera);

    mesh.material = copy;
    copy.uniforms.tDiffuse.value = targets.out.texture;
    gl.setRenderTarget(null);
    gl.render(quadScene, quadCamera);

    // 乒乓：本帧的输出成为下一帧的历史
    const swap = targets.prev;
    targets.prev = targets.out;
    targets.out = swap;
  }, 1);

  return null;
}
