export type QQPlaybackQuality = 'lossless' | 'exhigh' | 'standard' | 'aac';
export type NeteasePlaybackBitrate = '320000' | '192000' | '128000';

export interface PlaybackQualitySettings {
  qqQuality: QQPlaybackQuality;
  neteaseBitrate: NeteasePlaybackBitrate;
}

export const PLAYBACK_QUALITY_STORAGE_KEY = 'sonic-playback-quality';

export const DEFAULT_PLAYBACK_QUALITY_SETTINGS: PlaybackQualitySettings = {
  qqQuality: 'exhigh',
  neteaseBitrate: '320000',
};

const QQ_QUALITY_VALUES = new Set<QQPlaybackQuality>(['lossless', 'exhigh', 'standard', 'aac']);
const NETEASE_BITRATE_VALUES = new Set<NeteasePlaybackBitrate>(['320000', '192000', '128000']);

export const QQ_PLAYBACK_QUALITY_OPTIONS: Array<{ value: QQPlaybackQuality; label: string }> = [
  { value: 'exhigh', label: '320k MP3' },
  { value: 'standard', label: '128k MP3' },
  { value: 'aac', label: 'AAC/M4A' },
  { value: 'lossless', label: '无损 FLAC' },
];

export const NETEASE_PLAYBACK_BITRATE_OPTIONS: Array<{ value: NeteasePlaybackBitrate; label: string }> = [
  { value: '320000', label: '320k' },
  { value: '192000', label: '192k' },
  { value: '128000', label: '128k' },
];

export function normalizePlaybackQualitySettings(value: unknown): PlaybackQualitySettings {
  const input = value && typeof value === 'object' ? value as Partial<PlaybackQualitySettings> : {};
  const qqQuality = QQ_QUALITY_VALUES.has(input.qqQuality as QQPlaybackQuality)
    ? input.qqQuality as QQPlaybackQuality
    : DEFAULT_PLAYBACK_QUALITY_SETTINGS.qqQuality;
  const neteaseBitrate = NETEASE_BITRATE_VALUES.has(input.neteaseBitrate as NeteasePlaybackBitrate)
    ? input.neteaseBitrate as NeteasePlaybackBitrate
    : DEFAULT_PLAYBACK_QUALITY_SETTINGS.neteaseBitrate;

  return { qqQuality, neteaseBitrate };
}

export function readPlaybackQualitySettingsStorage(): PlaybackQualitySettings {
  if (typeof window === 'undefined') return DEFAULT_PLAYBACK_QUALITY_SETTINGS;
  try {
    const raw = window.localStorage.getItem(PLAYBACK_QUALITY_STORAGE_KEY);
    return normalizePlaybackQualitySettings(raw ? JSON.parse(raw) : null);
  } catch (error) {
    return DEFAULT_PLAYBACK_QUALITY_SETTINGS;
  }
}

export function writePlaybackQualitySettingsStorage(settings: PlaybackQualitySettings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    PLAYBACK_QUALITY_STORAGE_KEY,
    JSON.stringify(normalizePlaybackQualitySettings(settings)),
  );
}

export function buildQQPlaybackUrl(
  path: string,
  song: { mid: string; mediaMid?: string },
  settings: PlaybackQualitySettings,
) {
  const params = new URLSearchParams({
    mid: song.mid,
    mediaMid: song.mediaMid || '',
    quality: normalizePlaybackQualitySettings(settings).qqQuality,
  });
  return `${path}?${params.toString()}`;
}

export function buildNeteasePlaybackUrl(
  path: string,
  id: number | string,
  settings: PlaybackQualitySettings,
) {
  const params = new URLSearchParams({
    id: String(id),
    br: normalizePlaybackQualitySettings(settings).neteaseBitrate,
  });
  return `${path}?${params.toString()}`;
}
