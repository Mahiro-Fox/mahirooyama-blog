/**
 * 歌词显示组件。
 * 解析 LRC 文本并按播放进度高亮当前行、自动滚动居中，支持逐字/弹跳/空间墙等多种样式。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { engine } from '../../../lib/audio/AudioEngine';
import { wrapLyricTextLines } from '../../../lib/lyrics/lyricLineWrapping';
import { parseLRC, type LyricLine } from '../../../lib/lyrics/lyrics';
import {
  type LyricsStyleType,
  type LyricStyleConfig,
} from '../../../lib/settings/lyricsSettings';

export type MergedLyricsConfig = LyricStyleConfig & { style: LyricsStyleType };

interface LyricsDisplayProps {
  lrcText: string;
  currentTime: number;
  accentHex?: string;
  isPlaying?: boolean;
  lyricsSettings: MergedLyricsConfig;
}

/**
 * 歌词显示：按播放进度高亮当前行并平滑滚动。
 *
 * @param lrcText LRC 格式歌词原文
 * @param currentTime 当前播放时间（秒），用于定位当前行
 * @param accentHex 高亮所用强调色
 * @param isPlaying 是否正在播放
 * @param lyricsSettings 歌词样式设置（样式类型、位置、字体、每行字数等）
 */
export const LyricsDisplay: React.FC<LyricsDisplayProps> = ({
  lrcText,
  currentTime,
  accentHex = '#00ffff',
  isPlaying = true,
  lyricsSettings,
}) => {
  const lyrics = useMemo(() => parseLRC(lrcText), [lrcText]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const activeTextRef = useRef<HTMLDivElement>(null);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    let newIndex = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time - 0.2) {
        // 0.2s anticipation
        newIndex = i;
      } else {
        break;
      }
    }
    setActiveIndex(newIndex);
  }, [currentTime, lyrics]);

  useEffect(() => {
    if (scrollWrapperRef.current && containerRef.current) {
      if (activeIndex !== -1) {
        const activeEl = scrollWrapperRef.current.children[
          activeIndex + 1
        ] as HTMLElement; // +1 for timeline line
        if (activeEl) {
          const containerCenter = containerRef.current.clientHeight / 2;
          const elTop = activeEl.offsetTop;
          const elHeight = activeEl.clientHeight;
          setOffsetY(containerCenter - elTop - elHeight / 2);
        }
      } else {
        // If before first lyric, show the first lyric a bit lower, or just center the top
        if (scrollWrapperRef.current.children.length > 1) {
          const firstEl = scrollWrapperRef.current.children[1] as HTMLElement;
          if (firstEl) {
            const containerCenter = containerRef.current.clientHeight / 2;
            const elTop = firstEl.offsetTop;
            // offset it so the first lyric is a bit below the center
            setOffsetY(containerCenter - elTop + 60);
          }
        } else {
          setOffsetY(0);
        }
      }
    }
  }, [activeIndex, currentTime]);

  const karaokeHex = lyricsSettings.followThemeKaraoke
    ? accentHex
    : lyricsSettings.karaokeColor;
  const renderWrappedLyricText = (text: string) =>
    wrapLyricTextLines(text, lyricsSettings.maxCharsPerLine).map(
      (line, lineIndex, lines) => (
        <React.Fragment key={`${lineIndex}-${line}`}>
          {Array.from(line).map((char: string, charIndex: number) => (
            <span
              key={`${lineIndex}-${charIndex}`}
              data-lyric-char="true"
              style={{ color: lyricsSettings.fontColor }}
            >
              {char}
            </span>
          ))}
          {lineIndex < lines.length - 1 && <br />}
        </React.Fragment>
      )
    );

  useEffect(() => {
    let animationFrameId: number;
    const activeLine = lyrics[activeIndex];
    const nextLine = lyrics[activeIndex + 1];
    if (!activeLine || lyricsSettings.style === 'dynamic-bounce') return; // handled separately

    const startTime = activeLine.time;
    const duration = nextLine ? nextLine.time - startTime : 4;

    const updateKaraoke = () => {
      if (activeTextRef.current && engine.audioElement) {
        const currentAudioTime = engine.audioElement.currentTime;
        let progress = 0;
        if (currentAudioTime >= startTime) {
          progress = Math.min(1, (currentAudioTime - startTime) / duration);
        }

        const container = activeTextRef.current
          .firstElementChild as HTMLElement;
        if (container) {
          const spans = container.querySelectorAll<HTMLElement>(
            '[data-lyric-char="true"]'
          );
          const totalChars = spans.length;
          if (totalChars > 0) {
            const fadeWindow = Math.max(3, totalChars * 0.15);
            const currentFloatIndex = progress * (totalChars + fadeWindow);
            for (let i = 0; i < totalChars; i++) {
              const span = spans[i];
              const diff = currentFloatIndex - i;
              let opacity = 0;
              if (diff >= fadeWindow) opacity = 1;
              else if (diff <= 0) opacity = 0;
              else opacity = diff / fadeWindow;

              const mixPercentage = (opacity * 100).toFixed(1);
              const newColor = `color-mix(in srgb, ${karaokeHex} ${mixPercentage}%, ${lyricsSettings.fontColor})`;
              if (span.style.color !== newColor) {
                span.style.color = newColor;
              }
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(updateKaraoke);
    };
    updateKaraoke();
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeIndex, lyrics, lyricsSettings, accentHex]);

  if (lyrics.length === 0) return null;

  if (lyricsSettings.style === 'spatial-wall') return null;

  if (lyricsSettings.style === 'dynamic-bounce') {
    return (
      <DynamicBounceLyrics
        lyrics={lyrics}
        activeIndex={activeIndex}
        lyricsSettings={lyricsSettings}
        accentHex={accentHex}
        isPlaying={isPlaying}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute top-[40vh] left-[80px] z-40 h-[60vh] w-[800px] -translate-y-1/2 overflow-hidden transition-all duration-1000 ease-out select-none ${isPlaying ? 'translate-x-0 opacity-100 blur-none' : '-translate-x-[20px] opacity-0 blur-sm'}`}
      style={{
        maskImage:
          'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
        WebkitMaskImage:
          'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
        perspective: '1200px',
        perspectiveOrigin: 'left center',
      }}
    >
      <div
        className="relative flex h-full w-full flex-col px-[40px]"
        style={{
          transform: 'rotateY(20deg) rotateX(5deg) translateZ(-50px)',
          transformOrigin: 'left center',
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          ref={scrollWrapperRef}
          className="relative flex w-full flex-col"
          style={{
            transform: `translateY(${offsetY}px)`,
            transition: 'transform 800ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          {/* Continuous vertical timeline line */}
          <div className="absolute top-0 bottom-0 left-[8px] w-[1px] bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.1)]"></div>

          {lyrics.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex;
            return (
              <div
                key={idx}
                className="relative w-full py-[14px] pl-[40px] transition-all duration-700 ease-out"
              >
                {/* Timeline Dot */}
                <div className="absolute top-1/2 left-[8px] z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                  {isActive ? (
                    <div
                      className="flex h-4 w-4 items-center justify-center rounded-full border-[2px] bg-black/50 transition-all duration-500 ease-out"
                      style={{
                        borderColor: accentHex,
                        color: accentHex,
                        boxShadow: `0 0 15px ${accentHex}88`,
                      }}
                    >
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: accentHex }}
                      ></div>
                    </div>
                  ) : (
                    <div
                      className="h-[3px] w-[3px] rounded-full bg-white/20 transition-all duration-500 ease-out"
                      style={{
                        boxShadow: isPast ? `0 0 5px ${accentHex}44` : 'none',
                        backgroundColor: isPast
                          ? accentHex
                          : 'rgba(255,255,255,0.2)',
                      }}
                    ></div>
                  )}
                </div>

                {/* Lyric Text Container */}
                <div
                  ref={isActive ? activeTextRef : null}
                  className={`relative whitespace-pre-wrap ${lyricsSettings.fontFamily === 'serif' ? 'font-serif' : 'font-sans'} tracking-[0.05em] ${
                    isActive
                      ? 'font-medium opacity-100'
                      : isPast
                        ? 'font-normal opacity-40 blur-[1px]'
                        : 'font-normal opacity-50'
                  }`}
                  style={{
                    fontSize: `${lyricsSettings.activeFontSize}px`,
                    transform: isActive
                      ? 'translateY(0) scale(1.05)'
                      : `translateY(0) scale(${lyricsSettings.inactiveFontSize / lyricsSettings.activeFontSize})`,
                    transformOrigin: 'left center',
                    transition:
                      'transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 700ms ease-out, filter 700ms ease-out',
                    willChange: 'transform, opacity',
                  }}
                >
                  {/* Base text with shadow */}
                  <div
                    style={{
                      color: lyricsSettings.fontColor,
                      textShadow: isActive
                        ? `0 0 20px ${lyricsSettings.followThemeGlow ? accentHex : lyricsSettings.glowColor}66, 0 2px 4px rgba(0,0,0,0.8)`
                        : '0 2px 4px rgba(0,0,0,0.8)',
                      transition: 'text-shadow 700ms ease-out',
                    }}
                  >
                    {renderWrappedLyricText(line.text)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const DynamicBounceLyrics: React.FC<{
  lyrics: LyricLine[];
  activeIndex: number;
  lyricsSettings: MergedLyricsConfig;
  accentHex: string;
  isPlaying: boolean;
}> = ({ lyrics, activeIndex, lyricsSettings, accentHex, isPlaying }) => {
  const activeTextRef = useRef<HTMLDivElement>(null);
  const activeLine = lyrics[activeIndex];
  const nextLine = lyrics[activeIndex + 1];

  const karaokeHex = lyricsSettings.followThemeKaraoke
    ? accentHex
    : lyricsSettings.karaokeColor;
  const renderWrappedLyricText = (text: string) =>
    wrapLyricTextLines(text, lyricsSettings.maxCharsPerLine).map(
      (line, lineIndex, lines) => (
        <React.Fragment key={`${lineIndex}-${line}`}>
          {Array.from(line).map((char: string, charIndex: number) => (
            <span
              key={`${lineIndex}-${charIndex}`}
              data-lyric-char="true"
              style={{ color: lyricsSettings.fontColor }}
            >
              {char}
            </span>
          ))}
          {lineIndex < lines.length - 1 && <br />}
        </React.Fragment>
      )
    );

  useEffect(() => {
    let animationFrameId: number;
    if (!activeLine) return;

    const startTime = activeLine.time;
    const duration = nextLine ? nextLine.time - startTime : 4;

    const updateEffects = () => {
      if (activeTextRef.current && engine.audioElement) {
        // 1. Bounce effect
        const data = engine.getAudioData();
        const rawEnergy = data[lyricsSettings.triggerBand as keyof typeof data];
        const energy = typeof rawEnergy === 'number' ? rawEnergy : 0;
        const scale = 1.0 + energy * 0.12;
        activeTextRef.current.style.transform = `scale(${scale})`;

        // 2. Karaoke highlight effect
        const currentAudioTime = engine.audioElement.currentTime;
        let progress = 0;
        if (currentAudioTime >= startTime) {
          progress = Math.min(1, (currentAudioTime - startTime) / duration);
        }

        const container = activeTextRef.current
          .firstElementChild as HTMLElement;
        if (container) {
          const spans = container.querySelectorAll<HTMLElement>(
            '[data-lyric-char="true"]'
          );
          const totalChars = spans.length;
          if (totalChars > 0) {
            const fadeWindow = Math.max(3, totalChars * 0.15);
            const currentFloatIndex = progress * (totalChars + fadeWindow);
            for (let i = 0; i < totalChars; i++) {
              const span = spans[i];
              const diff = currentFloatIndex - i;
              let opacity = 0;
              if (diff >= fadeWindow) opacity = 1;
              else if (diff <= 0) opacity = 0;
              else opacity = diff / fadeWindow;

              const mixPercentage = (opacity * 100).toFixed(1);
              const newColor = `color-mix(in srgb, ${karaokeHex} ${mixPercentage}%, ${lyricsSettings.fontColor})`;
              if (span.style.color !== newColor) {
                span.style.color = newColor;
              }
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(updateEffects);
    };
    updateEffects();
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    lyricsSettings.triggerBand,
    activeIndex,
    lyrics,
    lyricsSettings,
    accentHex,
    activeLine,
    nextLine,
  ]);

  if (!activeLine || activeIndex === -1) return null;

  const positionClasses =
    {
      'top-left': 'top-20 left-16 items-start justify-start text-left',
      'top-center':
        'top-20 left-1/2 -translate-x-1/2 items-center justify-start text-center',
      'top-right': 'top-20 right-16 items-end justify-start text-right',
      'center-left':
        'top-1/2 -translate-y-1/2 left-16 items-start justify-center text-left',
      center:
        'top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 items-center justify-center text-center',
      'center-right':
        'top-1/2 -translate-y-1/2 right-16 items-end justify-center text-right',
      'bottom-left': 'bottom-[20vh] left-16 items-start justify-end text-left',
      'bottom-center':
        'bottom-[20vh] left-1/2 -translate-x-1/2 items-center justify-end text-center',
      'bottom-right': 'bottom-[20vh] right-16 items-end justify-end text-right',
    }[lyricsSettings.position] ||
    'top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 items-center justify-center text-center';

  return (
    <div
      className={`pointer-events-none absolute z-40 flex flex-col transition-all duration-1000 ease-out select-none ${isPlaying ? 'opacity-100 blur-none' : 'opacity-0 blur-sm'} ${positionClasses}`}
    >
      <div
        ref={activeTextRef}
        className={`relative whitespace-pre-wrap ${lyricsSettings.fontFamily === 'serif' ? 'font-serif' : 'font-sans'} font-medium tracking-[0.05em]`}
        style={{
          fontSize: `${lyricsSettings.activeFontSize}px`,
          willChange: 'transform',
        }}
      >
        {/* Base text with shadow */}
        <div
          style={{
            color: lyricsSettings.fontColor,
            textShadow: `0 0 30px ${lyricsSettings.followThemeGlow ? accentHex : lyricsSettings.glowColor}99, 0 4px 10px rgba(0,0,0,0.9)`,
          }}
        >
          {renderWrappedLyricText(activeLine.text)}
        </div>
      </div>
    </div>
  );
};
