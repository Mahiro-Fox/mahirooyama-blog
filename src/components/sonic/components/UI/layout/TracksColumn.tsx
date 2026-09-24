/**
 * 曲目列（右侧栏右半部分）。
 * 根据当前选中的来源（本地歌单或云端歌单/推荐）展示对应曲目，支持点击播放与高亮当前曲目。
 */
import { ListMusic, Play } from 'lucide-react';
import { OptimizedImage } from '@/components/shared/optimized-image';
import type { NeteaseSong, SavedPlaylist } from '../../../types';
import { songIdentity } from '../shared/uiHelpers';
import { type RightSidebarSelection } from '../shared/uiTypes';

/**
 * 曲目列：展示当前选中来源下的曲目并支持播放。
 *
 * @param activePlaylist 当前选中的本地歌单（本地来源时使用）
 * @param activeRightSidebarSelection 当前来源选择，决定展示本地还是云端曲目
 * @param neteaseCloudSongs 云端曲目列表
 * @param currentSongId 当前播放曲目标识，用于高亮
 * @param loadNeteaseSong 播放指定云端曲目
 * @param formatTime 时长格式化函数
 */
export function TracksColumn({
  activePlaylist,
  activeRightSidebarSelection,
  currentSongId,
  formatTime,
  loadNeteaseSong,
  neteaseCloudSongs,
}: {
  activePlaylist: SavedPlaylist | undefined;
  activeRightSidebarSelection: RightSidebarSelection;
  currentSongId: number | string | null;
  formatTime: (time: number) => string;
  loadNeteaseSong: (song: NeteaseSong, queue?: NeteaseSong[]) => Promise<void>;
  neteaseCloudSongs: NeteaseSong[];
}) {
  return (
    <>
      {/* Tracks Column */}
      <div className="flex h-full flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between p-5">
          <div className="text-[10px] tracking-[0.2em] text-white/50 uppercase">
            Tracks
          </div>
          <div className="text-[10px] tracking-[0.2em] text-white/30 uppercase">
            {activeRightSidebarSelection.type === 'local'
              ? activePlaylist?.songs.length || 0
              : neteaseCloudSongs.length || 0}{' '}
            Tracks
          </div>
        </div>
        <div className="themed-scrollbar flex-1 overflow-y-auto pb-5">
          {(() => {
            const currentTracks =
              activeRightSidebarSelection.type === 'local'
                ? activePlaylist?.songs || []
                : neteaseCloudSongs;
            if (currentTracks.length === 0)
              return (
                <div className="px-5 py-8 text-[12px] text-white/40">
                  No songs in this playlist
                </div>
              );
            return currentTracks.map((song, index) => (
              <button
                key={songIdentity(song)}
                onClick={() => loadNeteaseSong(song, currentTracks)}
                className={`group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/5 ${currentSongId === songIdentity(song) ? 'bg-white/5' : ''}`}
              >
                <div className="w-4 shrink-0 text-center text-[10px] text-white/30 group-hover:hidden">
                  {(index + 1).toString().padStart(2, '0')}
                </div>
                <div className="hidden w-4 shrink-0 items-center justify-center text-center text-white group-hover:flex">
                  <Play size={10} />
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-white/10">
                  {song.cover ? (
                    <OptimizedImage
                      src={song.cover}
                      className="h-full w-full object-cover"
                      alt={`${song.name} album cover`}
                      unoptimized
                    />
                  ) : (
                    <ListMusic size={14} className="text-white/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-[12px] ${currentSongId === songIdentity(song) ? 'text-white' : 'text-white/80'}`}
                  >
                    {song.name}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-white/40">
                    {song.artist || 'Unknown'}
                  </div>
                </div>
                <div className="shrink-0 text-[10px] text-white/30">
                  {formatTime(song.duration ? song.duration / 1000 : 0)}
                </div>
              </button>
            ));
          })()}
        </div>
      </div>
    </>
  );
}
