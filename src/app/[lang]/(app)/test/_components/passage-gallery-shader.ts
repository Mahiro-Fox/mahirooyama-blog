/**
 * passage-gallery 隧道瓦片的着色器。
 *
 * 约定沿用项目既有 shader-background：
 * 1. GLSL ES 1.00（varying / gl_FragColor），precision 由 three 注入，无需 glslVersion。
 * 2. 顶点着色器里手动套用 instanceMatrix：three 只在内建材质的顶点片段里注入它，
 *    自定义 ShaderMaterial 必须自己乘。
 * 3. projectionMatrix 只有顶点着色器里才有（片元前缀只注入 viewMatrix / cameraPosition），
 *    所以抗锯齿宽度必须在顶点端算好，用 varying 传给片元。
 * 4. 抗锯齿不使用 fwidth（GLSL ES 1.00 需要 OES_standard_derivatives 扩展指令），
 *    改用「视深度 × 每像素 uv 尺寸」推算软边宽度，任何深度下都接近 1px。
 */
import * as THREE from 'three';

/** 顶点着色器：逐实例属性直接透传，并把抗锯齿宽度按深度预先算好 */
export const tileVertexShader = `
uniform float uViewportHeight;
uniform float uTileScale;

attribute float aKind;
attribute float aTexIndex;
attribute float aSeed;

varying vec2 vUv;
varying float vDepth;
varying float vAa;
varying float vKind;
varying float vTexIndex;
varying float vSeed;

void main() {
  vUv = uv;
  vKind = aKind;
  vTexIndex = aTexIndex;
  vSeed = aSeed;

  vec4 mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
  vDepth = -mvPosition.z;

  // projectionMatrix[1][1] = 1 / tan(fov / 2)，据此得到「每像素对应的 uv 尺寸」随深度线性增长
  float pixelUv = 2.0 / (projectionMatrix[1][1] * uViewportHeight * uTileScale);
  vAa = max(vDepth * pixelUv, 0.0008);

  gl_Position = projectionMatrix * mvPosition;
}
`;

/**
 * 片元着色器。
 * vKind: 0 = 空瓦片（填背景色，形成隧道壁）、1 = 照片、2 = 渐变强调瓦片。
 * 远端不做真正的雾，而是把 alpha 衰减到 0，这样 backgroundColor 传 "transparent" 时同样成立。
 */
export const tileFragmentShader = `
uniform vec3 uBackground;
uniform float uBackgroundAlpha;
uniform vec3 uLineColor;
uniform float uLineOpacity;
uniform float uRadius;
uniform float uFogFalloff;
uniform sampler2D uAtlas;
uniform vec2 uAtlasGrid;
uniform float uAtlasTile;
uniform float uAtlasEdge;
uniform vec3 uColorA;
uniform vec3 uColorB;

varying vec2 vUv;
varying float vDepth;
varying float vAa;
varying float vKind;
varying float vTexIndex;
varying float vSeed;

// 圆角矩形 SDF，p 为以中心为原点的 uv（±0.5），radius 为「归一化圆角 × 0.5」
float roundedRect(vec2 p, float radius) {
  vec2 d = abs(p) - vec2(0.5) + radius;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - radius;
}

// 瓦片局部 uv → 图集 uv，内缩 1 像素避免相邻格串色
vec2 tileUvToAtlas(vec2 tileUv, float index) {
  vec2 cell = vec2(mod(index, uAtlasGrid.x), floor(index / uAtlasGrid.x));
  vec2 inner = (clamp(tileUv, 0.0, 1.0) * (uAtlasTile - 2.0) + 1.0) / uAtlasEdge;
  return cell * (uAtlasTile / uAtlasEdge) + inner;
}

void main() {
  vec2 p = vUv - 0.5;
  float sdf = roundedRect(p, uRadius * 0.5);

  float mask = 1.0 - smoothstep(0.0, vAa, sdf);
  float line = 1.0 - smoothstep(0.0, vAa * 1.6, abs(sdf));

  vec3 base = uBackground;
  if (vKind > 0.5 && vKind < 1.5) {
    base = texture2D(uAtlas, tileUvToAtlas(vUv, vTexIndex)).rgb;
  } else if (vKind >= 1.5) {
    // 对角渐变 + 一点点逐格扰动，避免所有强调瓦片长得一模一样
    float g = clamp(vUv.x * 0.72 + vUv.y * 0.28 + (vSeed - 0.5) * 0.3, 0.0, 1.0);
    base = mix(uColorA, uColorB, g);
  }

  vec3 color = mix(base, uLineColor, line * uLineOpacity);
  // 空瓦片在 backgroundColor = transparent 时需要整体透明，但发丝线仍要可见
  float solid = vKind > 0.5 ? 1.0 : uBackgroundAlpha;
  gl_FragColor = vec4(color, mask * exp(-vDepth * uFogFalloff) * mix(solid, 1.0, line));
}
`;

/** 雾衰减系数基准：alpha = exp(-深度 × 系数 × fog)，fog = 1 时约 25 格处淡到不可见 */
export const FOG_FALLOFF_BASE = 0.16;

export function fogFalloff(fog: number): number {
  return FOG_FALLOFF_BASE * Math.max(fog, 0.01);
}

/** 发丝线颜色由背景色派生：深色背景提亮、浅色背景压暗，保证任何主题下都看得见 */
export function deriveLineColor(backgroundColor: string): THREE.Color {
  if (backgroundColor === 'transparent') return new THREE.Color('#ffffff');
  const color = new THREE.Color(backgroundColor);
  const luminance = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
  if (luminance < 0.5) return color.clone().lerp(new THREE.Color(1, 1, 1), 0.22);
  return color.clone().lerp(new THREE.Color(0, 0, 0), 0.18);
}

export interface TileUniformParams {
  colors: [string, string];
  backgroundColor: string;
  lineOpacity: number;
  radius: number;
  gap: number;
  fog: number;
  viewportHeight: number;
}

/** uniform 初值；atlas 相关项在贴图就绪后由场景侧写入 */
export function createTileUniforms(params: TileUniformParams) {
  const transparent = params.backgroundColor === 'transparent';
  return {
    uBackground: {
      value: new THREE.Color(transparent ? '#000000' : params.backgroundColor),
    },
    uBackgroundAlpha: { value: transparent ? 0 : 1 },
    uLineColor: { value: deriveLineColor(params.backgroundColor) },
    uLineOpacity: { value: params.lineOpacity },
    uRadius: { value: params.radius },
    uTileScale: { value: Math.max(1 - params.gap, 0.01) },
    uViewportHeight: { value: params.viewportHeight },
    uFogFalloff: { value: fogFalloff(params.fog) },
    uAtlas: { value: null as THREE.Texture | null },
    uAtlasGrid: { value: new THREE.Vector2(1, 1) },
    uAtlasTile: { value: 1 },
    uAtlasEdge: { value: 1 },
    uColorA: { value: new THREE.Color(params.colors[0]) },
    uColorB: { value: new THREE.Color(params.colors[1]) },
  };
}

export type TileUniforms = ReturnType<typeof createTileUniforms>;

/**
 * 飞到镜前的「焦点瓦片」材质。
 *
 * 不用 MeshBasicMaterial：内置材质会走 linear → sRGB 输出转换，而墙面瓦片是
 * 自定义 ShaderMaterial 直出，两者颜色处理不同，焦点一亮就会突然变亮、很出戏。
 * 这里复用与墙面完全一致的图集采样逻辑，只把逐实例属性换成 uniform。
 */
export const focusVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const focusFragmentShader = `
uniform sampler2D uAtlas;
uniform vec2 uAtlasGrid;
uniform float uAtlasTile;
uniform float uAtlasEdge;
uniform float uTexIndex;
uniform float uKind;
uniform float uSeed;
uniform float uRadius;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uBackground;

varying vec2 vUv;

float roundedRect(vec2 p, float radius) {
  vec2 d = abs(p) - vec2(0.5) + radius;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - radius;
}

vec2 tileUvToAtlas(vec2 tileUv, float index) {
  vec2 cell = vec2(mod(index, uAtlasGrid.x), floor(index / uAtlasGrid.x));
  vec2 inner = (clamp(tileUv, 0.0, 1.0) * (uAtlasTile - 2.0) + 1.0) / uAtlasEdge;
  return cell * (uAtlasTile / uAtlasEdge) + inner;
}

void main() {
  vec2 p = vUv - 0.5;
  float sdf = roundedRect(p, uRadius * 0.5);

  // 焦点瓦片永远贴在镜前固定距离，抗锯齿宽度取常量即可
  float aa = 0.004;
  float mask = 1.0 - smoothstep(0.0, aa, sdf);

  vec3 base = uBackground;
  if (uKind > 0.5 && uKind < 1.5) {
    base = texture2D(uAtlas, tileUvToAtlas(vUv, uTexIndex)).rgb;
  } else if (uKind >= 1.5) {
    float g = clamp(vUv.x * 0.72 + vUv.y * 0.28 + (uSeed - 0.5) * 0.3, 0.0, 1.0);
    base = mix(uColorA, uColorB, g);
  }

  gl_FragColor = vec4(base, mask);
}
`;

export type FocusUniforms = TileUniforms & {
  uTexIndex: { value: number };
  uKind: { value: number };
  uSeed: { value: number };
};

/** 焦点材质：在瓦片 uniform 基础上补三个逐格参数 */
export function createFocusMaterial(params: TileUniformParams) {
  const uniforms: FocusUniforms = {
    ...createTileUniforms(params),
    uTexIndex: { value: 0 },
    uKind: { value: 0 },
    uSeed: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: focusVertexShader,
    fragmentShader: focusFragmentShader,
    uniforms,
    transparent: true,
  });
  material.depthWrite = true;

  return { material, uniforms };
}

/**
 * 拖尾（速度感模糊）用的全屏着色器。
 * 顶点直接把平面铺满裁剪空间，不需要任何相机矩阵。
 */
export const screenVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const trailFragmentShader = `
uniform sampler2D tPrev;
uniform sampler2D tCur;
uniform float uKeeper;

varying vec2 vUv;

void main() {
  vec4 prev = texture2D(tPrev, vUv);
  vec4 cur = texture2D(tCur, vUv);
  // 用 mix 而不是加性叠加：静止时 prev == cur，结果不变，不会把画面整体提亮
  gl_FragColor = vec4(mix(prev.rgb, cur.rgb, uKeeper), max(prev.a, cur.a));
}
`;

export const copyFragmentShader = `
uniform sampler2D tDiffuse;

varying vec2 vUv;

void main() {
  gl_FragColor = texture2D(tDiffuse, vUv);
}
`;

/** 拖尾强度上限：上一帧最多保留到这个比例，避免静止画面糊死 */
const MAX_TRAIL = 0.92;
/** 速度归一化基准（格 / 秒）：到这个速度拖尾拉满 */
const TRAIL_SPEED = 3;

/**
 * 拖尾保留系数：1 表示完全用当前帧（无拖尾），越小拖尾越长。
 * blur = 0 时恒为 1，调用方据此直接跳过整条后处理管线。
 */
export function trailKeeper(velocity: number, blur: number) {
  const speed = Math.min(1, Math.abs(velocity) / TRAIL_SPEED);
  return 1 - Math.min(MAX_TRAIL, Math.max(0, blur) * speed);
}

/** 把外部参数写回已有 uniform（参数变化时调用，不重建材质） */
export function applyTileUniforms(
  uniforms: TileUniforms,
  params: TileUniformParams
) {
  const transparent = params.backgroundColor === 'transparent';
  uniforms.uBackground.value.set(
    transparent ? '#000000' : params.backgroundColor
  );
  uniforms.uBackgroundAlpha.value = transparent ? 0 : 1;
  uniforms.uLineColor.value.copy(deriveLineColor(params.backgroundColor));
  uniforms.uLineOpacity.value = params.lineOpacity;
  uniforms.uRadius.value = params.radius;
  uniforms.uTileScale.value = Math.max(1 - params.gap, 0.01);
  uniforms.uViewportHeight.value = params.viewportHeight;
  uniforms.uFogFalloff.value = fogFalloff(params.fog);
  uniforms.uColorA.value.set(params.colors[0]);
  uniforms.uColorB.value.set(params.colors[1]);
}
