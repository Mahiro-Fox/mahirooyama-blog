/**
 * 播放列表列（右侧栏左半部分）。
 * 分区展示本地歌单、网易云歌单（每日推荐/我喜欢的/自建歌单）与 QQ 音乐歌单，
 * 支持展开全部、置顶与切换选中项。同时导出 RightSidebarSelection 类型的来源。
 */
import { ChevronDown, ChevronUp, ListMusic, Pin } from 'lucide-react';
import React from 'react';
import { t, useLanguage } from '../../../lib/i18n/i18n';
import type { CloudPlaylistSummary, SavedPlaylist } from '../../../types';
import { colorWithAlpha } from '../shared/panelShared';
import {
  type CloudProvider,
  type RightSidebarSelection,
} from '../shared/uiTypes';

/**
 * 播放列表列：本地 / 网易云 / QQ 三个分区的歌单导航。
 *
 * @param activeRightSidebarSelection 当前选中的来源（本地、每日推荐、某歌单等）
 * @param setActiveRightSidebarSelection 切换选中项
 * @param playlists 本地歌单列表
 * @param fetchedNeteasePlaylists 已拉取的网易云歌单
 * @param fetchedQQPlaylists 已拉取的 QQ 音乐歌单
 * @param pinnedNeteasePlaylists 置顶的网易云歌单 id 列表
 * @param pinnedQQPlaylists 置顶的 QQ 歌单 id 列表
 * @param showAllNetease 网易云歌单是否展开全部
 * @param showAllQQ QQ 歌单是否展开全部
 * @param loadDailyRecommendations 加载网易云每日推荐
 * @param loadLikedSongs 加载“我喜欢的音乐”
 * @param loadNeteasePlaylistSongs 加载指定歌单的曲目
 */
export function PlaylistsColumn({
  accentHex,
  activeRightSidebarSelection,
  fetchedNeteasePlaylists,
  fetchedQQPlaylists,
  isNeteaseCookieValid,
  isQQCookieValid,
  loadDailyRecommendations,
  loadLikedSongs,
  loadNeteasePlaylistSongs,
  pinnedNeteasePlaylists,
  pinnedQQPlaylists,
  playlists,
  setActivePlaylistId,
  setActiveRightSidebarSelection,
  setPinnedNeteasePlaylists,
  setPinnedQQPlaylists,
  setShowAllNetease,
  setShowAllQQ,
  showAllNetease,
  showAllQQ,
  surfaceHex,
}: {
  accentHex: string;
  activeRightSidebarSelection: RightSidebarSelection;
  fetchedNeteasePlaylists: CloudPlaylistSummary[];
  fetchedQQPlaylists: CloudPlaylistSummary[];
  isNeteaseCookieValid: boolean;
  isQQCookieValid: boolean;
  loadDailyRecommendations: () => Promise<void>;
  loadLikedSongs: (provider?: CloudProvider) => Promise<void>;
  loadNeteasePlaylistSongs: (playlist: CloudPlaylistSummary) => Promise<void>;
  pinnedNeteasePlaylists: string[];
  pinnedQQPlaylists: string[];
  playlists: SavedPlaylist[];
  setActivePlaylistId: React.Dispatch<React.SetStateAction<string>>;
  setActiveRightSidebarSelection: React.Dispatch<
    React.SetStateAction<RightSidebarSelection>
  >;
  setPinnedNeteasePlaylists: React.Dispatch<React.SetStateAction<string[]>>;
  setPinnedQQPlaylists: React.Dispatch<React.SetStateAction<string[]>>;
  setShowAllNetease: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAllQQ: React.Dispatch<React.SetStateAction<boolean>>;
  showAllNetease: boolean;
  showAllQQ: boolean;
  surfaceHex: string;
}) {
  const lang = useLanguage();
  return (
    <>
      {/* Playlists Column */}
      <div
        className="flex h-full w-[200px] flex-col border-r"
        style={{ borderColor: colorWithAlpha(accentHex, 0.18) }}
      >
        <div className="shrink-0 p-5 text-[10px] tracking-[0.2em] text-white/50 uppercase">
          Playlists
        </div>
        <div className="themed-scrollbar flex-1 overflow-y-auto pb-5">
          {/* Local Playlists */}
          {playlists.length > 0 && (
            <div className="mb-4">
              <div
                className="sticky top-0 z-10 px-5 py-2 text-[10px] tracking-[0.2em] text-white/50 uppercase backdrop-blur-md"
                style={{
                  backgroundColor: colorWithAlpha(surfaceHex, 0.8),
                }}
              >
                Local
              </div>
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => {
                    setActivePlaylistId(playlist.id);
                    setActiveRightSidebarSelection({
                      type: 'local',
                      id: playlist.id,
                    });
                  }}
                  className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/5 ${activeRightSidebarSelection.type === 'local' && activeRightSidebarSelection.id === playlist.id ? 'bg-white/5' : ''}`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-white/10">
                    {playlist.songs[0]?.cover ? (
                      <img
                        src={playlist.songs[0].cover}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ListMusic size={14} className="text-white/40" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate text-[12px] ${activeRightSidebarSelection.type === 'local' && activeRightSidebarSelection.id === playlist.id ? 'text-white' : 'text-white/70'}`}
                    >
                      {playlist.name}
                    </div>
                    <div className="mt-0.5 text-[10px] text-white/40">
                      {playlist.songs.length}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* NetEase Playlists */}
          {isNeteaseCookieValid && (
            <div className="mb-4">
              <div
                className="sticky top-0 z-10 px-5 py-2 text-[10px] tracking-[0.2em] text-white/50 uppercase backdrop-blur-md"
                style={{
                  backgroundColor: colorWithAlpha(surfaceHex, 0.8),
                }}
              >
                NetEase Cloud
              </div>
              <button
                onClick={() => {
                  setActiveRightSidebarSelection({
                    type: 'netease_daily',
                  });
                  loadDailyRecommendations();
                }}
                className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/5 ${activeRightSidebarSelection.type === 'netease_daily' ? 'bg-white/5' : ''}`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-white/10 text-white/40">
                  <ListMusic size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-[12px] ${activeRightSidebarSelection.type === 'netease_daily' ? 'text-white' : 'text-white/70'}`}
                  >
                    {t('ui.text.74', lang)}
                  </div>
                </div>
              </button>
              <button
                onClick={() => {
                  setActiveRightSidebarSelection({
                    type: 'netease_liked',
                  });
                  loadLikedSongs('netease');
                }}
                className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/5 ${activeRightSidebarSelection.type === 'netease_liked' ? 'bg-white/5' : ''}`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-white/10 text-white/40">
                  <ListMusic size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-[12px] ${activeRightSidebarSelection.type === 'netease_liked' ? 'text-white' : 'text-white/70'}`}
                  >
                    {t('ui.text.75', lang)}
                  </div>
                </div>
              </button>
              {(() => {
                const sorted = [...fetchedNeteasePlaylists].sort((a, b) => {
                  const aPinned = pinnedNeteasePlaylists.includes(String(a.id));
                  const bPinned = pinnedNeteasePlaylists.includes(String(b.id));
                  if (aPinned && !bPinned) return -1;
                  if (!aPinned && bPinned) return 1;
                  return 0;
                });
                const displayCount = Math.max(5, pinnedNeteasePlaylists.length);
                const visiblePlaylists = showAllNetease
                  ? sorted
                  : sorted.slice(0, displayCount);
                const hasMore = sorted.length > displayCount;

                return (
                  <>
                    {visiblePlaylists.map((playlist) => {
                      const isPinned = pinnedNeteasePlaylists.includes(
                        String(playlist.id)
                      );
                      return (
                        <button
                          key={playlist.id}
                          onClick={() => {
                            setActiveRightSidebarSelection({
                              type: 'netease_playlist',
                              id: playlist.id,
                            });
                            loadNeteasePlaylistSongs(playlist);
                          }}
                          className={`group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/5 ${activeRightSidebarSelection.type === 'netease_playlist' && activeRightSidebarSelection.id === playlist.id ? 'bg-white/5' : ''}`}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-white/10">
                            {playlist.cover ? (
                              <img
                                src={playlist.cover}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ListMusic size={14} className="text-white/40" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className={`truncate text-[12px] ${activeRightSidebarSelection.type === 'netease_playlist' && activeRightSidebarSelection.id === playlist.id ? 'text-white' : 'text-white/70'}`}
                            >
                              {playlist.name}
                            </div>
                          </div>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isPinned) {
                                setPinnedNeteasePlaylists((prev) =>
                                  prev.filter(
                                    (id) => id !== String(playlist.id)
                                  )
                                );
                              } else {
                                setPinnedNeteasePlaylists((prev) => [
                                  ...prev,
                                  String(playlist.id),
                                ]);
                              }
                            }}
                            className={`shrink-0 rounded p-1 transition-colors hover:bg-white/10 ${isPinned ? 'text-cyan-400 opacity-100' : 'text-white/40 opacity-0 group-hover:opacity-100 hover:text-white'}`}
                            title={
                              isPinned
                                ? t('ui.text.76', lang)
                                : t('ui.text.77', lang)
                            }
                          >
                            <Pin
                              size={14}
                              className={isPinned ? 'fill-cyan-400/20' : ''}
                            />
                          </div>
                        </button>
                      );
                    })}
                    {hasMore && (
                      <button
                        onClick={() => setShowAllNetease(!showAllNetease)}
                        className="flex w-full items-center justify-center gap-2 px-5 py-3 text-[10px] tracking-[0.1em] text-white/40 uppercase transition-colors hover:bg-white/5 hover:text-white"
                      >
                        {showAllNetease ? (
                          <>
                            <ChevronUp size={14} /> {t('ui.text.78', lang)}
                          </>
                        ) : (
                          <>
                            <ChevronDown size={14} /> {t('ui.text.79', lang)}
                            {sorted.length})
                          </>
                        )}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* QQ Playlists */}
          {isQQCookieValid && (
            <div className="mb-4">
              <div
                className="sticky top-0 z-10 px-5 py-2 text-[10px] tracking-[0.2em] text-white/50 uppercase backdrop-blur-md"
                style={{
                  backgroundColor: colorWithAlpha(surfaceHex, 0.8),
                }}
              >
                QQ Music
              </div>
              <button
                onClick={() => {
                  setActiveRightSidebarSelection({ type: 'qq_liked' });
                  loadLikedSongs('qq');
                }}
                className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/5 ${activeRightSidebarSelection.type === 'qq_liked' ? 'bg-white/5' : ''}`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-white/10 text-white/40">
                  <ListMusic size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-[12px] ${activeRightSidebarSelection.type === 'qq_liked' ? 'text-white' : 'text-white/70'}`}
                  >
                    {t('ui.text.80', lang)}
                  </div>
                </div>
              </button>
              {(() => {
                const sorted = [...fetchedQQPlaylists].sort((a, b) => {
                  const aPinned = pinnedQQPlaylists.includes(String(a.id));
                  const bPinned = pinnedQQPlaylists.includes(String(b.id));
                  if (aPinned && !bPinned) return -1;
                  if (!aPinned && bPinned) return 1;
                  return 0;
                });
                const displayCount = Math.max(5, pinnedQQPlaylists.length);
                const visiblePlaylists = showAllQQ
                  ? sorted
                  : sorted.slice(0, displayCount);
                const hasMore = sorted.length > displayCount;

                return (
                  <>
                    {visiblePlaylists.map((playlist) => {
                      const isPinned = pinnedQQPlaylists.includes(
                        String(playlist.id)
                      );
                      return (
                        <button
                          key={playlist.id}
                          onClick={() => {
                            setActiveRightSidebarSelection({
                              type: 'qq_playlist',
                              id: playlist.id,
                            });
                            loadNeteasePlaylistSongs(playlist);
                          }}
                          className={`group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/5 ${activeRightSidebarSelection.type === 'qq_playlist' && activeRightSidebarSelection.id === playlist.id ? 'bg-white/5' : ''}`}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-white/10">
                            {playlist.cover ? (
                              <img
                                src={playlist.cover}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ListMusic size={14} className="text-white/40" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className={`truncate text-[12px] ${activeRightSidebarSelection.type === 'qq_playlist' && activeRightSidebarSelection.id === playlist.id ? 'text-white' : 'text-white/70'}`}
                            >
                              {playlist.name}
                            </div>
                          </div>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isPinned) {
                                setPinnedQQPlaylists((prev) =>
                                  prev.filter(
                                    (id) => id !== String(playlist.id)
                                  )
                                );
                              } else {
                                setPinnedQQPlaylists((prev) => [
                                  ...prev,
                                  String(playlist.id),
                                ]);
                              }
                            }}
                            className={`shrink-0 rounded p-1 transition-colors hover:bg-white/10 ${isPinned ? 'text-cyan-400 opacity-100' : 'text-white/40 opacity-0 group-hover:opacity-100 hover:text-white'}`}
                            title={
                              isPinned
                                ? t('ui.text.81', lang)
                                : t('ui.text.82', lang)
                            }
                          >
                            <Pin
                              size={14}
                              className={isPinned ? 'fill-cyan-400/20' : ''}
                            />
                          </div>
                        </button>
                      );
                    })}
                    {hasMore && (
                      <button
                        onClick={() => setShowAllQQ(!showAllQQ)}
                        className="flex w-full items-center justify-center gap-2 px-5 py-3 text-[10px] tracking-[0.1em] text-white/40 uppercase transition-colors hover:bg-white/5 hover:text-white"
                      >
                        {showAllQQ ? (
                          <>
                            <ChevronUp size={14} /> {t('ui.text.83', lang)}
                          </>
                        ) : (
                          <>
                            <ChevronDown size={14} /> {t('ui.text.84', lang)}
                            {sorted.length})
                          </>
                        )}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
