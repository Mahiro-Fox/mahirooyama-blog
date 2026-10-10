/**
 * 右侧导航栏（Sidebar Right）。
 * 悬浮在画面右缘，内含折叠触发按钮与面板；
 * 面板横向分为「播放列表列」与「曲目列」，用于浏览本地/云端歌单与曲目。
 * 与左侧导航栏（SidebarLeft）保持结构一致：折叠按钮与面板同属一个组件。
 */
import { ChevronLeft } from 'lucide-react';
import React from 'react';
import type {
  CloudPlaylistSummary,
  NeteaseSong,
  SavedPlaylist,
} from '../../../types';
import { colorWithAlpha, themedPanelStyle } from '../shared/panelShared';
import {
  type CloudProvider,
  type RightSidebarSelection,
} from '../shared/uiTypes';
import { PlaylistsColumn } from './PlaylistsColumn';
import { TracksColumn } from './TracksColumn';

/**
 * 右侧导航栏：折叠触发按钮 + 播放列表列/曲目列。
 *
 * @param isRightSidebarOpen 右侧栏当前是否展开
 * @param setIsRightSidebarOpen 设置右侧栏展开状态
 * @param lastPointerUpTime 上次鼠标抬起时间戳，用于抑制拖拽后的误触发
 * @param displaySettings 显示设置，决定折叠按钮显隐
 */
export function SidebarRight({
  accentHex,
  activePlaylist,
  activeRightSidebarSelection,
  displaySettings,
  fetchedNeteasePlaylists,
  fetchedQQPlaylists,
  formatTime,
  isLightSurface,
  isNeteaseCookieValid,
  isQQCookieValid,
  isRightSidebarOpen,
  lastPointerUpTime,
  loadDailyRecommendations,
  loadLikedSongs,
  loadNeteasePlaylistSongs,
  loadNeteaseSong,
  currentSongId,
  neteaseCloudSongs,
  pinnedNeteasePlaylists,
  pinnedQQPlaylists,
  playlists,
  readableAccent,
  setActivePlaylistId,
  setActiveRightSidebarSelection,
  setPinnedNeteasePlaylists,
  setPinnedQQPlaylists,
  setIsRightSidebarOpen,
  setShowAllNetease,
  setShowAllQQ,
  showAllNetease,
  showAllQQ,
  sideNavActiveColor,
  surfaceHex,
}: {
  accentHex: string;
  activePlaylist: SavedPlaylist | undefined;
  activeRightSidebarSelection: RightSidebarSelection;
  displaySettings: import('../../../lib/settings/displaySettings').DisplaySettings;
  fetchedNeteasePlaylists: CloudPlaylistSummary[];
  fetchedQQPlaylists: CloudPlaylistSummary[];
  formatTime: (time: number) => string;
  isLightSurface: boolean;
  isNeteaseCookieValid: boolean;
  isQQCookieValid: boolean;
  isRightSidebarOpen: boolean;
  lastPointerUpTime: React.MutableRefObject<number>;
  loadDailyRecommendations: () => Promise<void>;
  loadLikedSongs: (provider?: CloudProvider) => Promise<void>;
  loadNeteasePlaylistSongs: (playlist: CloudPlaylistSummary) => Promise<void>;
  loadNeteaseSong: (song: NeteaseSong, queue?: NeteaseSong[]) => Promise<void>;
  currentSongId: number | string | null;
  neteaseCloudSongs: NeteaseSong[];
  pinnedNeteasePlaylists: string[];
  pinnedQQPlaylists: string[];
  playlists: SavedPlaylist[];
  readableAccent: string;
  setActivePlaylistId: React.Dispatch<React.SetStateAction<string>>;
  setActiveRightSidebarSelection: React.Dispatch<
    React.SetStateAction<RightSidebarSelection>
  >;
  setPinnedNeteasePlaylists: React.Dispatch<React.SetStateAction<string[]>>;
  setPinnedQQPlaylists: React.Dispatch<React.SetStateAction<string[]>>;
  setIsRightSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAllNetease: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAllQQ: React.Dispatch<React.SetStateAction<boolean>>;
  showAllNetease: boolean;
  showAllQQ: boolean;
  sideNavActiveColor: string;
  surfaceHex: string;
}) {
  return (
    <>
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
          className={`side-nav-panel-right pointer-events-auto absolute top-0 right-0 z-[61] flex h-full w-full transition-transform duration-300 ${isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
          style={{
            ...themedPanelStyle(accentHex, isLightSurface ? 0.82 : 0.7),
            borderLeft: `1px solid ${colorWithAlpha(accentHex, isLightSurface ? 0.26 : 0.18)}`,
            boxShadow: `-16px 0 50px rgba(0,0,0,${isLightSurface ? 0.18 : 0.2})`,
          }}
        >
          <div className="flex h-full w-full">
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
    </>
  );
}
