/**
 * (app) 路由组的全屏背景着色器。
 *
 * 迁移自 hyperframes.dev 的 WebGL2 背景：用 domain-warp（域扭曲）迭代叠加正弦/余弦
 * 扰动坐标，R/G/B 三通道各用不同 offset 采样，形成色散式流动渐变。
 *
 * 相比原版（GLSL ES 3.00）的改动：
 * 1. 降级为 GLSL ES 1.00（varying / gl_FragColor），与项目既有 CustomShaderMaterial
 *    约定一致；three 只创建 WebGL2 上下文，而 WebGL2 原生接受 ES 1.00 着色器，无需 glslVersion。
 * 2. 浮点循环变量改写为 int 循环，规避 ES 1.00 对循环条件的限制。
 * 3. 去掉 uRes：全屏四边形直接用 vUv 代替 gl_FragCoord.xy / uRes.xy（二者等价）。
 * 4. 去掉 precision 声明：three 会自动注入。
 */
import * as THREE from 'three';

/** 顶点着色器：绕过相机矩阵，把 [-1,1] 的平面直接铺满裁剪空间 */
export const groundVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** 片元着色器：domain-warp 流动渐变 */
export const groundFragmentShader = `
uniform float uTime;
uniform float uColorScale;
uniform float uFrequency;
uniform vec3 uBaseColor;

varying vec2 vUv;

// 域扭曲：迭代叠加扰动坐标，把规则的正弦变成有机流动的图案
vec2 distort(vec2 p, float offset) {
  p += offset;
  for (int i = 1; i < 7; i++) {
    float fi = float(i);
    p.x += 0.3 / fi * sin(fi * 5.0 * p.y + uTime);
    p.y += 0.1 / fi * cos(fi * 3.0 * p.x + uTime);
  }
  return p;
}

void main() {
  // 三通道用不同 offset 采样，形成色散分层
  float r = sin(distort(vUv, 0.0).x * uFrequency) * 0.5 + 0.5;
  float g = sin(distort(vUv, 0.02).x * uFrequency) * 0.5 + 0.5;
  float b = sin(distort(vUv, 0.04).x * uFrequency) * 0.5 + 0.5;

  vec3 color = pow(vec3(r, g, b), vec3(uColorScale));
  gl_FragColor = vec4(mix(uBaseColor, color, 0.8), 1.0);
}
`;

/**
 * 着色器 uniform 初始值。
 * 常量沿用原版：uColorScale = 10、uFrequency = 7、uBaseColor = 白。
 */
export function createGroundUniforms() {
  return {
    uTime: { value: 0 },
    uColorScale: { value: 10 },
    uFrequency: { value: 7 },
    uBaseColor: { value: new THREE.Color(1, 1, 1) },
  };
}
