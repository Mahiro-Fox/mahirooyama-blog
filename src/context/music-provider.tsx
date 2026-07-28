'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { Song } from '@/types/music';

interface MusicContextValue {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isExpanded: boolean;
  playlist: Song[];
  currentIndex: number;
  play: (index?: number) => void;
  pause: () => void;
  togglePlay: () => void;
  prev: () => void;
  next: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
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
  children: React.ReactNode;
}

const STORAGE_KEY_VOLUME = 'music_player_volume';
const STORAGE_KEY_EXPANDED = 'music_player_expanded';

export function MusicProvider({ playlist, children }: MusicProviderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isExpanded, setIsExpanded] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextRef = useRef<() => void>(() => {});

  useEffect(() => {
    const savedVolume = localStorage.getItem(STORAGE_KEY_VOLUME);
    if (savedVolume) {
      setVolume(parseFloat(savedVolume));
    }
    const savedExpanded = localStorage.getItem(STORAGE_KEY_EXPANDED);
    if (savedExpanded) {
      setIsExpanded(savedExpanded === 'true');
    }
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.autoplay = false;
    audio.volume = volume;
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VOLUME, volume.toString());
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EXPANDED, isExpanded.toString());
  }, [isExpanded]);

  const currentSong = playlist[currentIndex] || null;

  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    audioRef.current.src = currentSong.url;
    setDuration(0);
    setProgress(0);

    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration || 0);
      }
    };

    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setProgress(audioRef.current.currentTime || 0);
      }
    };

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

  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.play().catch((e) => {
        console.warn('Autoplay prevented:', e);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const play = useCallback(
    (index?: number) => {
      if (index !== undefined && index >= 0 && index < playlist.length) {
        setCurrentIndex(index);
      }
      setIsPlaying(true);
    },
    [playlist.length]
  );

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? playlist.length - 1 : prev - 1));
    setIsPlaying(true);
  }, [playlist.length]);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev === playlist.length - 1 ? 0 : prev + 1));
    setIsPlaying(true);
  }, [playlist.length]);

  nextRef.current = next;

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  }, []);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <MusicContext.Provider
      value={{
        currentSong,
        isPlaying,
        progress,
        duration,
        volume,
        isExpanded,
        playlist,
        currentIndex,
        play,
        pause,
        togglePlay,
        prev,
        next,
        seek,
        setVolume,
        toggleExpand,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}
