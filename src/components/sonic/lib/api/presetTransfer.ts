/**
 * 预设导入导出。
 * 定义可移植的预设包格式（主题、歌词、均衡器等设置与歌单），并提供打包、解析与校验归一化逻辑。
 */
import {
  readDisplaySettingsStorage,
  writeDisplaySettingsStorage,
  type DisplaySettings,
} from '../settings/displaySettings';
import {
  GROUND_EQ_STORAGE_KEY,
  normalizeGroundEqSettings,
  type StoredGroundEqSettings,
} from '../settings/groundEqSettings';
import {
  normalizeLyricsSettings,
  readLyricsSettingsStorage,
  writeLyricsSettingsStorage,
  type LyricsSettings,
} from '../settings/lyricsSettings';
import {
  normalizeTriggerConfig,
  TRIGGER_SETTINGS_STORAGE_KEY,
  type StoredTriggerSettings,
} from '../settings/triggerSettings';
import {
  NETEASE_COOKIE_STORAGE_KEY,
  normalizeNeteaseCookie,
} from '../storage/neteaseCookie';
import { normalizeQQCookie, QQ_COOKIE_STORAGE_KEY } from '../storage/qqCookie';
import {
  ACTIVE_CUSTOM_THEME_STORAGE_KEY,
  ACTIVE_THEME_STORAGE_KEY,
  BUILT_IN_THEME_IDS,
  CUSTOM_THEME_ID,
  CUSTOM_THEME_STORAGE_KEY,
  DEFAULT_THEME_ID,
  defaultCustomThemeSettings,
  defaultThemeRotationSettings,
  normalizeCustomThemeSettings,
  normalizeThemeRotationSettings,
  THEME_ROTATION_STORAGE_KEY,
  type CustomThemeSettings,
  type ThemeRotationSettings,
} from '../theme/themes';

export const PRESET_TRANSFER_VERSION = 1;
export const PLAYLIST_STORAGE_KEY = 'sonic-topography-playlists-v1';

export interface TransferSong {
  id: number;
  name: string;
  artist: string;
  album: string;
  duration: number;
  fee: number;
}

export interface TransferPlaylist {
  id: string;
  name: string;
  songs: TransferSong[];
}

export interface PresetTransferPackage {
  app: 'sonic-topography';
  version: number;
  exportedAt: string;
  data: {
    playlists: TransferPlaylist[];
    triggerSettings: StoredTriggerSettings;
    groundEqSettings: StoredGroundEqSettings;
    customThemes: CustomThemeSettings[];
    activeCustomThemeId: string;
    activeThemeId: string;
    themeRotation: ThemeRotationSettings;
    neteaseCookie?: string;
    qqCookie?: string;
    displaySettings?: DisplaySettings;
    lyricsSettings?: LyricsSettings;
  };
}

export interface CreatePresetTransferOptions {
  includeCookies?: boolean;
}

function readJsonStorage(key: string) {
  if (typeof window === 'undefined') return undefined;
  const raw = window.localStorage.getItem(key);
  if (!raw) return undefined;
  return JSON.parse(raw);
}

function normalizeSong(value: unknown): TransferSong | null {
  const v = value as Record<string, unknown>;
  const id = Number(v?.id);
  const name = String(v?.name || '').trim();
  if (!Number.isFinite(id) || !name) return null;

  return {
    id,
    name,
    artist: String(v?.artist || ''),
    album: String(v?.album || ''),
    duration: Number.isFinite(Number(v?.duration))
      ? Number(v.duration)
      : 0,
    fee: Number.isFinite(Number(v?.fee)) ? Number(v.fee) : 0,
  };
}

export function normalizeTransferPlaylists(value: unknown): TransferPlaylist[] {
  if (!Array.isArray(value)) {
    return [{ id: 'favorites', name: 'Favorites', songs: [] }];
  }

  const playlists = value.map((playlist, index) => {
    const p = playlist as Record<string, unknown>;
    const songs = Array.isArray(p?.songs)
      ? (p.songs.map(normalizeSong).filter(Boolean) as TransferSong[])
      : [];
    return {
      id: String(p?.id || `playlist-${Date.now()}-${index}`),
      name: String(p?.name || 'Playlist'),
      songs,
    };
  });

  if (!playlists.some((playlist) => playlist.id === 'favorites')) {
    playlists.unshift({ id: 'favorites', name: 'Favorites', songs: [] });
  }

  return playlists;
}

function normalizeActiveThemeId(value: unknown) {
  const themeId = String(value || '');
  return themeId === CUSTOM_THEME_ID || BUILT_IN_THEME_IDS.includes(themeId)
    ? themeId
    : DEFAULT_THEME_ID;
}

function normalizeActiveCustomThemeId(
  value: unknown,
  customThemes: CustomThemeSettings[]
) {
  const presetId = String(value || '');
  return customThemes.some((preset) => preset.id === presetId)
    ? presetId
    : customThemes[0]?.id || defaultCustomThemeSettings.id;
}

function normalizeTriggerSettings(value: unknown): StoredTriggerSettings {
  const v = value as Record<string, unknown>;
  return {
    Pulse: normalizeTriggerConfig(v?.Pulse as Parameters<typeof normalizeTriggerConfig>[0]),
    Meteor: normalizeTriggerConfig(v?.Meteor as Parameters<typeof normalizeTriggerConfig>[0]),
  };
}

export function normalizePresetTransferPackage(
  value: unknown
): PresetTransferPackage {
  const input = value as Record<string, unknown>;
  if (
    !input ||
    input.app !== 'sonic-topography' ||
    input.version !== PRESET_TRANSFER_VERSION ||
    !input.data
  ) {
    throw new Error('这个文件不是可用的 Sonic Topography 预设文件');
  }

  const data = input.data as Record<string, unknown>;
  const customThemesRaw =
    Array.isArray(data.customThemes) && data.customThemes.length > 0
      ? data.customThemes
      : [defaultCustomThemeSettings];
  const customThemes = customThemesRaw.map((preset) =>
    normalizeCustomThemeSettings(preset as Parameters<typeof normalizeCustomThemeSettings>[0])
  );
  const activeCustomThemeId = normalizeActiveCustomThemeId(
    data.activeCustomThemeId,
    customThemes
  );
  const availableThemeIds = [
    ...BUILT_IN_THEME_IDS,
    ...customThemes.map((preset: CustomThemeSettings) => preset.id),
  ];

  const normalized: PresetTransferPackage = {
    app: 'sonic-topography',
    version: PRESET_TRANSFER_VERSION,
    exportedAt: String(input.exportedAt || new Date().toISOString()),
    data: {
      playlists: normalizeTransferPlaylists(data.playlists),
      triggerSettings: normalizeTriggerSettings(data.triggerSettings),
      groundEqSettings: normalizeGroundEqSettings(data.groundEqSettings as Parameters<typeof normalizeGroundEqSettings>[0]),
      customThemes,
      activeCustomThemeId,
      activeThemeId: normalizeActiveThemeId(data.activeThemeId),
      themeRotation: normalizeThemeRotationSettings(
        data.themeRotation || defaultThemeRotationSettings,
        availableThemeIds
      ),
    },
  };

  const cookie = normalizeNeteaseCookie(data.neteaseCookie as string | null | undefined);
  if (cookie) normalized.data.neteaseCookie = cookie;

  const qqCookie = normalizeQQCookie(data.qqCookie as string | null | undefined);
  if (qqCookie) normalized.data.qqCookie = qqCookie;

  if (data.displaySettings) {
    normalized.data.displaySettings = data.displaySettings as DisplaySettings;
  }
  if (data.lyricsSettings) {
    normalized.data.lyricsSettings = normalizeLyricsSettings(
      data.lyricsSettings
    );
  }

  return normalized;
}

export function createPresetTransferPackage(
  options: CreatePresetTransferOptions = {}
): PresetTransferPackage {
  const customThemes = (
    readJsonStorage(CUSTOM_THEME_STORAGE_KEY) as unknown[] | undefined
  )?.map((preset) => normalizeCustomThemeSettings(preset as Parameters<typeof normalizeCustomThemeSettings>[0])) || [
    defaultCustomThemeSettings,
  ];
  const activeCustomThemeId = normalizeActiveCustomThemeId(
    typeof window === 'undefined'
      ? ''
      : window.localStorage.getItem(ACTIVE_CUSTOM_THEME_STORAGE_KEY),
    customThemes
  );
  const availableThemeIds = [
    ...BUILT_IN_THEME_IDS,
    ...customThemes.map((preset) => preset.id),
  ];
  const activeThemeId = normalizeActiveThemeId(
    typeof window === 'undefined'
      ? ''
      : window.localStorage.getItem(ACTIVE_THEME_STORAGE_KEY)
  );

  const presetPackage: PresetTransferPackage = {
    app: 'sonic-topography',
    version: PRESET_TRANSFER_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      playlists: normalizeTransferPlaylists(
        readJsonStorage(PLAYLIST_STORAGE_KEY)
      ),
      triggerSettings: normalizeTriggerSettings(
        readJsonStorage(TRIGGER_SETTINGS_STORAGE_KEY)
      ),
      groundEqSettings: normalizeGroundEqSettings(
        readJsonStorage(GROUND_EQ_STORAGE_KEY)
      ),
      customThemes,
      activeCustomThemeId,
      activeThemeId,
      themeRotation: normalizeThemeRotationSettings(
        readJsonStorage(THEME_ROTATION_STORAGE_KEY) ||
          defaultThemeRotationSettings,
        availableThemeIds
      ),
      displaySettings: readDisplaySettingsStorage(),
      lyricsSettings: readLyricsSettingsStorage(),
    },
  };

  if (options.includeCookies && typeof window !== 'undefined') {
    const cookie = normalizeNeteaseCookie(
      window.localStorage.getItem(NETEASE_COOKIE_STORAGE_KEY)
    );
    if (cookie) presetPackage.data.neteaseCookie = cookie;
    const qqCookie = normalizeQQCookie(
      window.localStorage.getItem(QQ_COOKIE_STORAGE_KEY)
    );
    if (qqCookie) presetPackage.data.qqCookie = qqCookie;
  }

  return normalizePresetTransferPackage(presetPackage);
}

export function writePresetTransferPackage(
  presetPackage: PresetTransferPackage
) {
  if (typeof window === 'undefined')
    return normalizePresetTransferPackage(presetPackage);

  const normalized = normalizePresetTransferPackage(presetPackage);
  const data = normalized.data;
  window.localStorage.setItem(
    PLAYLIST_STORAGE_KEY,
    JSON.stringify(data.playlists)
  );
  window.localStorage.setItem(
    TRIGGER_SETTINGS_STORAGE_KEY,
    JSON.stringify(data.triggerSettings)
  );
  window.localStorage.setItem(
    GROUND_EQ_STORAGE_KEY,
    JSON.stringify(data.groundEqSettings)
  );
  window.localStorage.setItem(
    CUSTOM_THEME_STORAGE_KEY,
    JSON.stringify(data.customThemes)
  );
  window.localStorage.setItem(
    ACTIVE_CUSTOM_THEME_STORAGE_KEY,
    data.activeCustomThemeId
  );
  window.localStorage.setItem(ACTIVE_THEME_STORAGE_KEY, data.activeThemeId);
  window.localStorage.setItem(
    THEME_ROTATION_STORAGE_KEY,
    JSON.stringify(data.themeRotation)
  );

  if (data.displaySettings) {
    writeDisplaySettingsStorage(data.displaySettings);
  }
  if (data.lyricsSettings) {
    writeLyricsSettingsStorage(data.lyricsSettings);
  }

  if (data.neteaseCookie) {
    window.localStorage.setItem(NETEASE_COOKIE_STORAGE_KEY, data.neteaseCookie);
  } else {
    window.localStorage.removeItem(NETEASE_COOKIE_STORAGE_KEY);
  }

  if (data.qqCookie) {
    window.localStorage.setItem(QQ_COOKIE_STORAGE_KEY, data.qqCookie);
  } else {
    window.localStorage.removeItem(QQ_COOKIE_STORAGE_KEY);
  }

  return normalized;
}
