/**
 * 歌词设置。
 * 定义歌词样式（逐字/弹跳/空间墙）、位置、字体、每行字数与轨道偏移等配置及其取值范围与默认值。
 */
import { clampMaxCharsPerLine } from '../lyrics/lyricLineWrapping';

export type LyricsPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';
export type LyricsTriggerBand =
  | 'subBass'
  | 'bass'
  | 'lowMid'
  | 'mid'
  | 'highMid'
  | 'presence'
  | 'brilliance'
  | 'air';
export type LyricsFontFamily = 'serif' | 'sans-serif';
export type LyricsStyleType = 'songyancai' | 'dynamic-bounce' | 'spatial-wall';

export const MAX_CHARS_PER_LINE_MIN = 8;
export const MAX_CHARS_PER_LINE_MAX = 48;
export const DEFAULT_MAX_CHARS_PER_LINE = 24;
export const SPATIAL_ORBIT_OFFSET_MIN = -180;
export const SPATIAL_ORBIT_OFFSET_MAX = 180;
export const DEFAULT_SPATIAL_ORBIT_OFFSET = 0;

export interface LyricStyleConfig {
  activeFontSize: number;
  inactiveFontSize: number;
  maxCharsPerLine: number;
  fontColor: string;
  glowColor: string;
  followThemeGlow: boolean;
  karaokeColor: string;
  followThemeKaraoke: boolean;
  position: LyricsPosition;
  triggerBand: LyricsTriggerBand;
  fontFamily: LyricsFontFamily;
  spatialOrbitOffset: number;
}

export interface LyricsSettings {
  style: LyricsStyleType;
  songyancai: LyricStyleConfig;
  'dynamic-bounce': LyricStyleConfig;
  'spatial-wall': LyricStyleConfig;
}

export const DEFAULT_STYLE_CONFIG: LyricStyleConfig = {
  activeFontSize: 32,
  inactiveFontSize: 18,
  maxCharsPerLine: DEFAULT_MAX_CHARS_PER_LINE,
  fontColor: '#ffffff',
  glowColor: '#00ffff',
  followThemeGlow: true,
  karaokeColor: '#00ffff',
  followThemeKaraoke: true,
  position: 'center',
  triggerBand: 'subBass',
  fontFamily: 'serif',
  spatialOrbitOffset: DEFAULT_SPATIAL_ORBIT_OFFSET,
};

export const DEFAULT_LYRICS_SETTINGS: LyricsSettings = {
  style: 'spatial-wall',
  songyancai: {
    ...DEFAULT_STYLE_CONFIG,
    activeFontSize: 43,
    inactiveFontSize: 15,
    karaokeColor: '#f21818',
  },
  'dynamic-bounce': {
    ...DEFAULT_STYLE_CONFIG,
    activeFontSize: 64,
    inactiveFontSize: 16,
    maxCharsPerLine: 48,
    glowColor: '#ffffff',
    followThemeGlow: false,
    karaokeColor: '#969292',
    fontFamily: 'sans-serif',
  },
  'spatial-wall': {
    ...DEFAULT_STYLE_CONFIG,
    activeFontSize: 30,
    inactiveFontSize: 28,
    maxCharsPerLine: 27,
    position: 'center-left',
    fontFamily: 'sans-serif',
    spatialOrbitOffset: -38,
  },
};

const STORAGE_KEY = 'sonic_topography_lyrics_settings';

function normalizeStyleConfig(
  value: unknown,
  fallback: LyricStyleConfig = DEFAULT_STYLE_CONFIG
): LyricStyleConfig {
  const v = (value ?? {}) as Record<string, unknown>;
  return {
    activeFontSize: Number.isFinite(Number(v?.activeFontSize))
      ? Number(v.activeFontSize)
      : fallback.activeFontSize,
    inactiveFontSize: Number.isFinite(Number(v?.inactiveFontSize))
      ? Number(v.inactiveFontSize)
      : fallback.inactiveFontSize,
    maxCharsPerLine: clampMaxCharsPerLine(
      v?.maxCharsPerLine,
      MAX_CHARS_PER_LINE_MIN,
      MAX_CHARS_PER_LINE_MAX,
      fallback.maxCharsPerLine
    ),
    fontColor: (v?.fontColor as string) ?? fallback.fontColor,
    glowColor: (v?.glowColor as string) ?? fallback.glowColor,
    followThemeGlow: (v?.followThemeGlow as boolean) ?? fallback.followThemeGlow,
    karaokeColor: (v?.karaokeColor as string) ?? fallback.karaokeColor,
    followThemeKaraoke:
      (v?.followThemeKaraoke as boolean) ?? fallback.followThemeKaraoke,
    position: (v?.position as LyricsPosition) ?? fallback.position,
    triggerBand: (v?.triggerBand as LyricsTriggerBand) ?? fallback.triggerBand,
    fontFamily: (v?.fontFamily as LyricsFontFamily) ?? fallback.fontFamily,
    spatialOrbitOffset: Math.max(
      SPATIAL_ORBIT_OFFSET_MIN,
      Math.min(
        SPATIAL_ORBIT_OFFSET_MAX,
        Number.isFinite(Number(v?.spatialOrbitOffset))
          ? Number(v.spatialOrbitOffset)
          : fallback.spatialOrbitOffset
      )
    ),
  };
}

export function normalizeLyricsSettings(value: unknown): LyricsSettings {
  const parsed = (value ?? {}) as Record<string, unknown>;
  if (parsed.activeFontSize !== undefined) {
    const oldConfig = normalizeStyleConfig(parsed);
    return {
      style: (parsed.style as LyricsStyleType) ?? 'songyancai',
      songyancai: { ...oldConfig },
      'dynamic-bounce': { ...oldConfig },
      'spatial-wall': { ...oldConfig },
    };
  }

  return {
    style: (parsed.style as LyricsStyleType) ?? DEFAULT_LYRICS_SETTINGS.style,
    songyancai: normalizeStyleConfig(
      parsed.songyancai,
      DEFAULT_LYRICS_SETTINGS.songyancai
    ),
    'dynamic-bounce': normalizeStyleConfig(
      parsed['dynamic-bounce'],
      DEFAULT_LYRICS_SETTINGS['dynamic-bounce']
    ),
    'spatial-wall': normalizeStyleConfig(
      parsed['spatial-wall'],
      DEFAULT_LYRICS_SETTINGS['spatial-wall']
    ),
  };
}

export function readLyricsSettingsStorage(): LyricsSettings {
  if (typeof window === 'undefined')
    return normalizeLyricsSettings(DEFAULT_LYRICS_SETTINGS);
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return normalizeLyricsSettings(parsed);
    }
  } catch (e) {
    console.error('Failed to read lyrics settings from storage', e);
  }
  return normalizeLyricsSettings(DEFAULT_LYRICS_SETTINGS);
}

export function writeLyricsSettingsStorage(settings: LyricsSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to write lyrics settings to storage', e);
  }
}
