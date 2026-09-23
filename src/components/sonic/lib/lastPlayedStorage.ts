import type { NeteaseSong } from '../types';

const STORAGE_KEY = 'sonic_topography_last_played';

export interface LastPlayedState {
  /** 'cloud' = netease/qq song, 'demo' = demo track */
  type: 'cloud' | 'demo';
  song?: NeteaseSong;      // only for type='cloud'
  queue?: NeteaseSong[];   // the current playlist queue context
  trackName: string;
  cover: string;
  /** Playback position in seconds (best-effort, saved on pause/unload) */
  position?: number;
}

export function readLastPlayedStorage(): LastPlayedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.type || !parsed.trackName) return null;
    return parsed as LastPlayedState;
  } catch {
    return null;
  }
}

export function writeLastPlayedStorage(state: LastPlayedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function clearLastPlayedStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
