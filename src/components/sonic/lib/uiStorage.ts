import type { SavedPlaylist } from '../types';

export type SearchProvider = 'netease' | 'qq';

export const PLAYLIST_STORAGE_KEY = 'sonic-topography-playlists-v1';
const SIDE_NAV_HINT_STORAGE_KEY = 'sonic-topography-side-nav-hint-seen-v1';
const SEARCH_PROVIDER_STORAGE_KEY = 'sonic-topography-search-provider-v1';
const PINNED_NETEASE_PLAYLISTS_STORAGE_KEY = 'sonic-topography-pinned-netease-v1';
const PINNED_QQ_PLAYLISTS_STORAGE_KEY = 'sonic-topography-pinned-qq-v1';

function getStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  return typeof window === 'undefined' ? null : window.localStorage;
}

function readStringList(key: string, storage?: Storage): string[] {
  try {
    const raw = getStorage(storage)?.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function writeStringList(key: string, values: string[], storage?: Storage) {
  getStorage(storage)?.setItem(key, JSON.stringify(values));
}

export function readPinnedNeteasePlaylistsStorage(storage?: Storage) {
  return readStringList(PINNED_NETEASE_PLAYLISTS_STORAGE_KEY, storage);
}

export function writePinnedNeteasePlaylistsStorage(pinned: string[], storage?: Storage) {
  writeStringList(PINNED_NETEASE_PLAYLISTS_STORAGE_KEY, pinned, storage);
}

export function readPinnedQQPlaylistsStorage(storage?: Storage) {
  return readStringList(PINNED_QQ_PLAYLISTS_STORAGE_KEY, storage);
}

export function writePinnedQQPlaylistsStorage(pinned: string[], storage?: Storage) {
  writeStringList(PINNED_QQ_PLAYLISTS_STORAGE_KEY, pinned, storage);
}

export function readSideNavHintSeen(storage?: Storage) {
  return getStorage(storage)?.getItem(SIDE_NAV_HINT_STORAGE_KEY) === '1';
}

export function writeSideNavHintSeen(storage?: Storage) {
  getStorage(storage)?.setItem(SIDE_NAV_HINT_STORAGE_KEY, '1');
}

export function readSearchProviderStorage(storage?: Storage): SearchProvider {
  return getStorage(storage)?.getItem(SEARCH_PROVIDER_STORAGE_KEY) === 'qq' ? 'qq' : 'netease';
}

export function writeSearchProviderStorage(provider: SearchProvider, storage?: Storage) {
  getStorage(storage)?.setItem(SEARCH_PROVIDER_STORAGE_KEY, provider);
}

export function createDefaultPlaylists(): SavedPlaylist[] {
  return [
    { id: 'favorites', name: 'Favorites', songs: [] },
    { id: 'visual-set', name: 'Visual Set', songs: [] },
  ];
}

export function normalizeSavedPlaylists(value: unknown): SavedPlaylist[] {
  if (!Array.isArray(value) || value.length === 0) return createDefaultPlaylists();
  return value.map((playlist) => {
    const candidate = playlist as Partial<SavedPlaylist>;
    return {
      id: String(candidate.id || `playlist-${Date.now()}`),
      name: String(candidate.name || 'Playlist'),
      songs: Array.isArray(candidate.songs) ? candidate.songs : [],
    };
  });
}

export function readSavedPlaylists(storage?: Storage): SavedPlaylist[] {
  try {
    const raw = getStorage(storage)?.getItem(PLAYLIST_STORAGE_KEY);
    return raw ? normalizeSavedPlaylists(JSON.parse(raw)) : createDefaultPlaylists();
  } catch (error) {
    console.warn('Unable to read saved playlists:', error);
    return createDefaultPlaylists();
  }
}

export function writeSavedPlaylists(playlists: SavedPlaylist[], storage?: Storage) {
  getStorage(storage)?.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(playlists));
}

export function hasSavedSongs(playlists: SavedPlaylist[]): boolean {
  return playlists.some((playlist) => playlist.songs.length > 0);
}
