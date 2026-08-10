/**
 * 主题配置 - 单一数据源
 *
 * 这里定义所有可用的主题及其元数据。
 * layout.tsx 的防 FOUC 脚本、theme-store.ts、theme-switcher.tsx 都从这里读取。
 *
 * 修改主题时只需：
 * 1. 在 src/styles/globals.css 添加 [data-theme='xxx'] { ... } 块
 * 2. 在这里添加对应的主题元数据
 */

/** 主题 ID 类型 - 用于类型安全 */
export type ThemeId =
  | 'warm-paper'
  | 'celadon'
  | 'inkstone'
  | 'forest'
  | 'dusk'
  | 'ocean'
  | 'coffee'
  | 'midnight'
  | 'sakura-ink';

/** 主题元数据 */
export interface ThemeMeta {
  /** 主题 ID，对应 CSS 的 data-theme 属性值 */
  id: ThemeId;

  /** 主题类型，浅色或深色 */
  type: 'light' | 'dark';

  /** i18n key，用于显示主题名称 */
  labelKey: string;

  /** 主色色块，用于在切换器中预览 */
  swatch: string;

  /** 背景色块，用于在切换器中预览 */
  bgSwatch: string;
}

/**
 * 所有可用主题列表
 * 顺序即为切换器中的显示顺序
 *
 * 浅色主题：
 * - warm-paper
 * - celadon
 * - forest
 * - ocean
 * - coffee
 *
 * 深色主题：
 * - inkstone
 * - dusk
 * - midnight
 * - sakura-ink
 */
export const themes: ThemeMeta[] = [
  {
    id: 'warm-paper',
    type: 'light',
    labelKey: 'theme.warm_paper',
    swatch: 'oklch(0.52 0.18 32)',
    bgSwatch: 'oklch(0.96 0.012 75)',
  },
  {
    id: 'celadon',
    type: 'light',
    labelKey: 'theme.celadon',
    swatch: 'oklch(0.55 0.13 165)',
    bgSwatch: 'oklch(0.97 0.008 200)',
  },
  {
    id: 'inkstone',
    type: 'dark',
    labelKey: 'theme.inkstone',
    swatch: 'oklch(0.75 0.15 75)',
    bgSwatch: 'oklch(0.22 0.008 70)',
  },
  {
    id: 'forest',
    type: 'light',
    labelKey: 'theme.forest',
    swatch: 'oklch(0.5 0.12 145)',
    bgSwatch: 'oklch(0.96 0.015 85)',
  },
  {
    id: 'dusk',
    type: 'dark',
    labelKey: 'theme.dusk',
    swatch: 'oklch(0.72 0.16 350)',
    bgSwatch: 'oklch(0.25 0.025 295)',
  },

  // ── 新增浅色主题 ─────────────────────────────────────────────

  {
    id: 'ocean',
    type: 'light',
    labelKey: 'theme.ocean',
    swatch: 'oklch(0.48 0.14 235)',
    bgSwatch: 'oklch(0.975 0.008 220)',
  },
  {
    id: 'coffee',
    type: 'light',
    labelKey: 'theme.coffee',
    swatch: 'oklch(0.46 0.10 48)',
    bgSwatch: 'oklch(0.965 0.018 82)',
  },

  // ── 新增深色主题 ─────────────────────────────────────────────

  {
    id: 'midnight',
    type: 'dark',
    labelKey: 'theme.midnight',
    swatch: 'oklch(0.72 0.15 235)',
    bgSwatch: 'oklch(0.19 0.025 250)',
  },
  {
    id: 'sakura-ink',
    type: 'dark',
    labelKey: 'theme.sakura_ink',
    swatch: 'oklch(0.74 0.13 350)',
    bgSwatch: 'oklch(0.205 0.018 325)',
  },
];

/** 默认主题 */
export const defaultTheme: ThemeId = 'warm-paper';

/** localStorage 键名 */
export const THEME_STORAGE_KEY = 'site-theme';
