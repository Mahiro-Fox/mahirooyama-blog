/**
 * 浮层面板集合。
 * 把搜索面板、云音乐面板（网易云/QQ）、歌单面板、删除确认框、音频输入面板等
 * 若干相互独立的浮层集中渲染，各自按开关状态条件显示。
 * 因涉及的状态较多，此处统一以 props 传入（详见组件签名）。
 */
import { ListMusic, Mic, Plus, Search, Trash2, Volume2 } from 'lucide-react';
import React from 'react';
import {
  type AudioInputDevice,
  type AudioInputMode,
} from '../../../lib/audio/audioInput';
import { t, useLanguage } from '../../../lib/i18n/i18n';
import { type SearchProvider } from '../../../lib/storage/uiStorage';
import type {
  CloudPlaylistSummary,
  NeteaseSong,
  SavedPlaylist,
} from '../../../types';
import { CoverArt } from '../common/CoverArt';
import { NeteaseSongList } from '../common/NeteaseSongList';
import {
  activeControlStyle,
  colorWithAlpha,
  primaryGhostStyle,
  themedPanelStyle,
} from '../shared/panelShared';
import { songIdentity } from '../shared/uiHelpers';
import {
  type CloudProvider,
  type NeteaseCloudTab,
  type PendingDelete,
} from '../shared/uiTypes';

/**
 * 渲染全部悬浮面板：音乐搜索、云音乐（网易云/QQ）、本地歌单、音频输入与删除确认。
 * 每个面板由对应的 show* 开关控制显隐，所需状态与回调均通过 props 传入。
 */
export function FloatingPanels({
  accentHex,
  activeCloudLabel,
  activeNeteasePlaylistId,
  activePlaylist,
  addSongToFavorites,
  addSongToPlaylist,
  audioInputDevices,
  audioInputMode,
  audioInputStatus,
  cloudProvider,
  confirmPendingDelete,
  createPlaylistAndAddSong,
  currentSongId,
  effectiveSearchLabel,
  effectiveSearchProvider,
  hasBothCloudLogins,
  isLoadingNeteaseCloud,
  isSearching,
  loadDailyRecommendations,
  loadLikedSongs,
  loadNeteasePlaylists,
  loadNeteasePlaylistSongs,
  loadNeteaseSong,
  neteaseCloudPlaylists,
  neteaseCloudSongs,
  neteaseCloudStatus,
  neteaseCloudTab,
  newPlaylistName,
  pendingDelete,
  playlists,
  refreshAudioInputDevices,
  returnToPlayerInput,
  searchNetease,
  searchQuery,
  searchResults,
  searchStatus,
  selectedAudioInputId,
  setActivePlaylistId,
  setNewPlaylistName,
  setPendingDelete,
  setSearchProvider,
  setSearchQuery,
  setSelectedAudioInputId,
  setShowAudioInputPanel,
  setShowNeteasePanel,
  setShowPlaylistPanel,
  setShowSearchPanel,
  setSongToAdd,
  showAudioInputPanel,
  showNeteasePanel,
  showPlaylistPanel,
  showSearchPanel,
  songToAdd,
  startMicrophoneInput,
  startSystemAudioInput,
}: {
  accentHex: string;
  activeCloudLabel: string;
  activeNeteasePlaylistId: number | string | null;
  activePlaylist: SavedPlaylist | undefined;
  addSongToFavorites: (song: NeteaseSong) => void;
  addSongToPlaylist: (playlistId: string, song: NeteaseSong) => void;
  audioInputDevices: AudioInputDevice[];
  audioInputMode: AudioInputMode;
  audioInputStatus: string;
  cloudProvider: CloudProvider;
  confirmPendingDelete: () => void;
  createPlaylistAndAddSong: () => void;
  currentSongId: number | string | null;
  effectiveSearchLabel: string;
  effectiveSearchProvider: SearchProvider;
  hasBothCloudLogins: boolean;
  isLoadingNeteaseCloud: boolean;
  isSearching: boolean;
  loadDailyRecommendations: () => Promise<void>;
  loadLikedSongs: (provider?: CloudProvider) => Promise<void>;
  loadNeteasePlaylists: (provider?: CloudProvider) => Promise<void>;
  loadNeteasePlaylistSongs: (playlist: CloudPlaylistSummary) => Promise<void>;
  loadNeteaseSong: (song: NeteaseSong, queue?: NeteaseSong[]) => Promise<void>;
  neteaseCloudPlaylists: CloudPlaylistSummary[];
  neteaseCloudSongs: NeteaseSong[];
  neteaseCloudStatus: string;
  neteaseCloudTab: NeteaseCloudTab;
  newPlaylistName: string;
  pendingDelete: PendingDelete | null;
  playlists: SavedPlaylist[];
  refreshAudioInputDevices: () => Promise<void>;
  returnToPlayerInput: () => void;
  searchNetease: () => Promise<void>;
  searchQuery: string;
  searchResults: NeteaseSong[];
  searchStatus: string;
  selectedAudioInputId: string;
  setActivePlaylistId: React.Dispatch<React.SetStateAction<string>>;
  setNewPlaylistName: React.Dispatch<React.SetStateAction<string>>;
  setPendingDelete: React.Dispatch<React.SetStateAction<PendingDelete | null>>;
  setSearchProvider: (provider: SearchProvider) => void;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setSelectedAudioInputId: React.Dispatch<React.SetStateAction<string>>;
  setShowAudioInputPanel: React.Dispatch<React.SetStateAction<boolean>>;
  setShowNeteasePanel: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPlaylistPanel: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSearchPanel: React.Dispatch<React.SetStateAction<boolean>>;
  setSongToAdd: React.Dispatch<React.SetStateAction<NeteaseSong | null>>;
  showAudioInputPanel: boolean;
  showNeteasePanel: boolean;
  showPlaylistPanel: boolean;
  showSearchPanel: boolean;
  songToAdd: NeteaseSong | null;
  startMicrophoneInput: (deviceId?: string) => Promise<void>;
  startSystemAudioInput: () => Promise<void>;
}) {
  const lang = useLanguage();
  return (
    <>
      {/* Player Panel */}
      {showSearchPanel && (
        <div
          className="pointer-events-auto absolute top-[40px] left-[100px] z-50 max-h-[70vh] w-[360px] overflow-hidden rounded-sm border backdrop-blur-[20px]"
          style={themedPanelStyle(accentHex, 0.82)}
        >
          <div
            className="border-b p-5"
            style={{ borderColor: colorWithAlpha(accentHex, 0.18) }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[12px] tracking-[0.2em] text-white/70 uppercase">
                Music Search
              </div>
              <button
                onClick={() => setShowSearchPanel(false)}
                className="text-[10px] tracking-[0.15em] text-white/40 uppercase hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-[11px] text-white/38">
                {t('ui.text.87', lang)}
                {effectiveSearchLabel}
              </div>
              {hasBothCloudLogins && (
                <div
                  className="grid grid-cols-2 rounded-sm border bg-white/[0.025] p-0.5"
                  style={{ borderColor: colorWithAlpha(accentHex, 0.18) }}
                >
                  {[
                    { id: 'netease' as const, label: t('ui.text.88', lang) },
                    { id: 'qq' as const, label: t('ui.text.89', lang) },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSearchProvider(item.id)}
                      className={`px-3 py-1.5 text-[10px] tracking-[0.12em] transition-colors ${effectiveSearchProvider === item.id ? 'border border-transparent' : 'text-white/45 hover:text-white'}`}
                      style={
                        effectiveSearchProvider === item.id
                          ? activeControlStyle(accentHex)
                          : undefined
                      }
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                searchNetease();
              }}
            >
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Song or artist"
                className="min-w-0 flex-1 rounded-sm border bg-white/[0.035] px-3 py-2 text-[12px] text-white outline-none focus:border-white/30"
                style={{ borderColor: colorWithAlpha(accentHex, 0.16) }}
              />
              <button
                type="submit"
                disabled={isSearching}
                className="rounded-sm border px-3 py-2 text-[10px] tracking-[0.15em] uppercase disabled:opacity-50"
                style={primaryGhostStyle(accentHex)}
              >
                <Search size={14} />
              </button>
            </form>
            {searchStatus && (
              <div className="mt-3 text-[11px] text-white/45">
                {searchStatus}
              </div>
            )}
          </div>
          <div className="themed-scrollbar max-h-[48vh] overflow-y-auto">
            {searchResults.map((song) => (
              <button
                key={songIdentity(song)}
                onClick={() => loadNeteaseSong(song, searchResults)}
                className="relative flex w-full items-center gap-3 border-b border-white/5 px-5 py-4 pr-16 text-left transition-colors hover:bg-white/5"
              >
                <CoverArt
                  src={song.cover}
                  title={song.name}
                  className="h-10 w-10"
                  iconSize={15}
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-[13px] ${currentSongId === songIdentity(song) ? 'text-white' : 'text-white/80'}`}
                  >
                    {song.name}
                  </div>
                  <div className="mt-1 truncate text-[11px] text-white/45">
                    {song.provider === 'qq'
                      ? t('ui.text.90', lang)
                      : t('ui.text.91', lang)}{' '}
                    · {song.artist || 'Unknown artist'} -{' '}
                    {song.album || 'Unknown album'}
                  </div>
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSongToAdd(song);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      setSongToAdd(song);
                    }
                  }}
                  className="absolute top-1/2 right-5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-sm border text-white/55 transition-colors hover:text-white"
                  style={{ borderColor: colorWithAlpha(accentHex, 0.16) }}
                  title="Add to playlist"
                >
                  <Plus size={15} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {songToAdd && (
        <div
          className="pointer-events-auto absolute top-[120px] left-[480px] z-[70] w-[280px] overflow-hidden rounded-sm border backdrop-blur-[20px]"
          style={themedPanelStyle(accentHex, 0.88)}
        >
          <div
            className="border-b p-5"
            style={{ borderColor: colorWithAlpha(accentHex, 0.18) }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 text-[10px] tracking-[0.18em] text-white/45 uppercase">
                  Add To Playlist
                </div>
                <div
                  className="truncate text-[13px] text-white"
                  title={songToAdd.name}
                >
                  {songToAdd.name}
                </div>
              </div>
              <button
                onClick={() => setSongToAdd(null)}
                className="text-[10px] tracking-[0.15em] text-white/40 uppercase hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
          <div
            className="border-b p-3"
            style={{ borderColor: colorWithAlpha(accentHex, 0.18) }}
          >
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => addSongToPlaylist(playlist.id, songToAdd)}
                className="flex w-full items-center justify-between gap-3 rounded-sm px-3 py-3 text-left transition-colors hover:bg-white/5"
              >
                <span className="min-w-0 truncate text-[12px] text-white">
                  {playlist.name}
                </span>
                <span className="text-[10px] text-white/35">
                  {playlist.songs.length}
                </span>
              </button>
            ))}
          </div>
          <form
            className="flex gap-2 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              createPlaylistAndAddSong();
            }}
          >
            <input
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="New playlist"
              className="min-w-0 flex-1 rounded-sm border bg-white/[0.035] px-3 py-2 text-[12px] text-white outline-none focus:border-white/30"
              style={{ borderColor: colorWithAlpha(accentHex, 0.16) }}
            />
            <button
              type="submit"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm border disabled:opacity-50"
              style={primaryGhostStyle(accentHex)}
              disabled={!newPlaylistName.trim()}
              title="Create playlist"
            >
              <Plus size={15} />
            </button>
          </form>
        </div>
      )}

      {showPlaylistPanel && (
        <div
          className="pointer-events-auto absolute top-[40px] left-[100px] z-[65] max-h-[74vh] w-[420px] overflow-hidden rounded-sm border backdrop-blur-[20px]"
          style={themedPanelStyle(accentHex, 0.84)}
        >
          <div
            className="border-b p-5"
            style={{ borderColor: colorWithAlpha(accentHex, 0.18) }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[12px] tracking-[0.2em] text-white/70 uppercase">
                <ListMusic size={15} />
                Playlists
              </div>
              <button
                onClick={() => setShowPlaylistPanel(false)}
                className="text-[10px] tracking-[0.15em] text-white/40 uppercase hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="themed-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => setActivePlaylistId(playlist.id)}
                    className={`flex-shrink-0 rounded-sm border px-3 py-2 text-[10px] tracking-[0.12em] uppercase transition-colors ${activePlaylist?.id === playlist.id ? '' : 'border-white/10 text-white/45 hover:text-white'}`}
                    style={
                      activePlaylist?.id === playlist.id
                        ? activeControlStyle(accentHex)
                        : undefined
                    }
                  >
                    {playlist.name}
                  </button>
                ))}
              </div>
              <button
                onClick={() =>
                  activePlaylist &&
                  setPendingDelete({
                    type: 'playlist',
                    playlistId: activePlaylist.id,
                    label: activePlaylist.name,
                  })
                }
                disabled={!activePlaylist || playlists.length <= 1}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm border border-white/10 text-white/45 hover:text-[#ef4444] disabled:opacity-20 disabled:hover:text-white/45"
                title="Delete playlist"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div className="themed-scrollbar max-h-[52vh] overflow-y-auto">
            {activePlaylist && activePlaylist.songs.length > 0 ? (
              activePlaylist.songs.map((song) => (
                <button
                  key={songIdentity(song)}
                  onClick={() => loadNeteaseSong(song, activePlaylist.songs)}
                  className="relative flex w-full items-center gap-3 border-b border-white/5 px-5 py-4 pr-16 text-left transition-colors hover:bg-white/5"
                >
                  <CoverArt
                    src={song.cover}
                    title={song.name}
                    className="h-10 w-10"
                    iconSize={15}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] text-white">
                      {song.name}
                    </div>
                    <div className="mt-1 truncate text-[11px] text-white/45">
                      {song.artist || 'Unknown artist'} -{' '}
                      {song.album || 'Unknown album'}
                    </div>
                  </div>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete({
                        type: 'song',
                        playlistId: activePlaylist.id,
                        songId: songIdentity(song),
                        label: song.name,
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        setPendingDelete({
                          type: 'song',
                          playlistId: activePlaylist.id,
                          songId: songIdentity(song),
                          label: song.name,
                        });
                      }
                    }}
                    className="absolute top-1/2 right-5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-sm border border-white/10 text-white/45 transition-colors hover:text-[#ef4444]"
                    title="Remove from playlist"
                  >
                    <Trash2 size={14} />
                  </span>
                </button>
              ))
            ) : (
              <div className="px-5 py-8 text-[12px] text-white/40">
                No songs in this playlist yet
              </div>
            )}
          </div>
        </div>
      )}

      {showAudioInputPanel && (
        <div
          className="pointer-events-auto absolute top-[40px] left-[100px] z-[67] w-[420px] overflow-hidden rounded-sm border backdrop-blur-[20px]"
          style={themedPanelStyle(accentHex, 0.86)}
        >
          <div
            className="border-b p-5"
            style={{ borderColor: colorWithAlpha(accentHex, 0.18) }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-[12px] tracking-[0.2em] text-white/70 uppercase">
                <Volume2 size={15} />
                Audio Input
              </div>
              <button
                onClick={() => setShowAudioInputPanel(false)}
                className="text-[10px] tracking-[0.15em] text-white/40 uppercase hover:text-white"
              >
                Close
              </button>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={startSystemAudioInput}
                className={`min-h-[74px] rounded-sm border px-3 py-3 text-left transition-colors ${audioInputMode === 'system' ? '' : 'border-white/10 text-white/55 hover:bg-white/5 hover:text-white'}`}
                style={
                  audioInputMode === 'system'
                    ? activeControlStyle(accentHex)
                    : undefined
                }
              >
                <Volume2 size={16} className="mb-2" />
                <div className="text-[11px] tracking-[0.14em] uppercase">
                  System Audio
                </div>
                <div className="mt-1 text-[10px] opacity-55">
                  Windows loopback
                </div>
              </button>
              <button
                onClick={() => startMicrophoneInput()}
                className={`min-h-[74px] rounded-sm border px-3 py-3 text-left transition-colors ${audioInputMode === 'microphone' ? '' : 'border-white/10 text-white/55 hover:bg-white/5 hover:text-white'}`}
                style={
                  audioInputMode === 'microphone'
                    ? activeControlStyle(accentHex)
                    : undefined
                }
              >
                <Mic size={16} className="mb-2" />
                <div className="text-[11px] tracking-[0.14em] uppercase">
                  Microphone
                </div>
                <div className="mt-1 text-[10px] opacity-55">Input devices</div>
              </button>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="text-[10px] tracking-[0.18em] text-white/45 uppercase">
                  Microphone Device
                </label>
                <button
                  onClick={refreshAudioInputDevices}
                  className="text-[10px] tracking-[0.14em] text-white/40 uppercase hover:text-white"
                >
                  Refresh
                </button>
              </div>
              <select
                value={selectedAudioInputId}
                onChange={(event) =>
                  setSelectedAudioInputId(event.target.value)
                }
                className="w-full rounded-sm border bg-black/30 px-3 py-2 text-[12px] text-white outline-none"
                style={{ borderColor: colorWithAlpha(accentHex, 0.2) }}
              >
                {audioInputDevices.length > 0 ? (
                  audioInputDevices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.label}
                    </option>
                  ))
                ) : (
                  <option value="">
                    Allow microphone permission to show devices
                  </option>
                )}
              </select>
            </div>

            {audioInputMode !== 'player' && (
              <button
                onClick={returnToPlayerInput}
                className="w-full rounded-sm border px-3 py-2 text-[10px] tracking-[0.14em] text-white/55 uppercase hover:bg-white/5 hover:text-white"
                style={{ borderColor: colorWithAlpha(accentHex, 0.16) }}
              >
                Stop Input
              </button>
            )}

            {audioInputStatus && (
              <div
                className="rounded-sm border px-3 py-2 text-[11px] leading-relaxed text-white/55"
                style={{ borderColor: colorWithAlpha(accentHex, 0.14) }}
              >
                {audioInputStatus}
              </div>
            )}
          </div>
        </div>
      )}

      {showNeteasePanel && (
        <div
          className="pointer-events-auto absolute top-[40px] left-[100px] z-[66] max-h-[76vh] w-[460px] overflow-hidden rounded-sm border backdrop-blur-[20px]"
          style={themedPanelStyle(accentHex, 0.86)}
        >
          <div
            className="border-b p-5"
            style={{ borderColor: colorWithAlpha(accentHex, 0.18) }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[12px] tracking-[0.2em] text-white/70 uppercase">
                {activeCloudLabel}
              </div>
              <button
                onClick={() => setShowNeteasePanel(false)}
                className="text-[10px] tracking-[0.15em] text-white/40 uppercase hover:text-white"
              >
                {t('ui.text.92', lang)}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => loadLikedSongs()}
                className={`rounded-sm border px-3 py-2 text-[10px] tracking-[0.12em] uppercase transition-colors ${neteaseCloudTab === 'liked' ? '' : 'border-white/10 text-white/45 hover:text-white'}`}
                style={
                  neteaseCloudTab === 'liked'
                    ? activeControlStyle(accentHex)
                    : undefined
                }
              >
                {t('ui.text.93', lang)}
              </button>
              <button
                onClick={() => loadNeteasePlaylists()}
                className={`rounded-sm border px-3 py-2 text-[10px] tracking-[0.12em] uppercase transition-colors ${neteaseCloudTab === 'playlists' ? '' : 'border-white/10 text-white/45 hover:text-white'}`}
                style={
                  neteaseCloudTab === 'playlists'
                    ? activeControlStyle(accentHex)
                    : undefined
                }
              >
                {t('ui.text.94', lang)}
              </button>
              {cloudProvider === 'netease' && (
                <button
                  onClick={() => loadDailyRecommendations()}
                  className={`rounded-sm border px-3 py-2 text-[10px] tracking-[0.12em] uppercase transition-colors ${neteaseCloudTab === 'daily' ? '' : 'border-white/10 text-white/45 hover:text-white'}`}
                  style={
                    neteaseCloudTab === 'daily'
                      ? activeControlStyle(accentHex)
                      : undefined
                  }
                >
                  {t('ui.text.95', lang)}
                </button>
              )}
            </div>
          </div>

          {neteaseCloudTab === 'playlists' && (
            <div
              className="themed-scrollbar max-h-[140px] overflow-y-auto border-b p-3"
              style={{ borderColor: colorWithAlpha(accentHex, 0.18) }}
            >
              {neteaseCloudPlaylists.length > 0 ? (
                neteaseCloudPlaylists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => loadNeteasePlaylistSongs(playlist)}
                    className={`flex w-full items-center justify-between gap-3 rounded-sm px-3 py-3 text-left transition-colors hover:bg-white/5 ${activeNeteasePlaylistId === playlist.id ? 'bg-white/5' : ''}`}
                  >
                    <span className="min-w-0 truncate text-[12px] text-white">
                      {playlist.name}
                    </span>
                    <span className="text-[10px] text-white/35">
                      {playlist.trackCount}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-[12px] text-white/40">
                  {isLoadingNeteaseCloud
                    ? t('ui.text.96', lang)
                    : `点击“歌单”加载你的${activeCloudLabel}歌单`}
                </div>
              )}
            </div>
          )}

          {neteaseCloudStatus && (
            <div className="border-b border-white/5 px-5 py-3 text-[11px] text-white/45">
              {neteaseCloudStatus}
            </div>
          )}
          <NeteaseSongList
            songs={neteaseCloudSongs}
            currentSongId={currentSongId}
            queue={neteaseCloudSongs}
            onPlay={loadNeteaseSong}
            onFavorite={addSongToFavorites}
            emptyText={
              isLoadingNeteaseCloud
                ? t('ui.text.97', lang)
                : t('ui.text.98', lang)
            }
            accentHex={accentHex}
          />
        </div>
      )}

      {pendingDelete && (
        <div
          className="pointer-events-auto absolute inset-0 z-[120] flex items-center justify-center backdrop-blur-sm"
          style={{ background: colorWithAlpha(accentHex, 0.12) }}
        >
          <div
            className="w-[320px] rounded-sm border p-5"
            style={themedPanelStyle(accentHex, 0.9)}
          >
            <div className="mb-3 text-[12px] tracking-[0.2em] text-white/70 uppercase">
              Confirm Delete
            </div>
            <div className="mb-5 text-[13px] leading-relaxed text-white/80">
              Delete {pendingDelete.type === 'playlist' ? 'playlist' : 'song'}{' '}
              <span className="text-white">{pendingDelete.label}</span>?
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="rounded-sm border border-white/10 px-3 py-2 text-[10px] tracking-[0.15em] text-white/45 uppercase hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmPendingDelete}
                className="rounded-sm border border-[#ef4444]/40 px-3 py-2 text-[10px] tracking-[0.15em] text-[#ef4444] uppercase hover:bg-[#ef4444]/15"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
