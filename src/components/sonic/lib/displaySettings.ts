export interface ClockSettings {
  visible: boolean;
  position: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  size: number;
  color: string;
  followThemeColor: boolean;
  opacity: number;
}

export interface ShortcutSettings {
  playPause: string;
  prevSong: string;
  nextSong: string;
}

export interface DisplaySettings {
  showLeftIcon: boolean;
  showRightIcon: boolean;
  showBottomPlayer: boolean;
  showLyrics: boolean;
  showCover: boolean;
  clock: ClockSettings;
  shortcuts: ShortcutSettings;
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  showLeftIcon: true,
  showRightIcon: true,
  showBottomPlayer: true,
  showLyrics: true,
  showCover: true,
  clock: {
    visible: false,
    position: 'top-center',
    size: 200,
    color: '#f50000',
    followThemeColor: true,
    opacity: 0.7,
  },
  shortcuts: {
    playPause: 'Space',
    prevSong: 'Ctrl+ArrowLeft',
    nextSong: 'Ctrl+ArrowRight',
  }
};

const STORAGE_KEY = 'sonic_topography_display_settings';

export function readDisplaySettingsStorage(): DisplaySettings {
  if (typeof window === 'undefined') return DEFAULT_DISPLAY_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // deep merge for nested objects like clock
      return {
        ...DEFAULT_DISPLAY_SETTINGS,
        ...parsed,
        clock: {
          ...DEFAULT_DISPLAY_SETTINGS.clock,
          ...(parsed.clock || {})
        },
        shortcuts: {
          ...DEFAULT_DISPLAY_SETTINGS.shortcuts,
          ...(parsed.shortcuts || {})
        }
      };
    }
  } catch (e) {
    console.error('Failed to read display settings from storage', e);
  }
  return DEFAULT_DISPLAY_SETTINGS;
}

export function writeDisplaySettingsStorage(settings: DisplaySettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to write display settings to storage', e);
  }
}
