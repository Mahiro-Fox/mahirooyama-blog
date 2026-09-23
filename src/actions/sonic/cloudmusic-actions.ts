'use server';

import { buildQuery, goFetch } from '@/lib/server/api-client';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CloudMusicActions');

// 与 backend-go/internal/model/cloudmusic.go 对齐的响应结构
export interface CloudSong {
  provider?: string;
  id: number | string;
  qqId?: number | string;
  mid?: string;
  songmid?: string;
  mediaMid?: string;
  cover?: string;
  name: string;
  artist: string;
  album: string;
  duration: number;
  fee?: number;
}

export interface CloudPlaylistSummary {
  provider?: string;
  id: number | string;
  name: string;
  trackCount: number;
  loadedCount?: number;
  cover?: string;
  creator?: string;
  isFavorite?: boolean;
}

interface CloudSearchPayload {
  songs?: CloudSong[];
  rawCount?: number;
  filteredCount?: number;
  error?: string;
}

interface PlaylistPayload {
  songs?: CloudSong[];
  playlists?: CloudPlaylistSummary[];
  totalCount?: number;
  rawTrackCount?: number;
  playlist?: {
    id?: string;
    name?: string;
    cover?: string;
    trackCount?: number;
    loadedCount?: number;
  };
  error?: string;
}

function asNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapSong(raw: any): CloudSong {
  return {
    provider: raw.provider,
    id: raw.id,
    qqId: raw.qqId ?? raw.qq_id,
    mid: raw.mid,
    songmid: raw.songmid,
    mediaMid: raw.mediaMid ?? raw.media_mid,
    cover: raw.cover,
    name: raw.name ?? '',
    artist: raw.artist ?? '',
    album: raw.album ?? '',
    duration: asNumber(raw.duration),
    fee: raw.fee,
  };
}

function mapSongs(raw: any[] | undefined): CloudSong[] {
  return Array.isArray(raw) ? raw.map(mapSong) : [];
}

// —— 网易云 ——

export async function neteaseSearchAction(keywords: string, limit = 30) {
  const query = buildQuery({ keywords, limit: String(limit) });
  try {
    const data = await goFetch<CloudSearchPayload>(
      `/api/cloudmusic/netease/search${query}`
    );
    return {
      ok: true,
      songs: mapSongs(data.songs),
      rawCount: data.rawCount ?? 0,
    };
  } catch (e) {
    logger.error('neteaseSearchAction failed', e, { keywords });
    return { ok: false, errors: (e as Error).message, songs: [] };
  }
}

export async function neteasePlayableAction(id: string | number, br = '') {
  const query = buildQuery({ id: String(id), br: br || undefined });
  try {
    const data = await goFetch<{ url?: string }>(
      `/api/cloudmusic/netease/playable${query}`
    );
    return { ok: true, url: data.url ?? '' };
  } catch (e) {
    logger.error('neteasePlayableAction failed', e, { id });
    return { ok: false, errors: (e as Error).message, url: '' };
  }
}

export async function neteaseAccountAction() {
  try {
    const data = await goFetch<{
      valid?: boolean;
      userId?: any;
      nickname?: string;
    }>('/api/cloudmusic/netease/account');
    return { ok: true, ...data };
  } catch (e) {
    logger.error('neteaseAccountAction failed', e);
    return { ok: false, errors: (e as Error).message, valid: false };
  }
}

export async function neteaseDailyAction(limit = 30) {
  const query = buildQuery({ limit: String(limit) });
  try {
    const data = await goFetch<{ songs?: any[] }>(
      `/api/cloudmusic/netease/daily${query}`
    );
    return { ok: true, songs: mapSongs(data.songs) };
  } catch (e) {
    logger.error('neteaseDailyAction failed', e);
    return { ok: false, errors: (e as Error).message, songs: [] };
  }
}

export async function neteasePlaylistsAction() {
  try {
    const data = await goFetch<{ playlists?: CloudPlaylistSummary[] }>(
      '/api/cloudmusic/netease/playlists'
    );
    return { ok: true, playlists: data.playlists ?? [] };
  } catch (e) {
    logger.error('neteasePlaylistsAction failed', e);
    return { ok: false, errors: (e as Error).message, playlists: [] };
  }
}

export async function neteasePlaylistAction(id: string | number, limit = 100) {
  const query = buildQuery({ id: String(id), limit: String(limit) });
  try {
    const data = await goFetch<PlaylistPayload>(
      `/api/cloudmusic/netease/playlist${query}`
    );
    return {
      ok: true,
      songs: mapSongs(data.songs),
      totalCount: data.totalCount ?? 0,
      rawTrackCount: data.rawTrackCount ?? 0,
    };
  } catch (e) {
    logger.error('neteasePlaylistAction failed', e, { id });
    return {
      ok: false,
      errors: (e as Error).message,
      songs: [],
      totalCount: 0,
    };
  }
}

export async function neteaseLyricAction(id: string | number) {
  const query = buildQuery({ id: String(id) });
  try {
    const data = await goFetch<{ lyric?: string; translatedLyric?: string }>(
      `/api/cloudmusic/netease/lyric${query}`
    );
    return {
      ok: true,
      lyric: data.lyric ?? '',
      translatedLyric: data.translatedLyric ?? '',
    };
  } catch (e) {
    logger.error('neteaseLyricAction failed', e, { id });
    return {
      ok: false,
      errors: (e as Error).message,
      lyric: '',
      translatedLyric: '',
    };
  }
}

// —— 网易云扫码登录 ——

/** 申请扫码登录的 unikey（二维码内容基于它生成） */
export async function neteaseQrKeyAction() {
  try {
    const data = await goFetch<{
      unikey?: string;
      qrContent?: string;
      code?: number;
    }>('/api/cloudmusic/netease/qr/key');
    if (!data.unikey) {
      return { ok: false, errors: '二维码生成失败', unikey: '', qrContent: '' };
    }
    return {
      ok: true,
      unikey: data.unikey,
      qrContent:
        data.qrContent || `https://music.163.com/login?codekey=${data.unikey}`,
    };
  } catch (e) {
    logger.error('neteaseQrKeyAction failed', e);
    return {
      ok: false,
      errors: (e as Error).message,
      unikey: '',
      qrContent: '',
    };
  }
}

/**
 * 轮询扫码状态。
 * code：800 二维码已过期 / 801 等待扫码 / 802 已扫码待确认 / 803 授权成功。
 * 成功时 cookie 已由后端写入并持久化，同时回传供前端保存到本地存储。
 */
export async function neteaseQrCheckAction(key: string) {
  const query = buildQuery({ key });
  try {
    const data = await goFetch<{
      code?: number;
      message?: string;
      saved?: boolean;
      cookie?: string;
    }>(`/api/cloudmusic/netease/qr/check${query}`);
    return {
      ok: true,
      code: data.code ?? 0,
      message: data.message ?? '',
      saved: Boolean(data.saved),
      cookie: data.cookie ?? '',
    };
  } catch (e) {
    logger.error('neteaseQrCheckAction failed', e);
    return {
      ok: false,
      errors: (e as Error).message,
      code: 0,
      message: '',
      saved: false,
      cookie: '',
    };
  }
}

// —— QQ 音乐 ——

export async function qqSearchAction(keywords: string, limit = 12) {
  const query = buildQuery({ keywords, limit: String(limit) });
  try {
    const data = await goFetch<CloudSearchPayload>(
      `/api/cloudmusic/qq/search${query}`
    );
    return {
      ok: true,
      songs: mapSongs(data.songs),
      rawCount: data.rawCount ?? 0,
    };
  } catch (e) {
    logger.error('qqSearchAction failed', e, { keywords });
    return { ok: false, errors: (e as Error).message, songs: [] };
  }
}

export async function qqSongUrlAction(
  mid: string,
  mediaMid = '',
  quality = ''
) {
  const query = buildQuery({
    mid,
    mediaMid: mediaMid || undefined,
    quality: quality || undefined,
  });
  try {
    const data = await goFetch<{
      url?: string;
      playable?: boolean;
      level?: string;
      quality?: string;
      message?: string;
    }>(`/api/cloudmusic/qq/songurl${query}`);
    return {
      ok: true,
      url: data.url ?? '',
      playable: Boolean(data.playable),
      level: data.level,
      quality: data.quality,
      message: data.message,
    };
  } catch (e) {
    logger.error('qqSongUrlAction failed', e, { mid });
    return {
      ok: false,
      errors: (e as Error).message,
      url: '',
      playable: false,
    };
  }
}

export async function qqProfileAction() {
  try {
    const data = await goFetch<{
      provider?: string;
      loggedIn?: boolean;
      userId?: any;
      nickname?: string;
      avatar?: string;
      hasCookie?: boolean;
      playbackKeyReady?: boolean;
    }>('/api/cloudmusic/qq/profile');
    return { ok: true, ...data };
  } catch (e) {
    logger.error('qqProfileAction failed', e);
    return { ok: false, errors: (e as Error).message, loggedIn: false };
  }
}

export async function qqUserPlaylistsAction() {
  try {
    const data = await goFetch<{ playlists?: CloudPlaylistSummary[] }>(
      '/api/cloudmusic/qq/user/playlists'
    );
    return { ok: true, playlists: data.playlists ?? [] };
  } catch (e) {
    logger.error('qqUserPlaylistsAction failed', e);
    return { ok: false, errors: (e as Error).message, playlists: [] };
  }
}

export async function qqPlaylistTracksAction(id: string | number, limit = 50) {
  const query = buildQuery({ id: String(id), limit: String(limit) });
  try {
    const data = await goFetch<PlaylistPayload>(
      `/api/cloudmusic/qq/playlist/tracks${query}`
    );
    return {
      ok: true,
      songs: mapSongs(data.songs),
      playlist: data.playlist,
      totalCount: data.totalCount ?? data.playlist?.trackCount ?? 0,
    };
  } catch (e) {
    logger.error('qqPlaylistTracksAction failed', e, { id });
    return {
      ok: false,
      errors: (e as Error).message,
      songs: [],
      totalCount: 0,
    };
  }
}

export async function qqLyricAction(mid: string, id = '') {
  const query = buildQuery({ mid, id: id || undefined });
  try {
    const data = await goFetch<{
      lyric?: string;
      tlyric?: string;
      qrc?: string;
      roma?: string;
    }>(`/api/cloudmusic/qq/lyric${query}`);
    return {
      ok: true,
      lyric: data.lyric ?? '',
      tlyric: data.tlyric ?? '',
      qrc: data.qrc ?? '',
      roma: data.roma ?? '',
    };
  } catch (e) {
    logger.error('qqLyricAction failed', e, { mid });
    return { ok: false, errors: (e as Error).message, lyric: '' };
  }
}

// —— cookie（读写均需内部密钥，经 goFetch 自动携带）——

export async function saveCloudCookie(
  provider: 'netease' | 'qq',
  cookie: string
) {
  try {
    const data = await goFetch<{
      provider?: string;
      valid?: boolean;
      loggedIn?: boolean;
      userId?: any;
      nickname?: string;
      saved?: boolean;
    }>('/api/cloudmusic/cookie', {
      method: 'PUT',
      body: JSON.stringify({ provider, cookie }),
    });
    return { ok: true, ...data };
  } catch (e) {
    logger.error('saveCloudCookie failed', e, { provider });
    return { ok: false, errors: (e as Error).message };
  }
}

export async function cloudCookieStatus() {
  try {
    const data = await goFetch<{ netease?: any; qq?: any }>(
      '/api/cloudmusic/cookie'
    );
    return { ok: true, ...data };
  } catch (e) {
    logger.error('cloudCookieStatus failed', e);
    return { ok: false, errors: (e as Error).message };
  }
}

// —— 播放资源组装（复用云接口）——

/**
 * 组装一首歌的播放地址与歌词。
 * provider 用于区分网易云/QQ 的取流与取词逻辑。
 */
export async function resolveSongPlayback(
  song: CloudSong,
  opts: { quality?: string } = {}
) {
  const provider = song.provider || 'netease';
  if (provider === 'qq') {
    const mid = song.mid || song.songmid || String(song.id);
    const [urlRes, lyricRes] = await Promise.all([
      qqSongUrlAction(mid, song.mediaMid || '', opts.quality || ''),
      qqLyricAction(mid, String(song.qqId || '')),
    ]);
    return {
      provider,
      url: urlRes.url,
      lyric: lyricRes.lyric,
      tlyric: lyricRes.tlyric,
      ok: urlRes.ok,
    };
  }
  const [urlRes, lyricRes] = await Promise.all([
    neteasePlayableAction(song.id),
    neteaseLyricAction(song.id),
  ]);
  return {
    provider,
    url: urlRes.url,
    lyric: lyricRes.lyric,
    translatedLyric: lyricRes.translatedLyric,
    ok: urlRes.ok,
  };
}
