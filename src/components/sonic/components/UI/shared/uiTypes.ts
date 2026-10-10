/**
 * UI 层类型定义。
 * 包含主组件对外的 UIProps，以及设置标签页、云音乐来源、待删除项、右侧栏选中项等业务类型。
 */
import { type StoredGroundEqSettings } from '../../../lib/settings/groundEqSettings';
import { type LyricsSettings } from '../../../lib/settings/lyricsSettings';
import {
  type CustomThemeSettings,
  type ThemeColors,
  type ThemeRotationSettings,
} from '../../../lib/theme/themes';
import type { NeteaseSong } from '../../../types';

export interface UIProps {
  theme: string;
  resolvedTheme: ThemeColors;
  customThemes: CustomThemeSettings[];
  activeCustomThemeId: string;
  themeRotation: ThemeRotationSettings;
  groundEqSettings: StoredGroundEqSettings;
  onThemeChange: (theme: string) => void;
  onCustomThemesChange: (
    settings: CustomThemeSettings[],
    activeId?: string
  ) => void;
  onThemeRotationChange: (settings: ThemeRotationSettings) => void;
  onGroundEqSettingsChange: (settings: StoredGroundEqSettings) => void;
  lyricsSettings: LyricsSettings;
  onLyricsSettingsChange: (settings: LyricsSettings) => void;
  globalSceneSettings: { rotationSpeed: number };
  onGlobalSceneSettingsChange: (patch: { rotationSpeed?: number }) => void;
  onCurrentSongChange?: (song: NeteaseSong | null) => void;
  onCurrentLyricsChange?: (lyrics: string) => void;
  onLyricsVisibilityChange?: (visible: boolean) => void;
  onCoverVisibilityChange?: (visible: boolean) => void;
  isPerspectiveEditMode?: boolean;
  onPerspectiveEditModeChange?: (mode: boolean) => void;
  onResetCamera?: () => void;
}

export type OptionsTab =
  | 'Pulse'
  | 'Meteor'
  | 'FloatingBlocks'
  | 'GroundEq'
  | 'Color'
  | 'Audio'
  | 'Account'
  | 'Lyrics'
  | 'Display';

export type NeteaseCloudTab = 'liked' | 'playlists' | 'daily';

export type CloudProvider = 'netease' | 'qq';

export type PendingDelete =
  | { type: 'song'; playlistId: string; songId: number | string; label: string }
  | { type: 'playlist'; playlistId: string; label: string };

export type RightSidebarSelection = {
  type:
    | 'local'
    | 'netease_daily'
    | 'netease_liked'
    | 'netease_playlist'
    | 'qq_liked'
    | 'qq_playlist';
  id?: string | number;
};
