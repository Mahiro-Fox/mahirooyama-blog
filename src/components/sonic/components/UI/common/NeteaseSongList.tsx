/**
 * 云端歌曲列表。
 * 逐行展示歌曲（封面/曲名/歌手/专辑），支持点击播放与加入歌单，空列表时显示提示文案。
 */
import { Plus } from 'lucide-react';
import { t, useLanguage } from '../../../lib/i18n/i18n';
import type { NeteaseSong } from '../../../types';
import { colorWithAlpha } from '../shared/panelShared';
import { songIdentity } from '../shared/uiHelpers';
import { CoverArt } from './CoverArt';

/**
 * 云端歌曲列表（点击播放、右侧按钮收藏到歌单）。
 *
 * @param songs 要展示的歌曲数组
 * @param currentSongId 当前播放曲目的标识，用于高亮
 * @param queue 点击播放时一并传入的播放队列
 * @param onPlay 播放回调
 * @param onFavorite 收藏回调
 * @param emptyText 列表为空时的提示文案
 * @param accentHex 主题强调色
 */
export function NeteaseSongList({
  songs,
  currentSongId,
  queue,
  onPlay,
  onFavorite,
  emptyText,
  accentHex,
}: {
  songs: NeteaseSong[];
  currentSongId: number | string | null;
  queue: NeteaseSong[];
  onPlay: (song: NeteaseSong, queue?: NeteaseSong[]) => void;
  onFavorite: (song: NeteaseSong) => void;
  emptyText: string;
  accentHex: string;
}) {
  const lang = useLanguage();
  return (
    <div className="themed-scrollbar max-h-[44vh] overflow-y-auto">
      {songs.length > 0 ? (
        songs.map((song) => (
          <button
            key={songIdentity(song)}
            onClick={() => onPlay(song, queue)}
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
                {song.artist || t('ui.text.106', lang)} -{' '}
                {song.album || t('ui.text.107', lang)}
              </div>
            </div>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onFavorite(song);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onFavorite(song);
                }
              }}
              className="absolute top-1/2 right-5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-sm border text-white/55 transition-colors hover:text-white"
              style={{ borderColor: colorWithAlpha(accentHex, 0.16) }}
              title={t('ui.text.108', lang)}
            >
              <Plus size={15} />
            </span>
          </button>
        ))
      ) : (
        <div className="px-5 py-8 text-[12px] text-white/40">{emptyText}</div>
      )}
    </div>
  );
}
