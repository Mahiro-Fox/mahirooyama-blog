'use client';

import React from 'react';
import Image from 'next/image';
import { useMusic } from '@/context/music-provider';
import { cn } from '@/utils/utils';
import {
  Minimize2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { useMediaQuery } from '@/hooks/use-media-query';

export function GlobalMusicPlayer() {
  const {
    currentSong,
    isPlaying,
    progress,
    duration,
    volume,
    isExpanded,
    togglePlay,
    prev,
    next,
    seek,
    setVolume,
    toggleExpand,
  } = useMusic();

  const isMobile = useMediaQuery('(max-width: 768px)');

  const shouldShowMini = isMobile || !isExpanded;

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seek(percent * duration);
  };

  if (!currentSong) {
    return null;
  }

  return (
    <div
      className={cn(
        'border-border/50 bg-card/90 fixed z-50 flex items-center gap-3 rounded-full border shadow-lg backdrop-blur-lg transition-all duration-300 ease-out',
        shouldShowMini
          ? 'bottom-6 left-6 h-16 w-16'
          : 'bottom-6 left-6 h-16 px-4 py-2'
      )}
    >
      {shouldShowMini ? (
        <button
          onClick={toggleExpand}
          className="group relative h-full w-full overflow-hidden rounded-full"
        >
          <Image
            fill
            src={currentSong.cover}
            alt={currentSong.name}
            className={cn(
              'h-full w-full object-cover transition-transform',
              isPlaying && 'animate-spin-slow'
            )}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            {isPlaying ? (
              <Pause className="h-4 w-4 text-white" />
            ) : (
              <Play className="ml-0.5 h-4 w-4 text-white" />
            )}
          </div>
        </button>
      ) : (
        <>
          <div className="relative h-10 w-10 flex-shrink-0">
            <Image
              fill
              src={currentSong.cover}
              alt={currentSong.name}
              className={cn(
                'h-full w-full rounded-full object-cover transition-transform',
                isPlaying && 'animate-spin-slow'
              )}
            />
            <div className="absolute inset-0 rounded-full bg-black/10" />
          </div>

          <div className="flex min-w-[140px] flex-col justify-center">
            <span className="text-foreground truncate text-sm font-medium">
              {currentSong.name}
            </span>
            <span className="text-muted-foreground truncate text-xs">
              {currentSong.artist}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              className="hover:bg-accent/50 text-foreground/70 hover:text-foreground cursor-pointer rounded-full p-1.5 transition-colors"
              title="上一首"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={togglePlay}
              className="bg-primary text-primary-foreground cursor-pointer rounded-full p-2 transition-opacity hover:opacity-80"
              title={isPlaying ? '暂停' : '播放'}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="ml-0.5 h-4 w-4" />
              )}
            </button>
            <button
              onClick={next}
              className="hover:bg-accent/50 text-foreground/70 hover:text-foreground cursor-pointer rounded-full p-1.5 transition-colors"
              title="下一首"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          <div className="flex min-w-[160px] flex-col gap-1">
            <div
              className="bg-muted group h-1.5 cursor-pointer rounded-full"
              onClick={handleProgressClick}
            >
              <div
                className="bg-primary h-full rounded-full transition-all duration-100 group-hover:opacity-80"
                style={{
                  width: `${duration > 0 ? (progress / duration) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="border-border/50 flex items-center gap-2 border-l pl-3">
            <button
              onClick={() => setVolume(volume > 0 ? 0 : 0.7)}
              className="hover:bg-accent/50 text-foreground/70 hover:text-foreground cursor-pointer p-1 transition-colors"
              title={volume > 0 ? '静音' : '取消静音'}
            >
              {volume > 0 ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="bg-muted accent-primary h-1 w-16 cursor-pointer appearance-none rounded-full"
            />
          </div>

          <button
            onClick={toggleExpand}
            className="hover:bg-accent/50 text-foreground/70 hover:text-foreground cursor-pointer rounded-full p-1.5 transition-colors"
            title="收起"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
