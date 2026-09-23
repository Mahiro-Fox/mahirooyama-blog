/**
 * 后端与云音乐代理接口封装。
 * 统一处理带 Cookie 的请求、响应解包与错误提示，覆盖云端歌单读写、歌曲搜索、歌词/播放地址获取与登出等。
 */
import type { CloudSong } from '@/actions/sonic/cloudmusic-actions';
import {
  neteaseDailyAction,
  neteaseLyricAction,
  neteasePlayableAction,
  neteasePlaylistAction,
  neteasePlaylistsAction,
  neteaseSearchAction,
  qqLyricAction,
  qqPlaylistTracksAction,
  qqSearchAction,
  qqSongUrlAction,
  qqUserPlaylistsAction,
  saveCloudCookie,
} from '@/actions/sonic/cloudmusic-actions';
import type {
  CloudPlaylistSummary as NeteasePlaylistSummary,
  NeteaseSong,
  SavedPlaylist,
} from '../../types';
import type { PlaybackQualitySettings } from '../settings/playbackQuality';
import { readSavedPlaylists, writeSavedPlaylists } from '../storage/uiStorage';

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data: T;
}

export interface SongListPayload {
  songs?: NeteaseSong[];
  playlists?: NeteasePlaylistSummary[];
  status?: string;
  fallback?: boolean;
  rawCount?: number;
  loadedCount?: number;
  totalCount?: number;
  rawTrackCount?: number;
  playlist?: { trackCount?: number };
  error?: string;
}

function asApiResponse<T>(data: T): ApiResponse<T> {
  return { ok: true, status: 200, data };
}

function failedResponse<T>(data: T): ApiResponse<T> {
  return { ok: false, status: 500, data };
}

function toSongList(songList: CloudSong[]): NeteaseSong[] {
  return songList.map((song) => ({
    provider: (song.provider as NeteaseSong['provider']) || 'netease',
    id: song.id,
    qqId: song.qqId,
    mid: song.mid,
    songmid: song.songmid,
    mediaMid: song.mediaMid,
    cover: song.cover,
    name: song.name,
    artist: song.artist,
    album: song.album,
    duration: song.duration,
    fee: song.fee ?? 0,
  }));
}

function toPlaylistSummary(lists: unknown[]): NeteasePlaylistSummary[] {
  return lists.map((list) => {
    const l = (list ?? {}) as Record<string, unknown>;
    return {
      provider: (l.provider as NeteasePlaylistSummary['provider']) || 'netease',
      id: l.id as NeteasePlaylistSummary['id'],
      name: (l.name as string) ?? '',
      trackCount: Number(l.trackCount) || 0,
      loadedCount: l.loadedCount as NeteasePlaylistSummary['loadedCount'],
      cover: l.cover as NeteasePlaylistSummary['cover'],
      creator: l.creator as NeteasePlaylistSummary['creator'],
      isFavorite: Boolean(l.isFavorite),
    };
  });
}

function getQueryParam(url: string, key: string): string {
  const idx = url.indexOf('?');
  if (idx < 0) return '';
  const params = new URLSearchParams(url.slice(idx + 1));
  return params.get(key) || '';
}

// ── 云播放列表 / 歌曲 JSON 查询：解析 URL 后转发到对应 server action ──
export async function loadCloudPayload<T = SongListPayload>(
  url: string,
  provider: string,
  _cookie?: string
): Promise<ApiResponse<T>> {
  const path = url.split('?')[0];
  const id = getQueryParam(url, 'id');

  if (
    path.endsWith('/netease/playlists') ||
    (provider === 'netease' && url.includes('/netease/playlists'))
  ) {
    const res = await neteasePlaylistsAction();
    return res.ok
      ? asApiResponse({
          playlists: toPlaylistSummary(res.playlists),
        } as unknown as T)
      : failedResponse<T>({ error: res.errors } as unknown as T);
  }
  if (
    path.endsWith('/qq/user/playlists') ||
    (provider === 'qq' && url.includes('/qq/user/playlists'))
  ) {
    const res = await qqUserPlaylistsAction();
    return res.ok
      ? asApiResponse({
          playlists: toPlaylistSummary(res.playlists),
        } as unknown as T)
      : failedResponse<T>({ error: res.errors } as unknown as T);
  }
  if (path.includes('/netease/daily-recommend')) {
    const res = await neteaseDailyAction(50);
    return res.ok
      ? asApiResponse({ songs: toSongList(res.songs) } as unknown as T)
      : failedResponse<T>({ error: res.errors } as unknown as T);
  }
  if (path.includes('/netease/liked')) {
    // 无独立「喜欢」action，回退到每日推荐
    const res = await neteaseDailyAction(50);
    return res.ok
      ? asApiResponse({ songs: toSongList(res.songs) } as unknown as T)
      : failedResponse<T>({ error: res.errors } as unknown as T);
  }
  if (path.includes('/qq/playlist/tracks') && id) {
    const res = await qqPlaylistTracksAction(id, 100);
    return res.ok
      ? asApiResponse({
          songs: toSongList(res.songs),
          totalCount: res.totalCount,
          playlist: res.playlist,
        } as unknown as T)
      : failedResponse<T>({ error: res.errors } as unknown as T);
  }
  if (path.includes('/netease/playlist') && id) {
    const res = await neteasePlaylistAction(id, 100);
    return res.ok
      ? asApiResponse({
          songs: toSongList(res.songs),
          totalCount: res.totalCount,
        } as unknown as T)
      : failedResponse<T>({ error: res.errors } as unknown as T);
  }
  return failedResponse<T>({
    error: `Unknown cloud endpoint: ${url}`,
  } as unknown as T);
}

// ── 本地歌单持久化（浏览器 localStorage），替代 /api/playlists ──
export async function loadServerPlaylists(): Promise<
  ApiResponse<{ playlists?: SavedPlaylist[] }>
> {
  return asApiResponse({ playlists: readSavedPlaylists() });
}

export async function saveServerPlaylists(playlists: SavedPlaylist[]) {
  writeSavedPlaylists(playlists);
  return asApiResponse({ playlists: [] });
}

export async function logoutQQProxy() {
  // web 端无需代理，直接清理本地 cookie
  return;
}

// ── 搜索 ──
export async function searchCloudMusic(
  provider: string,
  keywords: string,
  _cookie: string
): Promise<ApiResponse<SongListPayload>> {
  if (provider === 'qq') {
    const res = await qqSearchAction(keywords, 30);
    return res.ok
      ? asApiResponse({ songs: toSongList(res.songs), rawCount: res.rawCount })
      : failedResponse<SongListPayload>({ error: res.errors });
  }
  const res = await neteaseSearchAction(keywords, 30);
  return res.ok
    ? asApiResponse({ songs: toSongList(res.songs), rawCount: res.rawCount })
    : failedResponse<SongListPayload>({ error: res.errors });
}

// ── Cookie 同步（经 server action，内部密钥鉴权）──
export async function syncNeteaseProxyCookie(
  cookie: string
): Promise<ApiResponse<{ valid?: boolean }>> {
  const res = await saveCloudCookie('netease', cookie);
  const valid = Boolean((res as { valid?: boolean }).valid);
  return res.ok
    ? asApiResponse({ valid })
    : failedResponse<{ valid?: boolean }>({ valid: false });
}

export async function syncQQProxyCookie(
  cookie: string
): Promise<ApiResponse<{ loggedIn?: boolean }>> {
  const res = await saveCloudCookie('qq', cookie);
  const loggedIn = Boolean((res as { loggedIn?: boolean }).loggedIn);
  return res.ok
    ? asApiResponse({ loggedIn })
    : failedResponse<{ loggedIn?: boolean }>({ loggedIn: false });
}

// ── 歌词 ──
export async function loadSongLyrics(
  song: NeteaseSong,
  _neteaseCookie: string,
  _qqCookie: string
): Promise<
  ApiResponse<{
    lyric?: string;
    translatedLyric?: string;
    tlyric?: string;
    qrc?: string;
  }>
> {
  const provider = song.provider || 'netease';
  if (provider === 'qq') {
    const mid = song.mid || song.songmid || String(song.id);
    const res = await qqLyricAction(mid, String(song.qqId || ''));
    return res.ok
      ? asApiResponse({ lyric: res.lyric, tlyric: res.tlyric, qrc: res.qrc })
      : failedResponse({ lyric: '', translatedLyric: '' });
  }
  const res = await neteaseLyricAction(song.id);
  return res.ok
    ? asApiResponse({ lyric: res.lyric, translatedLyric: res.translatedLyric })
    : failedResponse({ lyric: '', translatedLyric: '' });
}

// ── 播放地址与歌词 ──
export async function loadSongPlaybackResources(
  song: NeteaseSong,
  settings: PlaybackQualitySettings,
  _neteaseCookie: string,
  _qqCookie: string
) {
  const provider = song.provider || 'netease';
  if (provider === 'qq') {
    const mid = song.mid || song.songmid || String(song.id);
    const [playback, lyricData] = await Promise.all([
      qqSongUrlAction(mid, song.mediaMid || '', settings.qqQuality),
      loadSongLyrics(song, '', '') as Promise<
        ApiResponse<{
          lyric?: string;
          translatedLyric?: string;
          tlyric?: string;
          qrc?: string;
        }>
      >,
    ]);
    return {
      provider,
      urlData: {
        url: playback.url,
        message: playback.message,
        ok: playback.ok,
      },
      lyricData: lyricData.data,
    };
  }
  const [playback, lyricData] = await Promise.all([
    neteasePlayableAction(song.id, settings.neteaseBitrate),
    loadSongLyrics(song, '', '') as Promise<
      ApiResponse<{
        lyric?: string;
        translatedLyric?: string;
        tlyric?: string;
        qrc?: string;
      }>
    >,
  ]);
  return {
    provider,
    urlData: { url: playback.url, message: playback.errors, ok: playback.ok },
    lyricData: lyricData.data,
  };
}
