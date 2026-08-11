'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Song } from '@/lib/music';
import { throttle } from '@/utils/utils';

export type PlayMode = 'sequential' | 'random' | 'loop';
interface MusicContextValue {
  /** 当前播放的歌曲，null 表示没有歌曲 */
  currentSong: Song | null;
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 当前播放进度 */
  progress: number;
  /** 歌曲总时长 */
  duration: number;
  /** 音量 */
  volume: number;
  /** 是否展开播放器 */
  isCollapsed: boolean;
  /** 歌曲列表 */
  playlist: Song[];
  /** 播放模式 */
  playMode: PlayMode;
  /** 当前播放的歌曲索引 */
  currentIndex: number;
  /** 播放指定索引的歌曲 */
  play: (index?: number) => void;
  /** 暂停播放 */
  pause: () => void;
  /** 切换播放状态 */
  togglePlay: () => void;
  /** 播放上一首歌曲 */
  prev: () => void;
  /** 播放下一首歌曲 */
  next: () => void;
  /** 跳转到指定时间点 */
  seek: (time: number) => void;
  /** 设置音量 */
  setVolume: (volume: number) => void;
  /** 设置播放模式 */
  setPlayMode: (mode: PlayMode) => void;
  /** 切换展开状态 */
  toggleExpand: () => void;
}

const MusicContext = createContext<MusicContextValue | null>(null);

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within MusicProvider');
  }
  return context;
}

interface MusicProviderProps {
  playlist: Song[];
  initialIndex?: number;
  children: React.ReactNode;
}

const STORAGE_KEY_VOLUME = 'music_player_volume';

export function MusicProvider({
  playlist,
  initialIndex = 0,
  children,
}: MusicProviderProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>('sequential');
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextRef = useRef<() => void>(() => {});

  // 2. 辅助函数：生成不重复的随机数
  const getRandomIndex = useCallback((current: number, total: number) => {
    if (total <= 1) return 0;
    let index = Math.floor(Math.random() * total);
    while (index === current) {
      index = Math.floor(Math.random() * total);
    }
    return index;
  }, []);
  // 初始化音频元素，从本地存储获取音量和展开状态
  useEffect(() => {
    const savedVolume = parseFloat(
      localStorage.getItem(STORAGE_KEY_VOLUME) || '0.7'
    );
    setVolume(savedVolume);

    const audio = new Audio();
    audio.preload = 'metadata';
    audio.autoplay = false;
    audio.volume = savedVolume;
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // 音量变化时，更新音频元素音量
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VOLUME, volume.toString());
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // 监听pause事件，处理其他程序导致的暂停播放, 并更新播放状态。
  useEffect(() => {
    const handlePause = () => {
      setIsPlaying(false);
    };
    audioRef.current?.addEventListener('pause', handlePause);
    return () => {
      audioRef.current?.removeEventListener('pause', handlePause);
    };
  }, []);

  const currentSong = playlist[currentIndex] || null;

  // 当前歌曲变化时，更新音频源
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    audioRef.current.src = currentSong.url;
    setDuration(0);
    setProgress(0);

    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration || 0);
        // 播放当前歌曲
        setIsPlaying(true);
        notifyPlay();
      }
    };

    // 节流更新进度
    const handleTimeUpdate = throttle(() => {
      if (audioRef.current) {
        setProgress(audioRef.current.currentTime || 0);
      }
    }, 1000);

    const handleEnded = () => {
      nextRef.current();
    };

    const handleError = () => {
      console.warn(`Failed to load audio: ${currentSong.url}`);
    };

    audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    audioRef.current.addEventListener('ended', handleEnded);
    audioRef.current.addEventListener('error', handleError);

    return () => {
      audioRef.current?.removeEventListener(
        'loadedmetadata',
        handleLoadedMetadata
      );
      audioRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
      audioRef.current?.removeEventListener('ended', handleEnded);
      audioRef.current?.removeEventListener('error', handleError);
    };
  }, [currentSong]);

  // 播放状态切换时，通知浏览器播放
  useEffect(() => {
    const callback = isPlaying ? notifyPlay : notifyPause;
    callback();
  }, [isPlaying]);

  const notifyPlay = () => {
    audioRef.current?.play().catch((e) => {
      if (e.name === 'AbortError') return; // 被新的 load 打断，属于正常现象，忽略即可
      console.warn('Autoplay prevented:', e);
      setIsPlaying(false);
    });
  };

  const notifyPause = () => {
    audioRef.current?.pause();
  };

  // 播放index索引的歌曲
  const play = useCallback(
    (index?: number) => {
      if (index !== undefined && index >= 0 && index < playlist.length) {
        setCurrentIndex(index);
      }
      setIsPlaying(true);
    },
    [playlist.length]
  );

  // 暂停播放
  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // 切换播放状态
  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // 播放上一首歌曲
  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? playlist.length - 1 : prev - 1));
    setIsPlaying(true);
  }, [playlist.length]);

  // 播放下一首歌曲
  const next = useCallback(() => {
    setCurrentIndex((prev) => {
      let newIndex;
      if (playMode === 'sequential') {
        // 顺序播放
        newIndex = prev === playlist.length - 1 ? 0 : prev + 1;
      } else if (playMode === 'random') {
        // 随机播放
        newIndex = getRandomIndex(currentIndex, playlist.length);
      } else {
        // 循环
        newIndex = prev;
      }
      return newIndex;
    });
    setIsPlaying(true);
  }, [playlist.length, playMode]);

  nextRef.current = next;

  // 跳转到指定时间点
  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  }, []);

  // 切换展开状态
  const toggleExpand = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  return (
    <MusicContext.Provider
      value={{
        currentSong,
        isPlaying,
        progress,
        duration,
        volume,
        isCollapsed,
        playlist,
        currentIndex,
        playMode,
        play,
        pause,
        togglePlay,
        prev,
        next,
        seek,
        setVolume,
        setPlayMode,
        toggleExpand,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}
