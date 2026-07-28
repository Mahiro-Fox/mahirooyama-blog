'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { useMusic } from '@/context/music-provider';
import { cn } from '@/utils/utils';
import {
  ListMusic,
  Minimize2,
  Music,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { useClickOutside } from '@/hooks/use-click-outside';

export function GlobalMusicPlayer() {
  const {
    currentSong,
    isPlaying,
    progress,
    duration,
    volume,
    playlist,
    isCollapsed,
    togglePlay,
    play,
    prev,
    next,
    seek,
    setVolume,
    toggleExpand,
  } = useMusic();
  const playerRef = useRef<HTMLDivElement>(null);

  useClickOutside(playerRef, () => {
    toggleExpand();
    setCurrentView('player');
  });
  const [currentView, setCurrentView] = useState<'player' | 'playlist'>(
    'player'
  );

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

  // const toggleView = () => {
  //   setCurrentView((prev) => (prev === 'player' ? 'playlist' : 'player'));
  // };

  if (!currentSong) {
    return null;
  }

  const animationPlayState = isPlaying ? 'running' : 'paused';
  const Icon = isPlaying ? Pause : Play;
  const text = isPlaying ? '暂停' : '播放';
  return (
    <div
      className={cn(
        'border-border/50 bg-card/90 fixed bottom-6 left-6 z-50 flex flex-col items-center gap-3 rounded-lg border p-2 shadow-lg backdrop-blur-lg',
        isCollapsed ? 'h-16 w-16 rounded-full' : 'w-48'
      )}
    >
      {isCollapsed ? (
        <button
          onClick={toggleExpand}
          className="group relative h-full w-full overflow-hidden rounded-full"
        >
          <Image
            width={40}
            height={40}
            src={currentSong.cover}
            alt={currentSong.name}
            className="animate-spin-slow h-full w-full object-cover transition-transform"
            style={{ animationPlayState }}
            unoptimized
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Icon className="ml-0.5 h-4 w-4 text-white" />
          </div>
        </button>
      ) : (
        <div
          className="flex w-full flex-col items-center gap-3"
          ref={playerRef}
        >
          <div className="relative w-full overflow-hidden">
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{
                transform: `translateX(-${currentView === 'player' ? 0 : 100}%)`,
              }}
            >
              <div className="w-full flex-shrink-0">
                <div className="flex flex-col items-center gap-2">
                  <div className="relative h-10 w-10 flex-shrink-0">
                    <Image
                      width={40}
                      height={40}
                      src={currentSong.cover}
                      alt={currentSong.name}
                      className="animate-spin-slow h-full w-full rounded-full object-cover transition-transform"
                      style={{ animationPlayState }}
                      unoptimized
                    />
                    <div className="absolute inset-0 rounded-full border bg-black/10" />
                  </div>

                  <div className="flex min-w-[140px] flex-col items-center justify-center">
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
                      title={text}
                    >
                      <Icon className="ml-0.5 h-4 w-4" />
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

                  <div className="border-border/50 flex min-w-[160px] items-center gap-2">
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
                      className="bg-muted accent-primary h-1 cursor-pointer appearance-none rounded-full"
                    />
                  </div>
                </div>
              </div>

              <div className="w-full flex-shrink-0">
                <div className="flex flex-col items-center gap-2">
                  <h3 className="text-foreground text-sm font-medium">
                    歌曲列表
                  </h3>
                  <ul className="flex max-h-[180px] w-full flex-col gap-1 overflow-y-auto">
                    {playlist.map((song, index) => (
                      <li
                        key={song.id}
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1 transition-colors',
                          song.id === currentSong.id
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-accent/50'
                        )}
                        onClick={() => {
                          seek(0);
                          play(index);
                          setCurrentView('player');
                        }}
                      >
                        <span className="text-muted-foreground text-xs">
                          {index + 1}
                        </span>
                        <span className="text-foreground flex-1 truncate text-sm font-medium">
                          {song.name}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          {song.artist}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentView('player')}
                className={cn(
                  'hover:bg-accent/50 cursor-pointer rounded-full p-1.5 transition-colors',
                  currentView === 'player'
                    ? 'text-primary'
                    : 'text-foreground/70 hover:text-foreground'
                )}
                title="播放"
              >
                <Music className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentView('playlist')}
                className={cn(
                  'hover:bg-accent/50 cursor-pointer rounded-full p-1.5 transition-colors',
                  currentView === 'playlist'
                    ? 'text-primary'
                    : 'text-foreground/70 hover:text-foreground'
                )}
                title="列表"
              >
                <ListMusic className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={toggleExpand}
              className="hover:bg-accent/50 text-foreground/70 hover:text-foreground cursor-pointer rounded-full p-1.5 transition-colors"
              title="收起"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
