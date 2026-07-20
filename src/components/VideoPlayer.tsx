'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ArtPlayer from 'artplayer';
import Hls from 'hls.js';
import { toast } from 'sonner';

export interface MovieSource {
  name: string;
  url: string;
}

interface VideoPlayerProps {
  movieId: string;
  sources: MovieSource[];
}

interface SourceStatus {
  name: string;
  url: string;
  available: boolean;
}

export function VideoPlayer({ movieId, sources }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<ArtPlayer | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [sourcesStatus, setSourcesStatus] = useState<SourceStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasJumpedToProgress, setHasJumpedToProgress] = useState(false);

  const PROGRESS_KEY = `movie_progress_${movieId}`;

  const getProxyUrl = useCallback((url: string) => {
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  }, []);

  const checkSourceAvailability = useCallback(
    async (url: string) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(getProxyUrl(url), {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response.ok;
      } catch {
        return false;
      }
    },
    [getProxyUrl]
  );

  useEffect(() => {
    const checkAllSources = async () => {
      const statuses: SourceStatus[] = await Promise.all(
        sources.map(async (source) => ({
          ...source,
          available: await checkSourceAvailability(source.url),
        }))
      );
      setSourcesStatus(statuses);
    };

    checkAllSources();
  }, [sources, checkSourceAvailability]);

  useEffect(() => {
    if (!containerRef.current || sources.length === 0) return;

    const currentSource = sources[currentSourceIndex];
    const proxyUrl = getProxyUrl(currentSource.url);

    const art = new ArtPlayer({
      container: containerRef.current,
      url: proxyUrl,
      type: 'm3u8',
      autoplay: false,
      loop: false,
      volume: 0.8,
      muted: false,
      theme: '#ff6b35',
      lang: 'zh-CN',
      screenshot: true,
      flip: true,
      aspectRatio: true,
      fullscreen: true,
      subtitleOffset: true,
      miniProgressBar: true,
      playbackRate: true,
      controls: [
        {
          position: 'right',
          html: `<div class="artplayer-video-source-btn" style="color: #fff; cursor: pointer; padding: 0 10px; font-size: 12px;">
            ${currentSource.name}
          </div>`,
          click: () => {
            const menu = document.createElement('div');
            menu.style.cssText = `
              position: absolute;
              bottom: 100%;
              right: 0;
              background: rgba(0, 0, 0, 0.9);
              border-radius: 8px;
              padding: 8px;
              margin-bottom: 8px;
              z-index: 100;
              min-width: 150px;
            `;

            sourcesStatus.forEach((source, index) => {
              const item = document.createElement('div');
              item.style.cssText = `
                padding: 8px 12px;
                color: ${source.available ? '#fff' : '#666'};
                font-size: 12px;
                cursor: ${source.available ? 'pointer' : 'not-allowed'};
                border-radius: 4px;
                display: flex;
                justify-content: space-between;
                align-items: center;
              `;
              item.innerHTML = `
                <span>${source.name}${index === currentSourceIndex ? ' ✓' : ''}</span>
                ${!source.available ? '<span>[不可用]</span>' : ''}
              `;

              if (source.available) {
                item.onmouseenter = () => {
                  item.style.background = 'rgba(255, 107, 53, 0.3)';
                };
                item.onmouseleave = () => {
                  item.style.background = 'transparent';
                };
                item.onclick = () => {
                  setCurrentSourceIndex(index);
                  menu.remove();
                };
              }

              menu.appendChild(item);
            });
            if (art.controls.$parent) {
              art.controls.$parent.appendChild(menu);
            }
            const closeMenu = (e: MouseEvent) => {
              if (!menu.contains(e.target as Node)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
              }
            };

            setTimeout(() => {
              document.addEventListener('click', closeMenu);
            }, 0);
          },
        },
      ],
      icons: {
        loading: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle class="artplayer-loading-circle" cx="12" cy="12" r="10" stroke-dasharray="62.8318" stroke-dashoffset="62.8318" style="animation: artplayer-loading 1s linear infinite;"/></svg>`,
      },
    });

    artRef.current = art;

    let hls: Hls;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
      });

      hls.loadSource(proxyUrl);
      hls.attachMedia(art.video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (currentSourceIndex < sources.length - 1) {
                const nextIndex = currentSourceIndex + 1;
                toast.warning(
                  `当前线路不稳定，已自动为你切换至备用线路：${sources[nextIndex].name}`
                );
                setCurrentSourceIndex(nextIndex);
              } else {
                toast.error('所有线路均无法播放，请稍后重试');
              }
              break;
            default:
              break;
          }
        }
      });
    }

    art.on('ready', () => {
      const savedProgress = localStorage.getItem(PROGRESS_KEY);
      if (savedProgress && !hasJumpedToProgress) {
        const progress = parseFloat(savedProgress);
        if (progress > 0 && progress < art.duration) {
          const minutes = Math.floor(progress / 60);
          const seconds = Math.floor(progress % 60);
          toast.info(
            `已为你自动跳转至上次看到 ${minutes}:${seconds.toString().padStart(2, '0')}`
          );
          art.seek = progress;
          setHasJumpedToProgress(true);
        }
      }
    });

    let lastSaveTime = 0;
    art.on('timeupdate', () => {
      const currentTime = art.currentTime;
      const now = Date.now();

      if (now - lastSaveTime > 5000) {
        localStorage.setItem(PROGRESS_KEY, currentTime.toString());
        lastSaveTime = now;
      }
    });

    return () => {
      if (hls) {
        hls.destroy();
      }
      art.destroy();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    movieId,
    sources,
    currentSourceIndex,
    getProxyUrl,
    sourcesStatus,
    hasJumpedToProgress,
  ]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-2xl">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            <span className="text-sm text-gray-400">正在加载视频资源...</span>
          </div>
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
