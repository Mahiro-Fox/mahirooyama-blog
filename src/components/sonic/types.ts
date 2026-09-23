export interface AudioData {
  // Legacy base
  bass: number;
  mid: number;
  treble: number;
  energy: number;

  // Granular bands
  subBass: number;   // 20-60Hz
  lowMid: number;    // 140-300Hz
  highMid: number;   // 800-2kHz
  presence: number;  // 2-4kHz
  brilliance: number;// 4-8kHz
  air: number;       // 8-16kHz

  // Timbral Metrics
  warmth: number;
  brightness: number;
  sharpness: number;
  smoothness: number;
  density: number;
  spectralCentroid: number;

  // Realtime kick channel for beat-led terrain motion.
  kickLevel: number;
  kickFlux: number;
  kickThreshold: number;
  kickOnset: number;
  kickEnvelope: number;
  kickConfidence: number;
  kickWindowName: string;
  kickWindowStart: number;
  kickWindowEnd: number;
}

export interface RippleEvent {
  pos: [number, number];
  time: number;
  strength: number;
  isActive: boolean;
}

export interface TrackInfo {
  name: string;
  artist: string;
  duration: number; // in seconds
  file?: File;
  url?: string;
}

export type MusicProvider = 'netease' | 'qq';

export interface NeteaseSong {
  provider?: MusicProvider;
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
  fee: number;
}

export interface SavedPlaylist {
  id: string;
  name: string;
  songs: NeteaseSong[];
}

export interface CloudPlaylistSummary {
  provider?: 'netease' | 'qq';
  id: number | string;
  name: string;
  trackCount: number;
  loadedCount?: number;
  cover?: string;
  creator?: string;
  isFavorite?: boolean;
}

export interface UpdateReleaseInfo {
  tagName?: string;
  name?: string;
  htmlUrl?: string;
  publishedAt?: string;
  notes?: string;
}

export interface AvailableUpdateInfo {
  configured?: boolean;
  currentVersion?: string;
  latestVersion?: string;
  updateAvailable?: boolean;
  release?: UpdateReleaseInfo;
}

export interface UpdateDownloadJob {
  id: string;
  status: 'queued' | 'downloading' | 'ready' | 'failed';
  version?: string;
  name?: string;
  received?: number;
  total?: number;
  filePath?: string;
  error?: string;
  errorCode?: string;
  releaseUrl?: string;
  channelName?: string;
  attempts?: Array<{
    name?: string;
    status?: string;
    error?: string;
    errorCode?: string;
    httpStatus?: number;
  }>;
}
