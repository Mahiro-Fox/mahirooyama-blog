/**
 * Sonic 播放器主界面组件（本目录的入口）。
 * 集中持有播放状态、搜索结果、云音乐歌单、本地歌单、登录凭证等状态与业务逻辑，
 * 再把渲染工作分发给 shared/common/layout/panels 下的子组件。
 */
import { ChevronLeft } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import {
  loadCloudPayload,
  loadServerPlaylists,
  loadSongLyrics,
  loadSongPlaybackResources,
  logoutQQProxy,
  saveServerPlaylists,
  searchCloudMusic,
  syncNeteaseProxyCookie,
  syncQQProxyCookie,
} from '../../lib/api/musicApi';
import {
  writePresetTransferPackage,
  type PresetTransferPackage,
} from '../../lib/api/presetTransfer';
import { engine } from '../../lib/audio/AudioEngine';
import { extractAudioMetadata } from '../../lib/audio/metadata';
import { t, useLanguage } from '../../lib/i18n/i18n';
import {
  readDisplaySettingsStorage,
  writeDisplaySettingsStorage,
  type DisplaySettings,
} from '../../lib/settings/displaySettings';
import {
  DEFAULT_MAX_CHARS_PER_LINE,
  DEFAULT_SPATIAL_ORBIT_OFFSET,
} from '../../lib/settings/lyricsSettings';
import {
  buildNeteasePlaybackUrl,
  buildQQPlaybackUrl,
  readPlaybackQualitySettingsStorage,
  writePlaybackQualitySettingsStorage,
  type PlaybackQualitySettings,
} from '../../lib/settings/playbackQuality';
import { isRepeatOneMode, type PlayMode } from '../../lib/settings/playMode';
import {
  readLastPlayedStorage,
  writeLastPlayedStorage,
} from '../../lib/storage/lastPlayedStorage';
import {
  readNeteaseCookieStorage,
  writeNeteaseCookieStorage,
} from '../../lib/storage/neteaseCookie';
import {
  getQQCookieLoginState,
  readQQCookieStorage,
  writeQQCookieStorage,
} from '../../lib/storage/qqCookie';
import {
  hasSavedSongs,
  readPinnedNeteasePlaylistsStorage,
  readPinnedQQPlaylistsStorage,
  readSavedPlaylists,
  readSearchProviderStorage,
  readSideNavHintSeen,
  writePinnedNeteasePlaylistsStorage,
  writePinnedQQPlaylistsStorage,
  writeSavedPlaylists,
  writeSearchProviderStorage,
  writeSideNavHintSeen,
  type SearchProvider,
} from '../../lib/storage/uiStorage';
import type {
  CloudPlaylistSummary as NeteasePlaylistSummary,
  NeteaseSong,
  SavedPlaylist,
} from '../../types';
import { useAudioInputController } from './hooks/useAudioInputController';
import { useUpdateController } from './hooks/useUpdateController';
import { BrandMark } from './layout/BrandMark';
import {
  DesktopTitleDragRegion,
  DesktopWindowControls,
} from './layout/DesktopChrome';
import { FloatingPanels } from './layout/FloatingPanels';
import { PlayerBar } from './layout/PlayerBar';
import { PlaylistsColumn } from './layout/PlaylistsColumn';
import { SidebarLeft } from './layout/SidebarLeft';
import { TracksColumn } from './layout/TracksColumn';
import { ClockDisplay } from './panels/ClockDisplay';
import { LyricsDisplay } from './panels/LyricsDisplay';
import { OptionsPanel } from './panels/OptionsPanel';
import { SplashScreen } from './panels/SplashScreen';
import { UpdatePromptModal } from './panels/UpdatePromptModal';
import {
  colorWithAlpha,
  readableAccentColor,
  relativeLuminanceFromHex,
  themedPanelStyle,
} from './shared/panelShared';
import {
  applyStoredTriggerConfig,
  baseUrl,
  songIdentity,
} from './shared/uiHelpers';
import {
  type CloudProvider,
  type NeteaseCloudTab,
  type PendingDelete,
  type UIProps,
} from './shared/uiTypes';

/**
 * 播放器主界面：负责状态与业务逻辑，组合左侧导航、播放列表列、曲目列、播放器控制栏及各浮层面板。
 * 接收来自 App 的主题与各项设置（见 uiTypes.ts 的 UIProps），并向上回报当前曲目/歌词/可见性变化。
 */
export function UI({
  theme,
  resolvedTheme,
  customThemes,
  activeCustomThemeId,
  themeRotation,
  groundEqSettings,
  onThemeChange,
  onCustomThemesChange,
  onThemeRotationChange,
  onGroundEqSettingsChange,
  lyricsSettings,
  onLyricsSettingsChange,
  globalSceneSettings,
  onGlobalSceneSettingsChange,
  onCurrentSongChange,
  onCurrentLyricsChange,
  onLyricsVisibilityChange,
  onCoverVisibilityChange,
  isPerspectiveEditMode,
  onPerspectiveEditModeChange,
  onResetCamera,
}: UIProps) {
  const lang = useLanguage();
  const {
    updateStatus,
    isCheckingUpdate,
    availableUpdate,
    showUpdatePrompt,
    downloadJob,
    showUpdateReleaseFallback,
    checkForUpdate,
    startUpdateDownload,
    openUpdateRelease,
    remindUpdateLater,
    skipThisUpdateVersion,
  } = useUpdateController(lang);
  const currentStyleConfig = lyricsSettings[lyricsSettings.style] ||
    (lyricsSettings as any)['songyancai'] || {
      activeFontSize: 32,
      inactiveFontSize: 18,
      fontColor: '#ffffff',
      glowColor: '#00ffff',
      followThemeGlow: true,
      karaokeColor: '#00ffff',
      followThemeKaraoke: true,
      position: 'center',
      triggerBand: 'subBass',
      fontFamily: 'serif',
      maxCharsPerLine: DEFAULT_MAX_CHARS_PER_LINE,
      spatialOrbitOffset: DEFAULT_SPATIAL_ORBIT_OFFSET,
    };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const demoAudioUrl = `${baseUrl}demo.mp3`;
  const demoLyricsUrl = `${baseUrl}demo.lrc`;
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = () => {
    setShowSplash(false);
    // 在这里可以执行额外的初始化，如加载音频等
  };
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackName, setTrackName] = useState<string>('No track selected');
  const [lyricsText, setLyricsText] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('sonic-volume');
      if (saved !== null) {
        const v = parseFloat(saved);
        if (!isNaN(v) && v >= 0 && v <= 1) return v;
      }
    }
    return 1;
  });

  useEffect(() => {
    engine.setVolume(volume);
  }, []);
  const [isDragging, setIsDragging] = useState(false);
  const [showOptionsPanel, setShowOptionsPanel] = useState(false);
  const [showAudioInputPanel, setShowAudioInputPanel] = useState(false);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(
    readDisplaySettingsStorage
  );
  const [playbackQualitySettings, setPlaybackQualitySettings] =
    useState<PlaybackQualitySettings>(readPlaybackQualitySettingsStorage);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showNeteasePanel, setShowNeteasePanel] = useState(false);
  const [cloudProvider, setCloudProvider] = useState<CloudProvider>('netease');
  const [searchProvider, setSearchProviderState] = useState<SearchProvider>(
    readSearchProviderStorage
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NeteaseSong[]>([]);
  const [searchStatus, setSearchStatus] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [neteaseCloudTab, setNeteaseCloudTab] =
    useState<NeteaseCloudTab>('daily');
  const [neteaseCloudSongs, setNeteaseCloudSongs] = useState<NeteaseSong[]>([]);
  const [neteaseCloudPlaylists, setNeteaseCloudPlaylists] = useState<
    NeteasePlaylistSummary[]
  >([]);
  const [activeNeteasePlaylistId, setActiveNeteasePlaylistId] = useState<
    number | string | null
  >(null);
  const [neteaseCloudStatus, setNeteaseCloudStatus] = useState('');
  const [isLoadingNeteaseCloud, setIsLoadingNeteaseCloud] = useState(false);
  const [showPlaylistPanel, setShowPlaylistPanel] = useState(false);
  const [playlists, setPlaylists] =
    useState<SavedPlaylist[]>(readSavedPlaylists);
  const [activePlaylistId, setActivePlaylistId] = useState('favorites');
  const [songToAdd, setSongToAdd] = useState<NeteaseSong | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [playMode, setPlayMode] = useState<PlayMode>('sequence');
  const [playQueue, setPlayQueue] = useState<NeteaseSong[]>([]);
  const [currentSongId, setCurrentSongId] = useState<number | string | null>(
    null
  );
  const [currentSong, setCurrentSongState] = useState<NeteaseSong | null>(null);
  const setCurrentSong = (song: NeteaseSong | null) => {
    setCurrentSongState(song);
    if (onCurrentSongChange) {
      onCurrentSongChange(song);
    }
  };

  const {
    audioInputMode,
    audioInputDevices,
    selectedAudioInputId,
    audioInputStatus,
    setAudioInputMode,
    setSelectedAudioInputId,
    setAudioInputStatus,
    refreshAudioInputDevices,
    startSystemAudioInput,
    startMicrophoneInput,
    returnToPlayerInput,
  } = useAudioInputController({
    currentTrackName: trackName,
    hasCurrentSong: Boolean(currentSong),
    onPrepareExternalInput: (label) => {
      setTrackName(label);
      setCurrentSong(null);
      setCurrentSongId(null);
      setCurrentCover('');
      setLyricsText('');
      setSearchStatus('');
      setShowSearchPanel(false);
      setShowNeteasePanel(false);
    },
    onResetDisconnectedInput: () => setTrackName('No track selected'),
    onReturnToPlayer: () => setTrackName('No track selected'),
    onClosePanel: () => setShowAudioInputPanel(false),
  });

  useEffect(() => {
    onCurrentLyricsChange?.(lyricsText);
  }, [lyricsText, onCurrentLyricsChange]);

  useEffect(() => {
    onLyricsVisibilityChange?.(displaySettings.showLyrics);
  }, [displaySettings.showLyrics, onLyricsVisibilityChange]);

  useEffect(() => {
    onCoverVisibilityChange?.(displaySettings.showCover);
  }, [displaySettings.showCover, onCoverVisibilityChange]);

  const [currentCover, setCurrentCover] = useState<string>('');
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null
  );
  const [neteaseCookie, setNeteaseCookie] = useState(readNeteaseCookieStorage);
  const [qqCookie, setQQCookie] = useState(readQQCookieStorage);
  const [cookieStatus, setCookieStatus] = useState('');
  const [qqCookieStatus, setQQCookieStatus] = useState('');
  const [isNeteaseCookieValid, setIsNeteaseCookieValid] = useState(false);
  const [isQQCookieValid, setIsQQCookieValid] = useState(false);
  const [isSyncingNeteaseCookie, setIsSyncingNeteaseCookie] = useState(false);
  const [isSyncingQQCookie, setIsSyncingQQCookie] = useState(false);
  const [desktopLoginStatus, setDesktopLoginStatus] = useState('');
  const [isMobileSideNavOpen, setIsMobileSideNavOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [fetchedNeteasePlaylists, setFetchedNeteasePlaylists] = useState<
    NeteasePlaylistSummary[]
  >([]);
  const [fetchedQQPlaylists, setFetchedQQPlaylists] = useState<
    NeteasePlaylistSummary[]
  >([]);
  const [pinnedNeteasePlaylists, setPinnedNeteasePlaylists] = useState<
    string[]
  >(readPinnedNeteasePlaylistsStorage);
  const [pinnedQQPlaylists, setPinnedQQPlaylists] = useState<string[]>(
    readPinnedQQPlaylistsStorage
  );
  const [showAllNetease, setShowAllNetease] = useState(false);
  const [showAllQQ, setShowAllQQ] = useState(false);

  useEffect(() => {
    writePinnedNeteasePlaylistsStorage(pinnedNeteasePlaylists);
  }, [pinnedNeteasePlaylists]);

  useEffect(() => {
    writePinnedQQPlaylistsStorage(pinnedQQPlaylists);
  }, [pinnedQQPlaylists]);

  const [activeRightSidebarSelection, setActiveRightSidebarSelection] =
    useState<{
      type:
        | 'local'
        | 'netease_daily'
        | 'netease_liked'
        | 'netease_playlist'
        | 'qq_liked'
        | 'qq_playlist';
      id?: string | number;
    }>({ type: 'local', id: 'favorites' });
  const [hasSeenSideNavHint, setHasSeenSideNavHint] =
    useState(readSideNavHintSeen);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [presetTransferStatus, setPresetTransferStatus] = useState('');
  const hasLoadedPlaylistsRef = useRef(false);
  const hasBothCloudLogins = isNeteaseCookieValid && isQQCookieValid;
  const effectiveSearchProvider: SearchProvider = hasBothCloudLogins
    ? searchProvider
    : isQQCookieValid && !isNeteaseCookieValid
      ? 'qq'
      : 'netease';
  const activeCloudLabel =
    cloudProvider === 'qq' ? t('ui.text.1', lang) : t('ui.text.2', lang);
  const effectiveSearchLabel =
    effectiveSearchProvider === 'qq'
      ? t('ui.text.3', lang)
      : t('ui.text.4', lang);

  const setSearchProvider = (provider: SearchProvider) => {
    setSearchProviderState(provider);
    writeSearchProviderStorage(provider);
  };

  const markSideNavHintSeen = () => {
    if (hasSeenSideNavHint) return;
    writeSideNavHintSeen();
    setHasSeenSideNavHint(true);
  };

  const openMobileSideNav = () => {
    markSideNavHintSeen();
    setIsMobileSideNavOpen(true);
  };

  const closeFloatingPanels = () => {
    setShowOptionsPanel(false);
    setShowAudioInputPanel(false);
    setShowSearchPanel(false);
    setShowNeteasePanel(false);
    setShowPlaylistPanel(false);
    setIsMobileSideNavOpen(false);
    setIsRightSidebarOpen(false);
  };

  const openOptionsPanel = () => {
    setShowAudioInputPanel(false);
    setShowSearchPanel(false);
    setShowNeteasePanel(false);
    setShowPlaylistPanel(false);
    setShowOptionsPanel(true);
    setIsMobileSideNavOpen(false);
  };

  const openSearchPanel = () => {
    setShowOptionsPanel(false);
    setShowAudioInputPanel(false);
    setShowNeteasePanel(false);
    setShowPlaylistPanel(false);
    setShowSearchPanel(true);
    setIsMobileSideNavOpen(false);
  };

  const openCloudPanel = (provider: CloudProvider) => {
    setCloudProvider(provider);
    setShowOptionsPanel(false);
    setShowAudioInputPanel(false);
    setShowSearchPanel(false);
    setShowPlaylistPanel(false);
    setShowNeteasePanel(true);
    setIsMobileSideNavOpen(false);
  };

  const openCloudPanelDefault = (provider: CloudProvider) => {
    openCloudPanel(provider);
    if (provider === 'qq') loadLikedSongs(provider);
    else loadDailyRecommendations();
  };

  const openPlaylistPanel = () => {
    setShowOptionsPanel(false);
    setShowAudioInputPanel(false);
    setShowSearchPanel(false);
    setShowNeteasePanel(false);
    setShowPlaylistPanel(true);
    setIsMobileSideNavOpen(false);
  };

  const openAudioInputPanel = () => {
    setShowOptionsPanel(false);
    setShowSearchPanel(false);
    setShowNeteasePanel(false);
    setShowPlaylistPanel(false);
    setShowAudioInputPanel(true);
    setIsMobileSideNavOpen(false);
  };

  useEffect(() => {
    writeDisplaySettingsStorage(displaySettings);
  }, [displaySettings]);

  useEffect(() => {
    writePlaybackQualitySettingsStorage(playbackQualitySettings);
  }, [playbackQualitySettings]);

  useEffect(() => {
    if (isMobileSideNavOpen) markSideNavHintSeen();
  }, [isMobileSideNavOpen]);

  useEffect(() => {
    if (!hasLoadedPlaylistsRef.current) return;
    writeSavedPlaylists(playlists);
    saveServerPlaylists(playlists).catch((error) => {
      console.warn('Unable to save playlists to local server:', error);
    });
  }, [playlists]);

  const syncNeteaseCookie = async (
    cookie: string,
    options: { silent?: boolean } = {}
  ) => {
    const normalizedCookie = cookie.trim();
    if (normalizedCookie && !options.silent) {
      setCookieStatus(t('ui.text.5', lang));
    }

    setIsSyncingNeteaseCookie(true);
    try {
      const { data } = await syncNeteaseProxyCookie(cookie);
      const valid = Boolean(data.valid);
      setIsNeteaseCookieValid(valid);
      if (!options.silent) {
        setCookieStatus(
          normalizedCookie
            ? valid
              ? t('ui.text.6', lang)
              : t('ui.text.7', lang)
            : t('ui.text.8', lang)
        );
      }
      if (normalizedCookie && !valid) {
        syncNeteaseProxyCookie('').catch((error) => {
          console.warn('Unable to clear invalid Netease proxy cookie:', error);
        });
      }
      return valid;
    } catch (error) {
      console.warn('Unable to sync Netease cookie:', error);
      if (!options.silent) {
        setIsNeteaseCookieValid(false);
      }
      if (!options.silent) {
        setCookieStatus(t('ui.text.9', lang));
      }
      return options.silent && isNeteaseCookieValid;
    } finally {
      setIsSyncingNeteaseCookie(false);
    }
  };

  const syncQQCookie = async (
    cookie: string,
    options: { silent?: boolean } = {}
  ) => {
    const normalizedCookie = cookie.trim();
    if (normalizedCookie && !options.silent)
      setQQCookieStatus(t('ui.text.10', lang));

    setIsSyncingQQCookie(true);
    try {
      const { ok, data } = await syncQQProxyCookie(cookie);
      const valid = ok && Boolean(data.loggedIn);
      setIsQQCookieValid(valid);
      if (!options.silent) {
        setQQCookieStatus(
          normalizedCookie
            ? valid
              ? t('ui.text.11', lang)
              : t('ui.text.12', lang)
            : t('ui.text.13', lang)
        );
      }
      return valid;
    } catch (error) {
      console.warn('Unable to sync QQ cookie:', error);
      if (!options.silent) {
        setIsQQCookieValid(false);
        setQQCookieStatus(t('ui.text.14', lang));
      }
      return options.silent && isQQCookieValid;
    } finally {
      setIsSyncingQQCookie(false);
    }
  };

  useEffect(() => {
    const savedCookie = readNeteaseCookieStorage();
    if (savedCookie) {
      setNeteaseCookie(savedCookie);
      syncNeteaseCookie(savedCookie);
    }

    const savedQQCookie = readQQCookieStorage();
    if (savedQQCookie) {
      setQQCookie(savedQQCookie);
      syncQQCookie(savedQQCookie);
    }
  }, []);

  const saveNeteaseCookie = () => {
    writeNeteaseCookieStorage(neteaseCookie);
    const normalizedCookie = readNeteaseCookieStorage();
    setNeteaseCookie(normalizedCookie);
    syncNeteaseCookie(normalizedCookie);
  };

  const clearNeteaseCookie = async () => {
    writeNeteaseCookieStorage('');
    setNeteaseCookie('');
    setIsNeteaseCookieValid(false);
    syncNeteaseCookie('');
    if (window.sonicDesktop?.isDesktop) {
      await window.sonicDesktop.clearNeteaseLogin().catch((error) => {
        console.warn('Unable to clear Netease desktop session:', error);
      });
    }
  };

  const saveQQCookie = () => {
    writeQQCookieStorage(qqCookie);
    const normalizedCookie = readQQCookieStorage();
    setQQCookie(normalizedCookie);
    syncQQCookie(normalizedCookie);
  };

  const clearQQCookie = async () => {
    writeQQCookieStorage('');
    setQQCookie('');
    setIsQQCookieValid(false);
    setQQCookieStatus(t('ui.text.15', lang));
    await logoutQQProxy().catch((error) => {
      console.warn('Unable to clear QQ proxy cookie:', error);
    });
    if (window.sonicDesktop?.isDesktop) {
      await window.sonicDesktop.clearQQLogin().catch((error) => {
        console.warn('Unable to clear QQ desktop session:', error);
      });
    }
  };

  const startDesktopNeteaseLogin = async () => {
    if (!window.sonicDesktop?.isDesktop) return;
    setDesktopLoginStatus(t('ui.text.16', lang));
    try {
      const result = await window.sonicDesktop.openNeteaseLogin();
      if (!result?.ok || !result.cookie) {
        setDesktopLoginStatus(
          result?.message || result?.error || t('ui.text.17', lang)
        );
        return;
      }
      writeNeteaseCookieStorage(result.cookie);
      const normalizedCookie = readNeteaseCookieStorage();
      setNeteaseCookie(normalizedCookie);
      const valid = await syncNeteaseCookie(normalizedCookie);
      setDesktopLoginStatus(
        valid ? t('ui.text.18', lang) : t('ui.text.19', lang)
      );
    } catch (error) {
      console.warn('Unable to open Netease desktop login:', error);
      setDesktopLoginStatus(t('ui.text.20', lang));
    }
  };

  const startDesktopQQLogin = async () => {
    if (!window.sonicDesktop?.isDesktop) return;
    setDesktopLoginStatus(t('ui.text.21', lang));
    try {
      const result = await window.sonicDesktop.openQQLogin();
      if (!result?.ok || !result.cookie) {
        setDesktopLoginStatus(
          result?.message || result?.error || t('ui.text.22', lang)
        );
        return;
      }
      writeQQCookieStorage(result.cookie);
      const normalizedCookie = readQQCookieStorage();
      setQQCookie(normalizedCookie);
      const valid = await syncQQCookie(normalizedCookie);
      const state = getQQCookieLoginState(normalizedCookie);
      setDesktopLoginStatus(
        valid
          ? state.playbackKeyReady
            ? t('ui.text.23', lang)
            : t('ui.text.24', lang)
          : t('ui.text.25', lang)
      );
    } catch (error) {
      console.warn('Unable to open QQ desktop login:', error);
      setDesktopLoginStatus(t('ui.text.26', lang));
    }
  };

  const syncImportedPlaylists = (nextPlaylists: SavedPlaylist[]) => {
    saveServerPlaylists(nextPlaylists).catch((error) => {
      console.warn('Unable to save imported playlists to local server:', error);
    });
  };

  const applyPresetTransferPackage = async (
    presetPackage: PresetTransferPackage
  ) => {
    const normalized = writePresetTransferPackage(presetPackage);
    const data = normalized.data;

    applyStoredTriggerConfig(engine.pulseTrigger, data.triggerSettings.Pulse);
    applyStoredTriggerConfig(engine.meteorTrigger, data.triggerSettings.Meteor);
    onCustomThemesChange(data.customThemes, data.activeCustomThemeId);
    onThemeRotationChange(data.themeRotation);
    onGroundEqSettingsChange(data.groundEqSettings);
    onThemeChange(data.activeThemeId);

    setPlaylists(data.playlists);
    setActivePlaylistId(data.playlists[0]?.id || 'favorites');
    syncImportedPlaylists(data.playlists);

    const importedCookie = data.neteaseCookie || '';
    setNeteaseCookie(importedCookie);
    if (importedCookie) {
      await syncNeteaseCookie(importedCookie);
    } else {
      setIsNeteaseCookieValid(false);
      await syncNeteaseCookie('', { silent: true });
    }

    setPresetTransferStatus(t('ui.text.38', lang));
  };

  const ensureCloudCookieReady = async (
    provider: CloudProvider = cloudProvider
  ) => {
    const label =
      provider === 'qq' ? t('ui.text.39', lang) : t('ui.text.40', lang);
    const savedCookie =
      provider === 'qq' ? readQQCookieStorage() : readNeteaseCookieStorage();
    if (!savedCookie.trim()) {
      if (provider === 'qq') setIsQQCookieValid(false);
      else setIsNeteaseCookieValid(false);
      setNeteaseCloudStatus(`请先在设置里登录可用的${label}账号`);
      openOptionsPanel();
      return '';
    }

    if (provider === 'qq') setQQCookie(savedCookie);
    else setNeteaseCookie(savedCookie);
    const valid =
      provider === 'qq'
        ? await syncQQCookie(savedCookie, { silent: isQQCookieValid })
        : await syncNeteaseCookie(savedCookie, {
            silent: isNeteaseCookieValid,
          });
    if (!valid) {
      setNeteaseCloudStatus(`${label}账号需要重新登录`);
      openOptionsPanel();
      return '';
    }

    return savedCookie;
  };

  const fetchNeteaseSongs = async (
    url: string,
    emptyMessage: string,
    provider: CloudProvider = cloudProvider
  ) => {
    const readyCookie = await ensureCloudCookieReady(provider);
    if (!readyCookie) return;
    const label =
      provider === 'qq' ? t('ui.text.41', lang) : t('ui.text.42', lang);

    setIsLoadingNeteaseCloud(true);
    setNeteaseCloudStatus(t('ui.text.43', lang));

    try {
      const { ok, status, data } = await loadCloudPayload(
        url,
        provider,
        readyCookie
      );

      if (!ok) {
        if (status === 401) {
          if (provider === 'qq') setIsQQCookieValid(false);
          else setIsNeteaseCookieValid(false);
          setNeteaseCloudStatus(`${label}账号失效了，请重新登录`);
          openOptionsPanel();
        } else {
          setNeteaseCloudStatus(`${label}接口临时失败，请稍后再试`);
        }
        return;
      }

      const songs = Array.isArray(data.songs) ? data.songs : [];
      if (songs.length === 0) {
        setNeteaseCloudSongs([]);
        setNeteaseCloudStatus(emptyMessage);
        return;
      }

      setNeteaseCloudSongs(
        songs.map((song: NeteaseSong) => ({
          ...song,
          provider: song.provider || provider,
        }))
      );
      if (typeof data.status === 'string') {
        setNeteaseCloudStatus(data.status);
      } else if (data.fallback) {
        setNeteaseCloudStatus(t('ui.text.44', lang));
      } else if (data.playlist || typeof data.loadedCount === 'number') {
        const totalCount = Number(
          data.totalCount ||
            data.playlist?.trackCount ||
            data.rawTrackCount ||
            0
        );
        setNeteaseCloudStatus(
          totalCount > 0
            ? `已加载 ${songs.length} / ${totalCount} 首`
            : `已加载 ${songs.length} 首`
        );
      } else {
        setNeteaseCloudStatus('');
      }
    } catch (error) {
      console.warn('Unable to load cloud songs:', error);
      setNeteaseCloudStatus(t('ui.text.45', lang));
    } finally {
      setIsLoadingNeteaseCloud(false);
    }
  };

  const loadDailyRecommendations = async () => {
    const provider: CloudProvider = 'netease';
    setCloudProvider(provider);
    setNeteaseCloudTab('daily');
    setActiveNeteasePlaylistId(null);
    await fetchNeteaseSongs(
      '/api/netease/daily-recommend?limit=50',
      t('ui.text.46', lang),
      provider
    );
  };

  const loadLikedSongs = async (provider: CloudProvider = cloudProvider) => {
    setCloudProvider(provider);
    setNeteaseCloudTab('liked');
    setActiveNeteasePlaylistId(null);
    if (provider === 'netease') {
      await fetchNeteaseSongs(
        '/api/netease/liked?limit=all',
        t('ui.text.47', lang),
        provider
      );
      return;
    }
    const readyCookie = await ensureCloudCookieReady('qq');
    if (!readyCookie) return;
    setIsLoadingNeteaseCloud(true);
    setNeteaseCloudStatus(t('ui.text.48', lang));
    try {
      const { ok, data } = await loadCloudPayload(
        '/api/qq/user/playlists',
        'qq',
        readyCookie
      );
      if (!ok) {
        setIsQQCookieValid(false);
        setNeteaseCloudStatus(t('ui.text.49', lang));
        openOptionsPanel();
        return;
      }
      const playlists = Array.isArray(data.playlists) ? data.playlists : [];
      setNeteaseCloudPlaylists(playlists);
      const favorite =
        playlists.find(
          (playlist: NeteasePlaylistSummary) => playlist.isFavorite
        ) || playlists[0];
      if (!favorite) {
        setNeteaseCloudSongs([]);
        setNeteaseCloudStatus(t('ui.text.50', lang));
        return;
      }
      setActiveNeteasePlaylistId(favorite.id);
      await fetchNeteaseSongs(
        `/api/qq/playlist/tracks?id=${encodeURIComponent(String(favorite.id))}&limit=all`,
        t('ui.text.51', lang),
        provider
      );
    } catch (error) {
      console.warn('Unable to load QQ liked songs:', error);
      setNeteaseCloudStatus(t('ui.text.52', lang));
    } finally {
      setIsLoadingNeteaseCloud(false);
    }
  };

  const loadNeteasePlaylists = async (
    provider: CloudProvider = cloudProvider
  ) => {
    setCloudProvider(provider);
    setNeteaseCloudTab('playlists');
    setNeteaseCloudSongs([]);
    setActiveNeteasePlaylistId(null);
    const readyCookie = await ensureCloudCookieReady(provider);
    if (!readyCookie) return;
    const label =
      provider === 'qq' ? t('ui.text.53', lang) : t('ui.text.54', lang);

    setIsLoadingNeteaseCloud(true);
    setNeteaseCloudStatus(t('ui.text.55', lang));

    try {
      const { ok, status, data } = await loadCloudPayload(
        provider === 'qq' ? '/api/qq/user/playlists' : '/api/netease/playlists',
        provider,
        readyCookie
      );

      if (!ok) {
        if (status === 401) {
          if (provider === 'qq') setIsQQCookieValid(false);
          else setIsNeteaseCookieValid(false);
          setNeteaseCloudStatus(`${label}账号失效了，请重新登录`);
          openOptionsPanel();
        } else {
          setNeteaseCloudStatus(`${label}接口临时失败，请稍后再试`);
        }
        return;
      }

      const cloudPlaylists = (
        Array.isArray(data.playlists) ? data.playlists : []
      ).filter(
        (playlist: NeteasePlaylistSummary) =>
          provider !== 'qq' || !playlist.isFavorite
      );
      setNeteaseCloudPlaylists(cloudPlaylists);
      setNeteaseCloudStatus(
        cloudPlaylists.length ? t('ui.text.56', lang) : `没有找到${label}歌单`
      );
    } catch (error) {
      console.warn('Unable to load cloud playlists:', error);
      setNeteaseCloudStatus(t('ui.text.57', lang));
    } finally {
      setIsLoadingNeteaseCloud(false);
    }
  };

  const loadNeteasePlaylistSongs = async (playlist: NeteasePlaylistSummary) => {
    const provider = playlist.provider || cloudProvider;
    setCloudProvider(provider);
    setActiveNeteasePlaylistId(playlist.id);
    const url =
      provider === 'qq'
        ? `/api/qq/playlist/tracks?id=${encodeURIComponent(String(playlist.id))}&limit=all`
        : `/api/netease/playlist?id=${encodeURIComponent(String(playlist.id))}&limit=all`;
    await fetchNeteaseSongs(url, t('ui.text.58', lang), provider);
  };

  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        const { ok, data } = await loadServerPlaylists();
        if (!ok) throw new Error('Playlist request failed');
        if (Array.isArray(data.playlists) && data.playlists.length > 0) {
          const serverPlaylists = data.playlists;
          const browserPlaylists = readSavedPlaylists();
          if (
            !hasSavedSongs(serverPlaylists) &&
            hasSavedSongs(browserPlaylists)
          ) {
            setPlaylists(browserPlaylists);
          } else {
            setPlaylists(serverPlaylists);
          }
        }
      } catch (error) {
        console.warn('Using browser playlist storage:', error);
      } finally {
        hasLoadedPlaylistsRef.current = true;
      }
    };

    loadPlaylists();
  }, []);

  useEffect(() => {
    if (isRightSidebarOpen) {
      if (isNeteaseCookieValid && fetchedNeteasePlaylists.length === 0) {
        ensureCloudCookieReady('netease').then((cookie) => {
          if (!cookie) return;
          loadCloudPayload('/api/netease/playlists', 'netease', cookie)
            .then(({ data }) => {
              if (data.playlists) setFetchedNeteasePlaylists(data.playlists);
            })
            .catch(() => {});
        });
      }
      if (isQQCookieValid && fetchedQQPlaylists.length === 0) {
        ensureCloudCookieReady('qq').then((cookie) => {
          if (!cookie) return;
          loadCloudPayload('/api/qq/user/playlists', 'qq', cookie)
            .then(({ data }) => {
              if (data.playlists) {
                setFetchedQQPlaylists(
                  data.playlists.filter(
                    (p: NeteasePlaylistSummary) => !p.isFavorite
                  )
                );
              }
            })
            .catch(() => {});
        });
      }
    }
  }, [
    isRightSidebarOpen,
    isNeteaseCookieValid,
    isQQCookieValid,
    fetchedNeteasePlaylists.length,
    fetchedQQPlaylists.length,
  ]);

  // Audio state poller
  useEffect(() => {
    const initEngine = async () => {
      await engine.init();
    };
    initEngine();

    const poll = () => {
      const nextIsPlaying = engine.isPlaying;
      const nextCurrentTime = engine.audioElement.currentTime || 0;
      const nextDuration = engine.audioElement.duration || 0;
      const nextVolume = engine.getVolume();

      setIsPlaying((current) =>
        current === nextIsPlaying ? current : nextIsPlaying
      );
      setCurrentTime((current) =>
        Math.abs(current - nextCurrentTime) < 0.05 ? current : nextCurrentTime
      );
      setDuration((current) =>
        Math.abs(current - nextDuration) < 0.05 ? current : nextDuration
      );
      setVolume((current) =>
        Math.abs(current - nextVolume) < 0.005 ? current : nextVolume
      );
    };
    poll();
    const intervalId = window.setInterval(poll, 100);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    syncFullscreenState();
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () =>
      document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.warn('Unable to toggle fullscreen:', error);
    } finally {
      setIsMobileSideNavOpen(false);
    }
  };

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    let audioFile: File | null = null;
    let lrcFile: File | null = null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (
        file.type.startsWith('audio/') ||
        file.name.endsWith('.mp3') ||
        file.name.endsWith('.wav') ||
        file.name.endsWith('.flac')
      ) {
        audioFile = file;
      } else if (file.name.endsWith('.lrc')) {
        lrcFile = file;
      }
    }

    if (audioFile) {
      setAudioInputMode('player');
      setAudioInputStatus('');
      setLyricsText('');
      const metadata = await extractAudioMetadata(audioFile, audioFile.name);
      if (metadata.lyrics) {
        setLyricsText(metadata.lyrics);
      }
      setTrackName(metadata.displayName);
      setCurrentSong(null);
      setCurrentSongId(null);
      setCurrentCover(metadata.cover || '');
    } else {
      setLyricsText('');
      setCurrentCover('');
    }

    if (lrcFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setLyricsText(text);
      };
      reader.readAsText(lrcFile);
    }

    if (audioFile) {
      engine.init();
      engine.loadFile(audioFile);
      engine.play();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const loadDemo = async () => {
    const audioName = demoAudioUrl.split('/').pop() || 'demo.mp3';

    setTrackName('Loading demo...');
    setLyricsText('');
    setCurrentSong(null);
    setCurrentSongId(null);
    setCurrentCover('');

    try {
      const audioResponse = await fetch(demoAudioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Demo audio not found: ${demoAudioUrl}`);
      }

      const audioBlob = await audioResponse.blob();
      const metadata = await extractAudioMetadata(audioBlob, audioName);
      setAudioInputMode('player');
      setAudioInputStatus('');
      setTrackName(metadata.displayName);
      setCurrentCover(metadata.cover || '');

      let demoLyrics = metadata.lyrics || '';
      try {
        const lyricsResponse = await fetch(demoLyricsUrl, {
          cache: 'no-store',
        });
        if (lyricsResponse.ok) {
          demoLyrics = await lyricsResponse.text();
        }
      } catch (error) {
        console.warn('Demo lyrics file is not available:', error);
      }

      setLyricsText(demoLyrics);
      engine.init();
      engine.loadUrl(demoAudioUrl);
      engine.play();
    } catch (error) {
      console.warn('Unable to load demo track:', error);
      setTrackName('No track selected');
      setLyricsText('');
      setCurrentCover('');
    }
  };

  const togglePlay = () => {
    if (audioInputMode !== 'player') {
      returnToPlayerInput();
      return;
    }
    engine.init();
    engine.togglePlay();
  };

  const searchNetease = async () => {
    const keywords = searchQuery.trim();
    if (!keywords) return;
    const provider = effectiveSearchProvider;
    const requestCookie =
      provider === 'netease' && isNeteaseCookieValid ? neteaseCookie : '';
    const requestQQCookie =
      provider === 'qq' && isQQCookieValid ? qqCookie : '';

    setIsSearching(true);
    setSearchStatus(
      `正在搜索${provider === 'qq' ? t('ui.text.59', lang) : t('ui.text.60', lang)}可播放歌曲...`
    );
    setSearchResults([]);

    try {
      const { ok, data } = await searchCloudMusic(
        provider,
        keywords,
        provider === 'qq' ? requestQQCookie : requestCookie
      );
      if (!ok) throw new Error(`${provider} search request failed`);

      const songs = (Array.isArray(data.songs) ? data.songs : []).map(
        (song: NeteaseSong) => ({ ...song, provider })
      );
      const rawCount = Number(data.rawCount || songs.length || 0);
      setSearchResults(songs);
      setSearchStatus(
        songs.length
          ? ''
          : rawCount > 0
            ? provider === 'netease' && !requestCookie
              ? `搜到 ${rawCount} 首，但未登录只能显示可播放歌曲；保存网易云 Cookie 后可能会显示更多。`
              : `搜到 ${rawCount} 首，但当前账号没有可播放版本，可能受版权、会员或地区限制。`
            : provider === 'qq'
              ? t('ui.text.61', lang)
              : requestCookie
                ? `搜到 ${rawCount} 首，但当前账号没有可播放版本，可能受版权、会员或地区限制。`
                : t('ui.text.62', lang)
      );
    } catch (error) {
      console.warn('Music search failed:', error);
      setSearchStatus(t('ui.text.63', lang));
    } finally {
      setIsSearching(false);
    }
  };

  const loadNeteaseSong = async (song: NeteaseSong, queue?: NeteaseSong[]) => {
    setAudioInputMode('player');
    setAudioInputStatus('');
    if (queue) setPlayQueue(queue);
    setCurrentSongId(songIdentity(song));
    setCurrentSong(song);
    setCurrentCover(song.cover || '');
    setTrackName(`${song.artist ? `${song.artist} - ` : ''}${song.name}`);
    setLyricsText('');
    setSearchStatus(t('ui.text.64', lang));
    const provider = song.provider || 'netease';
    const requestCookie =
      provider === 'netease' && isNeteaseCookieValid ? neteaseCookie : '';
    const requestQQCookie =
      provider === 'qq' && isQQCookieValid ? qqCookie : '';

    // persist last played
    writeLastPlayedStorage({
      type: 'cloud',
      song,
      trackName: `${song.artist ? `${song.artist} - ` : ''}${song.name}`,
      cover: song.cover || '',
      queue: queue || playQueue,
    });

    try {
      if (provider === 'qq') {
        const mid = song.mid || song.songmid || String(song.id);
        const mediaMid = song.mediaMid || '';
        const qqSong = { mid, mediaMid };
        const { urlData, lyricData } = await loadSongPlaybackResources(
          song,
          playbackQualitySettings,
          requestCookie,
          requestQQCookie
        );
        setLyricsText(
          lyricData.lyric || lyricData.tlyric || lyricData.qrc || ''
        );

        if (!urlData.url) {
          setSearchStatus(urlData.message || t('ui.text.65', lang));
          playFromQueue(1, songIdentity(song));
          return;
        }

        engine.init();
        engine.loadUrl(
          buildQQPlaybackUrl('/api/qq/audio', qqSong, playbackQualitySettings)
        );
        engine.play();
        setSearchStatus('');
        setShowSearchPanel(false);
        return;
      }

      const { urlData, lyricData } = await loadSongPlaybackResources(
        song,
        playbackQualitySettings,
        requestCookie,
        requestQQCookie
      );
      const lyric = lyricData.lyric || lyricData.translatedLyric || '';
      setLyricsText(lyric);

      if (!urlData.url) {
        setSearchStatus(t('ui.text.66', lang));
        playFromQueue(1, songIdentity(song));
        return;
      }

      engine.init();
      engine.loadUrl(
        buildNeteasePlaybackUrl(
          '/api/cloudmusic/netease/audio',
          song.id,
          playbackQualitySettings
        )
      );
      engine.play();
      setSearchStatus('');
      setShowSearchPanel(false);
    } catch (error) {
      console.warn('Unable to load song:', error);
      setSearchStatus(t('ui.text.67', lang));
      playFromQueue(1, songIdentity(song));
    }
  };

  const getCurrentQueue = () =>
    playQueue.length > 0 ? playQueue : activePlaylist?.songs || [];

  const playFromQueue = (direction: 1 | -1, fromSongId = currentSongId) => {
    const queue = getCurrentQueue();
    if (queue.length === 0) return;

    let nextIndex = 0;
    const currentIndex = queue.findIndex(
      (song) => songIdentity(song) === fromSongId
    );

    if (playMode === 'shuffle' && queue.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * queue.length);
      } while (nextIndex === currentIndex);
    } else {
      const baseIndex = currentIndex >= 0 ? currentIndex : 0;
      nextIndex = (baseIndex + direction + queue.length) % queue.length;
    }

    loadNeteaseSong(queue[nextIndex], queue);
  };

  const restoreLastPlayedLyrics = async (
    song: NeteaseSong,
    provider: CloudProvider,
    requestCookie: string,
    requestQQCookie: string
  ) => {
    try {
      const { data: lyricData } = await loadSongLyrics(
        song,
        requestCookie,
        requestQQCookie
      );
      setLyricsText(
        lyricData.lyric ||
          lyricData.translatedLyric ||
          lyricData.tlyric ||
          lyricData.qrc ||
          ''
      );
    } catch (error) {
      console.warn('Unable to restore last played lyrics:', error);
      setLyricsText('');
    }
  };

  useEffect(() => {
    engine.audioElement.loop = isRepeatOneMode(playMode);
    return () => {
      engine.audioElement.loop = false;
    };
  }, [playMode]);

  useEffect(() => {
    const handleEnded = () => {
      const queue = getCurrentQueue();
      if (queue.length > 1) playFromQueue(1);
    };

    engine.audioElement.addEventListener('ended', handleEnded);
    return () => engine.audioElement.removeEventListener('ended', handleEnded);
  }, [playQueue, currentSongId, playMode, activePlaylistId, playlists]);

  // ── Restore last played cloud song on startup ──────────────────
  useEffect(() => {
    const last = readLastPlayedStorage();
    if (!last || last.type !== 'cloud' || !last.song) return;
    const song = last.song;
    // Restore UI state only (no autoplay — user clicks play to resume)
    setCurrentSong(song);
    if (last.queue && last.queue.length > 0) {
      setPlayQueue(last.queue);
    }
    setCurrentSongId(songIdentity(song));
    setTrackName(last.trackName);
    setCurrentCover(last.cover || song.cover || '');
    // Pre-load the audio URL silently so the player bar shows the track
    const provider = song.provider || 'netease';
    const requestCookie =
      provider === 'netease' && isNeteaseCookieValid ? neteaseCookie : '';
    const requestQQCookie =
      provider === 'qq' && isQQCookieValid ? qqCookie : '';
    restoreLastPlayedLyrics(song, provider, requestCookie, requestQQCookie);
    if (provider === 'qq') {
      const mid = song.mid || song.songmid || String(song.id);
      const mediaMid = song.mediaMid || '';
      engine.init();
      engine.loadUrl(
        buildQQPlaybackUrl(
          '/api/qq/audio',
          { mid, mediaMid },
          playbackQualitySettings
        )
      );
    } else {
      engine.init();
      engine.loadUrl(
        buildNeteasePlaybackUrl(
          '/api/cloudmusic/netease/audio',
          song.id,
          playbackQualitySettings
        )
      );
    }
    // Do NOT call engine.play() — leave paused for user to resume
  }, []); // run once on mount

  const addSongToPlaylist = (playlistId: string, song: NeteaseSong) => {
    setPlaylists((current) =>
      current.map((playlist) => {
        if (playlist.id !== playlistId) return playlist;
        const exists = playlist.songs.some(
          (savedSong) => songIdentity(savedSong) === songIdentity(song)
        );
        if (exists) return playlist;
        return { ...playlist, songs: [...playlist.songs, song] };
      })
    );
    const playlistName =
      playlists.find((playlist) => playlist.id === playlistId)?.name ||
      'playlist';
    setSearchStatus(`已加入 ${playlistName}`);
    setSongToAdd(null);
  };

  const addSongToFavorites = (song: NeteaseSong) => {
    setPlaylists((current) =>
      current.map((playlist) => {
        if (playlist.id !== 'favorites') return playlist;
        const exists = playlist.songs.some(
          (savedSong) => songIdentity(savedSong) === songIdentity(song)
        );
        if (exists) return playlist;
        return { ...playlist, songs: [...playlist.songs, song] };
      })
    );
    setSearchStatus(t('ui.text.68', lang));
    setNeteaseCloudStatus(t('ui.text.69', lang));
  };

  const createPlaylistAndAddSong = () => {
    const name = newPlaylistName.trim();
    if (!name || !songToAdd) return;

    const id = `playlist-${Date.now()}`;
    setPlaylists((current) => [...current, { id, name, songs: [songToAdd] }]);
    setActivePlaylistId(id);
    setSearchStatus(`已加入 ${name}`);
    setSongToAdd(null);
    setNewPlaylistName('');
  };

  const deleteSongFromPlaylist = (
    playlistId: string,
    songId: number | string
  ) => {
    setPlaylists((current) =>
      current.map((playlist) => {
        if (playlist.id !== playlistId) return playlist;
        return {
          ...playlist,
          songs: playlist.songs.filter(
            (song) => songIdentity(song) !== String(songId)
          ),
        };
      })
    );

    setPlayQueue((queue) =>
      queue.filter((song) => songIdentity(song) !== String(songId))
    );
    if (currentSongId === songId) {
      setCurrentSongId(null);
    }
  };

  const deletePlaylist = (playlistId: string) => {
    if (playlists.length <= 1) return;

    const nextPlaylists = playlists.filter(
      (playlist) => playlist.id !== playlistId
    );
    setPlaylists(nextPlaylists);

    if (activePlaylistId === playlistId) {
      setActivePlaylistId(nextPlaylists[0]?.id || 'favorites');
    }

    const deletedPlaylist = playlists.find(
      (playlist) => playlist.id === playlistId
    );
    if (
      deletedPlaylist?.songs.some(
        (song) => songIdentity(song) === currentSongId
      )
    ) {
      setPlayQueue([]);
      setCurrentSongId(null);
    }
  };

  const confirmPendingDelete = () => {
    if (!pendingDelete) return;

    if (pendingDelete.type === 'song') {
      deleteSongFromPlaylist(pendingDelete.playlistId, pendingDelete.songId);
    } else {
      deletePlaylist(pendingDelete.playlistId);
    }

    setPendingDelete(null);
  };

  const activePlaylist =
    playlists.find((playlist) => playlist.id === activePlaylistId) ||
    playlists[0];

  const latestRefs = useRef({ displaySettings, playFromQueue });
  useEffect(() => {
    latestRefs.current = { displaySettings, playFromQueue };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const matchShortcut = (shortcut: string, event: KeyboardEvent) => {
        if (!shortcut) return false;
        const parts = shortcut.split('+');
        const key = parts.pop() || '';
        const ctrlKey = parts.includes('Ctrl');
        const altKey = parts.includes('Alt');
        const shiftKey = parts.includes('Shift');

        if (key === 'Space') {
          return (
            event.code === 'Space' &&
            event.ctrlKey === ctrlKey &&
            event.altKey === altKey &&
            event.shiftKey === shiftKey
          );
        }

        const eventKeyCapitalized =
          event.key.length === 1 ? event.key.toUpperCase() : event.key;
        const keyCapitalized = key.length === 1 ? key.toUpperCase() : key;

        return (
          (event.key === key ||
            event.code === key ||
            eventKeyCapitalized === keyCapitalized) &&
          event.ctrlKey === ctrlKey &&
          event.altKey === altKey &&
          event.shiftKey === shiftKey
        );
      };

      const settings = latestRefs.current.displaySettings.shortcuts;

      if (settings?.playPause && matchShortcut(settings.playPause, e)) {
        e.preventDefault();
        engine.init();
        engine.togglePlay();
        return;
      }
      if (settings?.prevSong && matchShortcut(settings.prevSong, e)) {
        e.preventDefault();
        latestRefs.current.playFromQueue(-1);
        return;
      }
      if (settings?.nextSong && matchShortcut(settings.nextSong, e)) {
        e.preventDefault();
        latestRefs.current.playFromQueue(1);
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // Drag and drop global listeners
  useEffect(() => {
    const handleDragOverGlobal = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };
    const handleDragLeaveGlobal = (e: DragEvent) => {
      e.preventDefault();
      if (e.clientX === 0 || e.clientY === 0) {
        setIsDragging(false);
      }
    };
    const handleDropGlobal = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(e.dataTransfer?.files || null);
    };

    window.addEventListener('dragover', handleDragOverGlobal);
    window.addEventListener('dragleave', handleDragLeaveGlobal);
    window.addEventListener('drop', handleDropGlobal);

    return () => {
      window.removeEventListener('dragover', handleDragOverGlobal);
      window.removeEventListener('dragleave', handleDragLeaveGlobal);
      window.removeEventListener('drop', handleDropGlobal);
    };
  }, []);

  const accentHex = `#${resolvedTheme.uRippleColor.getHexString()}`;
  const surfaceHex = `#${resolvedTheme.uBaseColor1.getHexString()}`;
  const isLightSurface = relativeLuminanceFromHex(surfaceHex) > 0.58;
  const readableAccent = readableAccentColor(accentHex, isLightSurface);
  const uiTextColor = isLightSurface
    ? 'rgba(15, 23, 42, 0.84)'
    : 'rgba(255, 255, 255, 0.9)';
  const uiMutedColor = isLightSurface
    ? 'rgba(15, 23, 42, 0.56)'
    : 'rgba(255, 255, 255, 0.52)';
  const uiFaintColor = isLightSurface
    ? 'rgba(15, 23, 42, 0.38)'
    : 'rgba(255, 255, 255, 0.34)';
  const sideNavTextColor = 'rgba(255, 255, 255, 0.72)';
  const sideNavActiveColor = 'rgba(255, 255, 255, 0.94)';
  const _brandColor = isMobileSideNavOpen
    ? sideNavActiveColor
    : isLightSurface
      ? readableAccent
      : 'rgba(255, 255, 255, 0.96)';
  const _brandShadow = isLightSurface
    ? '0 1px 0 rgba(255,255,255,0.72), 0 10px 26px rgba(15,23,42,0.16)'
    : `0 10px 28px ${colorWithAlpha(accentHex, 0.18)}`;

  const lastPointerUpTime = useRef<number>(0);

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      lastPointerUpTime.current = Date.now();
    };
    window.addEventListener('pointerup', handleGlobalPointerUp, true);
    return () =>
      window.removeEventListener('pointerup', handleGlobalPointerUp, true);
  }, []);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if ((e.target as Element).tagName.toLowerCase() === 'canvas') {
        closeFloatingPanels();
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  return (
    <>
      {showSplash && (
        <SplashScreen
          onComplete={handleSplashComplete}
          surfaceColor={surfaceHex}
          accentColor={accentHex}
        />
      )}

      {isPerspectiveEditMode && (
        <div className="absolute top-8 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-3">
          <div className="animate-in fade-in slide-in-from-top-4 pointer-events-auto rounded-full border border-white/10 bg-black/60 px-6 py-3 text-sm font-medium tracking-widest text-white shadow-2xl backdrop-blur-md">
            {t('ui.text.70', lang)}
          </div>
          <div className="pointer-events-auto flex gap-4">
            <button
              onClick={() => onPerspectiveEditModeChange?.(false)}
              className="cursor-pointer rounded-full bg-white px-8 py-2.5 text-sm font-bold tracking-widest text-black transition-colors hover:bg-white/90"
            >
              {t('ui.text.71', lang)}
            </button>
            <button
              onClick={() => onResetCamera?.()}
              className="cursor-pointer rounded-full border border-white/20 bg-black/40 px-8 py-2.5 text-sm font-bold tracking-widest text-white transition-colors hover:bg-black/60"
            >
              {t('ui.text.72', lang)}
            </button>
          </div>
        </div>
      )}

      <div
        className="pointer-events-none absolute inset-0 z-10 flex h-full w-full"
        style={
          {
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            color: uiMutedColor,
            '--sonic-accent': accentHex,
            '--sonic-readable-accent': readableAccent,
            '--sonic-ui-text': uiTextColor,
            '--sonic-ui-muted': uiMutedColor,
            '--sonic-ui-faint': uiFaintColor,
            '--sonic-side-nav-text': sideNavTextColor,
            '--sonic-side-nav-active': sideNavActiveColor,
          } as React.CSSProperties
        }
      >
        <DesktopTitleDragRegion />
        <DesktopWindowControls />

        {isDragging && (
          <div
            className="pointer-events-none absolute inset-0 z-[60] m-4 flex items-center justify-center rounded-xl border-2 border-dashed font-mono text-2xl tracking-widest backdrop-blur-sm"
            style={{
              backgroundColor: `${accentHex}1a`,
              borderColor: accentHex,
              color: accentHex,
            }}
          >
            DROP AUDIO FILE TO PLAY
          </div>
        )}

        {!hasSeenSideNavHint && !isMobileSideNavOpen && (
          <div className="pointer-events-none absolute top-[88px] left-[56px] z-40 select-none">
            <div
              className="text-[14px] leading-7 tracking-[0.18em] sm:text-[15px]"
              style={{ color: uiMutedColor }}
            >
              {t('nav.hint', lang)}
            </div>
            <div
              className="text-[12px] leading-6 tracking-[0.16em] sm:text-[13px]"
              style={{ color: uiFaintColor }}
            >
              {t('ui.text.73', lang)}
            </div>
          </div>
        )}

        <SidebarLeft
          accentHex={accentHex}
          closeFloatingPanels={closeFloatingPanels}
          fileInputRef={fileInputRef}
          handleFileChange={handleFileChange}
          isFullscreen={isFullscreen}
          isLightSurface={isLightSurface}
          isMobileSideNavOpen={isMobileSideNavOpen}
          isNeteaseCookieValid={isNeteaseCookieValid}
          isPerspectiveEditMode={isPerspectiveEditMode}
          isQQCookieValid={isQQCookieValid}
          lastPointerUpTime={lastPointerUpTime}
          loadDemo={loadDemo}
          onPerspectiveEditModeChange={onPerspectiveEditModeChange}
          openAudioInputPanel={openAudioInputPanel}
          openCloudPanelDefault={openCloudPanelDefault}
          openMobileSideNav={openMobileSideNav}
          openOptionsPanel={openOptionsPanel}
          openPlaylistPanel={openPlaylistPanel}
          openSearchPanel={openSearchPanel}
          setIsMobileSideNavOpen={setIsMobileSideNavOpen}
          sideNavActiveColor={sideNavActiveColor}
          toggleFullscreen={toggleFullscreen}
        />

        {/* Sidebar Right */}
        <div
          className={`side-nav-trigger-right pointer-events-auto absolute top-0 right-0 z-[60] h-full transition-all ${isRightSidebarOpen ? 'is-mobile-open-right' : ''}`}
          onMouseEnter={(e) => {
            if (e.buttons !== 0) return;
            if (Date.now() - lastPointerUpTime.current < 100) return;
            setIsRightSidebarOpen(true);
          }}
          onMouseLeave={() => setIsRightSidebarOpen(false)}
        >
          {displaySettings.showRightIcon && (
            <button
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className={`pointer-events-auto absolute top-[50%] right-2 z-50 translate-y-[-50%] cursor-pointer transition-opacity hover:opacity-100 ${isRightSidebarOpen ? 'opacity-0' : 'opacity-40'}`}
              style={{
                color: isRightSidebarOpen
                  ? sideNavActiveColor
                  : isLightSurface
                    ? readableAccent
                    : 'rgba(255, 255, 255, 0.96)',
              }}
            >
              <ChevronLeft size={24} />
            </button>
          )}

          <aside
            className={`side-nav-panel-right pointer-events-auto absolute top-0 right-0 z-[61] flex h-full transition-transform duration-300 ${isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
            style={{
              ...themedPanelStyle(accentHex, isLightSurface ? 0.82 : 0.7),
              borderLeft: `1px solid ${colorWithAlpha(accentHex, isLightSurface ? 0.26 : 0.18)}`,
              boxShadow: `-16px 0 50px rgba(0,0,0,${isLightSurface ? 0.18 : 0.2})`,
            }}
          >
            <div className="flex h-full w-[540px]">
              <PlaylistsColumn
                accentHex={accentHex}
                activeRightSidebarSelection={activeRightSidebarSelection}
                fetchedNeteasePlaylists={fetchedNeteasePlaylists}
                fetchedQQPlaylists={fetchedQQPlaylists}
                isNeteaseCookieValid={isNeteaseCookieValid}
                isQQCookieValid={isQQCookieValid}
                loadDailyRecommendations={loadDailyRecommendations}
                loadLikedSongs={loadLikedSongs}
                loadNeteasePlaylistSongs={loadNeteasePlaylistSongs}
                pinnedNeteasePlaylists={pinnedNeteasePlaylists}
                pinnedQQPlaylists={pinnedQQPlaylists}
                playlists={playlists}
                setActivePlaylistId={setActivePlaylistId}
                setActiveRightSidebarSelection={setActiveRightSidebarSelection}
                setPinnedNeteasePlaylists={setPinnedNeteasePlaylists}
                setPinnedQQPlaylists={setPinnedQQPlaylists}
                setShowAllNetease={setShowAllNetease}
                setShowAllQQ={setShowAllQQ}
                showAllNetease={showAllNetease}
                showAllQQ={showAllQQ}
                surfaceHex={surfaceHex}
              />

              <TracksColumn
                activePlaylist={activePlaylist}
                activeRightSidebarSelection={activeRightSidebarSelection}
                currentSongId={currentSongId}
                formatTime={formatTime}
                loadNeteaseSong={loadNeteaseSong}
                neteaseCloudSongs={neteaseCloudSongs}
              />
            </div>
          </aside>
        </div>

        <BrandMark
          displaySettings={displaySettings}
          isLightSurface={isLightSurface}
          isMobileSideNavOpen={isMobileSideNavOpen}
          openMobileSideNav={openMobileSideNav}
          readableAccent={readableAccent}
          setIsMobileSideNavOpen={setIsMobileSideNavOpen}
          sideNavActiveColor={sideNavActiveColor}
        />
        <FloatingPanels
          accentHex={accentHex}
          activeCloudLabel={activeCloudLabel}
          activeNeteasePlaylistId={activeNeteasePlaylistId}
          activePlaylist={activePlaylist}
          addSongToFavorites={addSongToFavorites}
          addSongToPlaylist={addSongToPlaylist}
          audioInputDevices={audioInputDevices}
          audioInputMode={audioInputMode}
          audioInputStatus={audioInputStatus}
          cloudProvider={cloudProvider}
          confirmPendingDelete={confirmPendingDelete}
          createPlaylistAndAddSong={createPlaylistAndAddSong}
          currentSongId={currentSongId}
          effectiveSearchLabel={effectiveSearchLabel}
          effectiveSearchProvider={effectiveSearchProvider}
          hasBothCloudLogins={hasBothCloudLogins}
          isLoadingNeteaseCloud={isLoadingNeteaseCloud}
          isSearching={isSearching}
          loadDailyRecommendations={loadDailyRecommendations}
          loadLikedSongs={loadLikedSongs}
          loadNeteasePlaylists={loadNeteasePlaylists}
          loadNeteasePlaylistSongs={loadNeteasePlaylistSongs}
          loadNeteaseSong={loadNeteaseSong}
          neteaseCloudPlaylists={neteaseCloudPlaylists}
          neteaseCloudSongs={neteaseCloudSongs}
          neteaseCloudStatus={neteaseCloudStatus}
          neteaseCloudTab={neteaseCloudTab}
          newPlaylistName={newPlaylistName}
          pendingDelete={pendingDelete}
          playlists={playlists}
          refreshAudioInputDevices={refreshAudioInputDevices}
          returnToPlayerInput={returnToPlayerInput}
          searchNetease={searchNetease}
          searchQuery={searchQuery}
          searchResults={searchResults}
          searchStatus={searchStatus}
          selectedAudioInputId={selectedAudioInputId}
          setActivePlaylistId={setActivePlaylistId}
          setNewPlaylistName={setNewPlaylistName}
          setPendingDelete={setPendingDelete}
          setSearchProvider={setSearchProvider}
          setSearchQuery={setSearchQuery}
          setSelectedAudioInputId={setSelectedAudioInputId}
          setShowAudioInputPanel={setShowAudioInputPanel}
          setShowNeteasePanel={setShowNeteasePanel}
          setShowPlaylistPanel={setShowPlaylistPanel}
          setShowSearchPanel={setShowSearchPanel}
          setSongToAdd={setSongToAdd}
          showAudioInputPanel={showAudioInputPanel}
          showNeteasePanel={showNeteasePanel}
          showPlaylistPanel={showPlaylistPanel}
          showSearchPanel={showSearchPanel}
          songToAdd={songToAdd}
          startMicrophoneInput={startMicrophoneInput}
          startSystemAudioInput={startSystemAudioInput}
        />

        <PlayerBar
          accentHex={accentHex}
          currentCover={currentCover}
          currentSong={currentSong}
          currentTime={currentTime}
          displaySettings={displaySettings}
          duration={duration}
          formatTime={formatTime}
          getCurrentQueue={getCurrentQueue}
          isBottomPanelOpen={isBottomPanelOpen}
          isPlaying={isPlaying}
          lastPointerUpTime={lastPointerUpTime}
          onThemeChange={onThemeChange}
          playFromQueue={playFromQueue}
          playMode={playMode}
          setCurrentTime={setCurrentTime}
          setDisplaySettings={setDisplaySettings}
          setIsBottomPanelOpen={setIsBottomPanelOpen}
          setPlayMode={setPlayMode}
          setVolume={setVolume}
          theme={theme}
          togglePlay={togglePlay}
          trackName={trackName}
          volume={volume}
        />
        {/* Clock Display */}
        <div style={{ pointerEvents: 'auto' }}>
          <ClockDisplay
            settings={displaySettings.clock}
            accentHex={accentHex}
          />
        </div>

        {trackName !== 'No track selected' && lyricsText && (
          <LyricsDisplay
            lrcText={lyricsText}
            currentTime={currentTime}
            isPlaying={isPlaying && displaySettings.showLyrics}
            accentHex={accentHex}
            lyricsSettings={{
              ...currentStyleConfig,
              style: lyricsSettings.style,
            }}
          />
        )}

        {showUpdatePrompt && availableUpdate && (
          <UpdatePromptModal
            accentHex={accentHex}
            update={availableUpdate}
            updateStatus={updateStatus}
            downloadJob={downloadJob}
            onDownload={startUpdateDownload}
            showReleaseFallback={showUpdateReleaseFallback}
            onOpenRelease={openUpdateRelease}
            onRemindLater={remindUpdateLater}
            onSkipVersion={skipThisUpdateVersion}
          />
        )}

        {/* Options Panel */}
        {showOptionsPanel && (
          <OptionsPanel
            onClose={() => setShowOptionsPanel(false)}
            accentHex={accentHex}
            neteaseCookie={neteaseCookie}
            setNeteaseCookie={setNeteaseCookie}
            onSaveCookie={saveNeteaseCookie}
            onClearCookie={clearNeteaseCookie}
            cookieStatus={cookieStatus}
            isNeteaseCookieValid={isNeteaseCookieValid}
            isSyncingNeteaseCookie={isSyncingNeteaseCookie}
            qqCookie={qqCookie}
            setQQCookie={setQQCookie}
            onSaveQQCookie={saveQQCookie}
            onClearQQCookie={clearQQCookie}
            qqCookieStatus={qqCookieStatus}
            isQQCookieValid={isQQCookieValid}
            isSyncingQQCookie={isSyncingQQCookie}
            desktopLoginStatus={desktopLoginStatus}
            onDesktopNeteaseLogin={startDesktopNeteaseLogin}
            onDesktopQQLogin={startDesktopQQLogin}
            updateStatus={updateStatus}
            isCheckingUpdate={isCheckingUpdate}
            onCheckUpdate={() => checkForUpdate({ manual: true })}
            theme={theme}
            customThemes={customThemes}
            activeCustomThemeId={activeCustomThemeId}
            themeRotation={themeRotation}
            groundEqSettings={groundEqSettings}
            presetTransferStatus={presetTransferStatus}
            setPresetTransferStatus={setPresetTransferStatus}
            onImportPresetPackage={applyPresetTransferPackage}
            onThemeChange={onThemeChange}
            onCustomThemesChange={onCustomThemesChange}
            onThemeRotationChange={onThemeRotationChange}
            onGroundEqSettingsChange={onGroundEqSettingsChange}
            playbackQualitySettings={playbackQualitySettings}
            onPlaybackQualitySettingsChange={setPlaybackQualitySettings}
            lyricsSettings={lyricsSettings}
            onLyricsSettingsChange={onLyricsSettingsChange}
            displaySettings={displaySettings}
            onDisplaySettingsChange={setDisplaySettings}
            globalSceneSettings={globalSceneSettings}
            onGlobalSceneSettingsChange={onGlobalSceneSettingsChange}
          />
        )}
      </div>
    </>
  );
}
