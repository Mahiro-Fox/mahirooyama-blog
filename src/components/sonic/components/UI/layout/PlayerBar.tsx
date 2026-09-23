/**
 * 底部播放器控制栏。
 * 包含极简进度指示、可拖拽进度条、播放/暂停、上下首、播放模式、音量与主题切换按钮，
 * 平时收起为底部细条，鼠标移入时展开。
 */
import {
  Palette,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react';
import React from 'react';
import { engine } from '../../../lib/audio/AudioEngine';
import { t, useLanguage } from '../../../lib/i18n/i18n';
import { type DisplaySettings } from '../../../lib/settings/displaySettings';
import { nextPlayMode, type PlayMode } from '../../../lib/settings/playMode';
import { CUSTOM_THEME_ID, themes } from '../../../lib/theme/themes';
import type { NeteaseSong } from '../../../types';
import { CoverArt } from '../common/CoverArt';
import { MarqueeTitle } from '../common/MarqueeTitle';
import { songSourceLabel } from '../shared/uiHelpers';

/**
 * 底部播放器控制栏（进度条 / 播放控制 / 播放模式 / 音量 / 主题切换）。
 *
 * @param accentHex 当前主题强调色，用于进度条与按钮高亮
 * @param isPlaying 是否正在播放，决定按钮显示播放还是暂停图标
 * @param playMode 播放模式（顺序/随机/单曲循环）
 * @param togglePlay 播放与暂停切换
 * @param playFromQueue 按方向切歌（1 为下一首，-1 为上一首）
 * @param getCurrentQueue 取当前播放队列，供切歌使用
 * @param formatTime 把秒数格式化为 m:ss
 * @param currentTime 当前播放进度（秒）
 * @param duration 曲目总时长（秒）
 * @param setCurrentTime 跳转进度时更新当前时间
 * @param isBottomPanelOpen 播放器是否处于展开状态
 * @param setIsBottomPanelOpen 设置播放器展开状态
 * @param lastPointerUpTime 最近一次指针抬起时间，避免刚拖拽完误触展开
 * @param trackName 当前曲名
 * @param currentCover 当前封面地址
 * @param currentSong 当前曲目对象（用于展示来源标签）
 */
export function PlayerBar({
  accentHex,
  currentCover,
  currentSong,
  currentTime,
  displaySettings,
  duration,
  formatTime,
  getCurrentQueue,
  isBottomPanelOpen,
  isPlaying,
  lastPointerUpTime,
  onThemeChange,
  playFromQueue,
  playMode,
  setCurrentTime,
  setDisplaySettings,
  setIsBottomPanelOpen,
  setPlayMode,
  setVolume,
  theme,
  togglePlay,
  trackName,
  volume,
}: {
  accentHex: string;
  currentCover: string;
  currentSong: NeteaseSong | null;
  currentTime: number;
  displaySettings: DisplaySettings;
  duration: number;
  formatTime: (time: number) => string;
  getCurrentQueue: () => NeteaseSong[];
  isBottomPanelOpen: boolean;
  isPlaying: boolean;
  lastPointerUpTime: React.MutableRefObject<number>;
  onThemeChange: (theme: string) => void;
  playFromQueue: (
    direction: 1 | -1,
    fromSongId?: number | string | null
  ) => void;
  playMode: PlayMode;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  setDisplaySettings: React.Dispatch<React.SetStateAction<DisplaySettings>>;
  setIsBottomPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setPlayMode: React.Dispatch<React.SetStateAction<PlayMode>>;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  theme: string;
  togglePlay: () => void;
  trackName: string;
  volume: number;
}) {
  const lang = useLanguage();
  return (
    <>
      {/* Player Panel Area with Hover Trigger */}
      <div
        className="pointer-events-auto absolute bottom-0 left-0 z-40 h-[120px] w-full"
        onMouseEnter={(e) => {
          if (e.buttons !== 0) return;
          if (Date.now() - lastPointerUpTime.current < 100) return;
          setIsBottomPanelOpen(true);
        }}
        onMouseLeave={() => setIsBottomPanelOpen(false)}
      >
        {/* Minimal Progress Bar (visible only when player is hidden) */}
        <div
          className={`pointer-events-none fixed bottom-[4px] left-1/2 z-[9999] h-[2px] w-[900px] max-w-[90vw] -translate-x-1/2 overflow-hidden rounded-full bg-white/10 transition-all duration-500 ${
            !(displaySettings.showBottomPlayer || isBottomPanelOpen)
              ? 'translate-y-0 opacity-100'
              : 'translate-y-full opacity-0'
          }`}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              backgroundColor: accentHex,
              boxShadow: `0 0 10px ${accentHex}`,
            }}
          />
        </div>

        <div
          className={`player-panel pointer-events-auto absolute left-1/2 flex w-[900px] max-w-[90vw] -translate-x-1/2 items-center gap-6 rounded-2xl border border-white/10 px-6 py-3 backdrop-blur-[22px] transition-all duration-300 ${
            displaySettings.showBottomPlayer || isBottomPanelOpen
              ? 'bottom-[20px] translate-y-0 opacity-100'
              : '-bottom-[20px] translate-y-full opacity-0'
          }`}
          style={{
            background: 'rgba(10, 14, 18, 0.4)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.10), 0 18px 50px rgba(0,0,0,0.3)',
          }}
        >
          <div className="flex shrink-0 items-center justify-center">
            <CoverArt
              src={currentCover}
              title={trackName}
              className="h-[48px] w-[48px] shadow-[0_4px_10px_rgba(0,0,0,0.28)]"
              iconSize={20}
            />
          </div>

          <div className="flex w-[200px] min-w-0 shrink-0 flex-col justify-center">
            <MarqueeTitle title={trackName} />
            <div className="mt-1 text-[10px] leading-4 tracking-[0.14em] text-white/45 uppercase">
              {songSourceLabel(currentSong)}
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex flex-1 items-center gap-3">
            <span className="w-[34px] shrink-0 text-right text-[10px] tracking-[0.1em] text-white/55 uppercase tabular-nums">
              {formatTime(currentTime)}
            </span>
            <div className="group relative flex h-[12px] flex-1 items-center">
              <div className="relative h-[2px] w-full overflow-hidden rounded-full bg-white/10 transition-all group-hover:h-[4px]">
                <div
                  className="absolute top-0 left-0 h-full"
                  style={{
                    backgroundColor: accentHex,
                    width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                    boxShadow: `0 0 10px ${accentHex}88`,
                  }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={duration || 100}
                step="0.01"
                value={currentTime}
                onChange={(e) => {
                  if (engine.audioElement) {
                    const newTime = parseFloat(e.target.value);
                    engine.audioElement.currentTime = newTime;
                    setCurrentTime(newTime);
                  }
                }}
                className="absolute bottom-0 left-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
            <span className="w-[34px] shrink-0 text-left text-[10px] tracking-[0.1em] text-white/55 uppercase tabular-nums">
              {formatTime(duration)}
            </span>
          </div>

          {/* Controls */}
          <div className="flex shrink-0 items-center justify-center gap-4 text-white/60">
            <button
              onClick={() => playFromQueue(-1)}
              className="transition-colors hover:text-white disabled:opacity-25 disabled:hover:text-inherit"
              disabled={getCurrentQueue().length === 0}
              title="Previous track"
            >
              <SkipBack size={16} />
            </button>
            <button
              onClick={togglePlay}
              className="transition-colors hover:text-white disabled:opacity-25 disabled:hover:text-inherit"
              disabled={trackName === 'No track selected'}
            >
              {isPlaying ? (
                <Pause size={16} className="fill-current" />
              ) : (
                <Play size={16} className="fill-current" />
              )}
            </button>
            <button
              onClick={() => playFromQueue(1)}
              className="transition-colors hover:text-white disabled:opacity-25 disabled:hover:text-inherit"
              disabled={getCurrentQueue().length === 0}
              title="Next track"
            >
              <SkipForward size={16} />
            </button>
            <button
              onClick={() => setPlayMode(nextPlayMode)}
              className="transition-colors hover:text-white"
              title={
                playMode === 'sequence'
                  ? t('ui.text.340', lang)
                  : playMode === 'shuffle'
                    ? t('ui.text.341', lang)
                    : t('ui.text.342', lang)
              }
              style={{
                color: playMode === 'sequence' ? undefined : accentHex,
              }}
            >
              {playMode === 'sequence' ? (
                <Repeat size={14} />
              ) : playMode === 'shuffle' ? (
                <Shuffle size={14} />
              ) : (
                <Repeat1 size={14} />
              )}
            </button>
          </div>

          <div className="ml-2 flex shrink-0 items-center justify-end gap-4 text-white/40">
            <button
              onClick={() =>
                setDisplaySettings((s) => ({
                  ...s,
                  showLyrics: !s.showLyrics,
                }))
              }
              className="flex w-4 items-center justify-center text-[13px] font-bold transition-colors hover:text-white"
              title={
                displaySettings.showLyrics
                  ? t('ui.text.99', lang)
                  : t('ui.text.100', lang)
              }
              style={{
                color: displaySettings.showLyrics ? accentHex : undefined,
              }}
            >
              {t('ui.text.101', lang)}
            </button>
            <button
              onClick={() => {
                const keys = Object.keys(themes);
                const themeKeys = [...keys, CUSTOM_THEME_ID];
                const currentIndex = themeKeys.indexOf(theme);
                const nextIndex =
                  currentIndex >= 0 ? (currentIndex + 1) % themeKeys.length : 0;
                onThemeChange(themeKeys[nextIndex]);
              }}
              className="transition-colors hover:text-white"
              title={t('ui.text.102', lang)}
            >
              <Palette size={16} />
            </button>
            <div className="group flex min-w-0 items-center justify-end gap-1.5">
              <Volume2
                size={16}
                className="flex-shrink-0 cursor-pointer opacity-50 transition-opacity hover:opacity-100"
                onClick={() => {
                  const val = volume > 0 ? 0 : 1;
                  engine.setVolume(val);
                  setVolume(val);
                  window.localStorage.setItem('sonic-volume', val.toString());
                }}
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  engine.setVolume(val);
                  setVolume(val);
                  window.localStorage.setItem('sonic-volume', val.toString());
                }}
                className="aspect-auto h-1 w-12 cursor-pointer appearance-none rounded-full bg-white/20 accent-current opacity-0 transition-opacity group-hover:opacity-100"
                style={{ accentColor: accentHex }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
