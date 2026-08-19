'use client';

import { PlayMode, useMusic } from '@/context/music-provider';
import {
  ListMusic,
  LucideProps,
  Minimize2,
  Music,
  Pause,
  Play,
  Repeat,
  RotateCw,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import Image from 'next/image';
import React, { useRef, useState } from 'react';
import { useClickOutside } from '@/hooks/use-click-outside';
import { useT } from '@/i18n/dictionary-provider';
import { trackEvent } from '@/utils/tracker';
import { cn } from '@/utils/utils';

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

type LucideIcon = React.ForwardRefExoticComponent<
  Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>
>;

interface CollapsedPlayerProps {
  song: Music;
  isPlaying: boolean;
  onExpand: () => void;
}

/** 收起状态的圆形播放按钮 */
function CollapsedPlayer({ song, isPlaying, onExpand }: CollapsedPlayerProps) {
  const animationPlayState = isPlaying ? 'running' : 'paused';
  const Icon = isPlaying ? Pause : Play;
  return (
    <button
      onClick={onExpand}
      className="group relative h-full w-full overflow-hidden rounded-full"
    >
      <Image
        width={40}
        height={40}
        src={song.cover}
        alt={song.name}
        className="animate-spin-slow h-full w-full object-cover transition-transform"
        style={{ animationPlayState }}
        unoptimized
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
        <Icon className="ml-0.5 h-4 w-4 text-white" />
      </div>
    </button>
  );
}

interface PlayerViewProps {
  song: Music;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onSetVolume: (volume: number) => void;
}

/** 展开面板 - 播放器视图 */
function PlayerView({
  song,
  isPlaying,
  progress,
  duration,
  volume,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onSetVolume,
}: PlayerViewProps) {
  const t = useT();
  const animationPlayState = isPlaying ? 'running' : 'paused';
  const Icon = isPlaying ? Pause : Play;
  const playButtonText = isPlaying
    ? t('global-music-player.pause')
    : t('global-music-player.play');

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    onSeek(percent * duration);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-10 w-10 flex-shrink-0">
        <Image
          width={40}
          height={40}
          src={song.cover}
          alt={song.name}
          className="animate-spin-slow h-full w-full rounded-full object-cover transition-transform"
          style={{ animationPlayState }}
          unoptimized
        />
        <div className="absolute inset-0 rounded-full border bg-black/10" />
      </div>

      <div className="flex min-w-[140px] flex-col items-center justify-center">
        <span className="text-foreground truncate text-sm font-medium">
          {song.name}
        </span>
        <span className="text-muted-foreground truncate text-xs">
          {song.artist}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          className="hover:bg-accent/50 text-foreground/70 hover:text-foreground cursor-pointer rounded-full p-1.5 transition-colors"
          title={t('global-music-player.prev')}
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          onClick={onTogglePlay}
          className="bg-primary text-primary-foreground cursor-pointer rounded-full p-2 transition-opacity hover:opacity-80"
          title={playButtonText}
        >
          <Icon className="ml-0.5 h-4 w-4" />
        </button>
        <button
          onClick={onNext}
          className="hover:bg-accent/50 text-foreground/70 hover:text-foreground cursor-pointer rounded-full p-1.5 transition-colors"
          title={t('global-music-player.next')}
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-w-[160px] flex-col gap-1">
        <div
          className="bg-muted group h-1.5 cursor-pointer rounded-full"
          role="slider"
          aria-label="播放进度"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={progress}
          aria-valuetext={formatTime(progress)}
          tabIndex={0}
          onClick={handleProgressClick}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              onSeek(Math.min(progress + 5, duration));
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              onSeek(Math.max(progress - 5, 0));
            } else if (e.key === 'Home') {
              e.preventDefault();
              onSeek(0);
            } else if (e.key === 'End') {
              e.preventDefault();
              onSeek(duration);
            }
          }}
        >
          <div
            className="bg-primary h-full rounded-full transition-opacity duration-100 group-hover:opacity-80"
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
          onClick={() => onSetVolume(volume > 0 ? 0 : 0.7)}
          className="hover:bg-accent/50 text-foreground/70 hover:text-foreground cursor-pointer p-1 transition-colors"
          title={
            volume > 0
              ? t('global-music-player.mute')
              : t('global-music-player.unmute')
          }
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
          onChange={(e) => onSetVolume(parseFloat(e.target.value))}
          aria-label="音量"
          className="bg-muted accent-primary h-1 cursor-pointer appearance-none rounded-full"
        />
      </div>
    </div>
  );
}

interface PlaylistViewProps {
  playlist: Music[];
  currentMusicId: string;
  onSwitch: (index: number, song: Music) => void;
}

/** 展开面板 - 播放列表视图 */
function PlaylistView({
  playlist,
  currentMusicId,
  onSwitch,
}: PlaylistViewProps) {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-2">
      <h3 className="text-foreground text-sm font-medium">
        {t('global-music-player.playlist')}
      </h3>
      <ul className="flex max-h-[180px] w-full flex-col gap-1 overflow-y-auto">
        {playlist.map((song, index) => (
          <li key={song.id}>
            <button
              type="button"
              onClick={() => onSwitch(index, song)}
              className={cn(
                'flex w-full cursor-pointer items-center justify-between gap-2 rounded px-2 py-1 text-left transition-colors',
                song.id === currentMusicId
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-accent/50'
              )}
            >
              <span className="text-muted-foreground text-xs">{index + 1}</span>
              <span className="text-foreground flex-1 truncate text-sm font-medium">
                {song.name}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {song.artist}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface PlayerControlsProps {
  currentView: 'player' | 'playlist';
  playModeText: string;
  PlayModeIcon: LucideIcon;
  onSetView: (view: 'player' | 'playlist') => void;
  onCycleMode: () => void;
  onToggleExpand: () => void;
}

/** 展开面板 - 底部视图切换与播放模式 */
function PlayerControls({
  currentView,
  playModeText,
  PlayModeIcon,
  onSetView,
  onCycleMode,
  onToggleExpand,
}: PlayerControlsProps) {
  const t = useT();
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onSetView('player')}
          className={cn(
            'hover:bg-accent/50 cursor-pointer rounded-full border-1 border-transparent p-1.5 transition-colors',
            currentView === 'player' ? 'text-foreground border-foreground' : ''
          )}
          title={t('global-music-player.play')}
        >
          <Music className="h-4 w-4" />
        </button>
        <button
          onClick={() => onSetView('playlist')}
          className={cn(
            'hover:bg-accent/50 cursor-pointer rounded-full border-1 border-transparent p-1.5 transition-colors',
            currentView === 'playlist'
              ? 'text-foreground border-foreground'
              : ''
          )}
          title={t('global-music-player.playlist')}
        >
          <ListMusic className="h-4 w-4" />
        </button>
        <button
          onClick={onCycleMode}
          className="hover:bg-accent/50 flex cursor-pointer items-center gap-2 rounded-full border-1 border-transparent p-1.5 transition-colors"
          title={playModeText}
        >
          <PlayModeIcon className="h-4 w-4" />
          <span className="text-foreground text-xs">{playModeText}</span>
        </button>
      </div>
      <button
        onClick={onToggleExpand}
        className="hover:bg-accent/50 text-foreground/70 hover:text-foreground cursor-pointer rounded-full p-1.5 transition-colors"
        title="收起"
      >
        <Minimize2 className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ExpandedPlayerProps {
  playerRef: React.RefObject<HTMLDivElement | null>;
  currentMusic: Music;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  playlist: Music[];
  currentView: 'player' | 'playlist';
  playModeText: string;
  PlayModeIcon: LucideIcon;
  onSetView: (view: 'player' | 'playlist') => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onSetVolume: (volume: number) => void;
  onSwitch: (index: number, song: Music) => void;
  onCycleMode: () => void;
  onToggleExpand: () => void;
}

/** 展开状态的面板（播放器/播放列表 左右滑动切换） */
function ExpandedPlayer({
  playerRef,
  currentMusic,
  isPlaying,
  progress,
  duration,
  volume,
  playlist,
  currentView,
  playModeText,
  PlayModeIcon,
  onSetView,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onSetVolume,
  onSwitch,
  onCycleMode,
  onToggleExpand,
}: ExpandedPlayerProps) {
  return (
    <div
      className="flex w-full max-w-[250px] flex-col items-center gap-3"
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
            <PlayerView
              song={currentMusic}
              isPlaying={isPlaying}
              progress={progress}
              duration={duration}
              volume={volume}
              onTogglePlay={onTogglePlay}
              onPrev={onPrev}
              onNext={onNext}
              onSeek={onSeek}
              onSetVolume={onSetVolume}
            />
          </div>

          <div className="w-full flex-shrink-0">
            <PlaylistView
              playlist={playlist}
              currentMusicId={currentMusic.id}
              onSwitch={onSwitch}
            />
          </div>
        </div>
      </div>

      <PlayerControls
        currentView={currentView}
        playModeText={playModeText}
        PlayModeIcon={PlayModeIcon}
        onSetView={onSetView}
        onCycleMode={onCycleMode}
        onToggleExpand={onToggleExpand}
      />
    </div>
  );
}

export function GlobalMusicPlayer() {
  const {
    currentMusic,
    isPlaying,
    progress,
    duration,
    volume,
    playlist,
    isCollapsed,
    playMode,
    togglePlay,
    play,
    prev,
    next,
    seek,
    setVolume,
    setPlayMode,
    toggleExpand,
  } = useMusic();
  const t = useT();
  const playerRef = useRef<HTMLDivElement>(null);

  useClickOutside(playerRef, () => {
    toggleExpand();
    setCurrentView('player');
  });
  const [currentView, setCurrentView] = useState<'player' | 'playlist'>(
    'player'
  );

  const handleSwitch = (index: number, song: Music) => {
    seek(0);
    play(index);
    setCurrentView('player');
    trackEvent('switch_song', { song });
  };

  const mapPlayMode: Record<
    PlayMode,
    {
      nextMode: PlayMode;
      playButtonText: string;
      PlayModeIcon: LucideIcon;
    }
  > = {
    sequential: {
      nextMode: 'random',
      playButtonText: t('global-music-player.sequential'),
      PlayModeIcon: RotateCw,
    },
    random: {
      nextMode: 'loop',
      playButtonText: t('global-music-player.random'),
      PlayModeIcon: Shuffle,
    },
    loop: {
      nextMode: 'sequential',
      playButtonText: t('global-music-player.loop'),
      PlayModeIcon: Repeat,
    },
  };

  if (!currentMusic) {
    return null;
  }

  const playModeText = mapPlayMode[playMode].playButtonText;
  const PlayModeIcon = mapPlayMode[playMode].PlayModeIcon;

  return (
    <div
      className={cn(
        'border-border/50 fixed bottom-6 left-6 z-50 flex flex-col items-center gap-3 rounded-lg border p-2 shadow-lg backdrop-blur-lg',
        isCollapsed
          ? 'h-16 w-16 rounded-full'
          : 'w-auto max-w-[calc(100vw-3rem)]'
      )}
    >
      {isCollapsed ? (
        <CollapsedPlayer
          song={currentMusic}
          isPlaying={isPlaying}
          onExpand={toggleExpand}
        />
      ) : (
        <ExpandedPlayer
          playerRef={playerRef}
          currentMusic={currentMusic}
          isPlaying={isPlaying}
          progress={progress}
          duration={duration}
          volume={volume}
          playlist={playlist}
          currentView={currentView}
          playModeText={playModeText}
          PlayModeIcon={PlayModeIcon}
          onSetView={setCurrentView}
          onTogglePlay={togglePlay}
          onPrev={prev}
          onNext={next}
          onSeek={seek}
          onSetVolume={setVolume}
          onSwitch={handleSwitch}
          onCycleMode={() => setPlayMode(mapPlayMode[playMode].nextMode)}
          onToggleExpand={toggleExpand}
        />
      )}
    </div>
  );
}
