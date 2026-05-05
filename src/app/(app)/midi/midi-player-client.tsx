'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  AlertCircle,
  Download,
  LocateFixed,
  Music,
  Pause,
  Play,
  Search,
} from 'lucide-react';

import type { MidiFile } from '@/lib/midi-files';
import { useMidiPlayer } from '@/hooks/use-midi-player';
import { Button } from '@/components/shadcn-ui/button';
import { Input } from '@/components/shadcn-ui/input';

interface MidiPlayerClientProps {
  initialFiles: MidiFile[];
}

// Format duration in seconds to mm:ss
function formatDuration(seconds: number): string {
  if (seconds <= 0) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function MidiPlayerClient({ initialFiles }: MidiPlayerClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);
  const currentIndexRef = useRef<number>(-1);

  const {
    currentPlayingId,
    isPlaying,
    isLoading,
    progress,
    duration,
    permissionStatus,
    midiOutputs,
    togglePlay,
  } = useMidiPlayer();

  // Filter files based on search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return initialFiles;
    const query = searchQuery.toLowerCase();
    return initialFiles.filter((file) =>
      file.name.toLowerCase().includes(query)
    );
  }, [initialFiles, searchQuery]);

  // Virtual list setup
  const virtualizer = useVirtualizer({
    count: filteredFiles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // Base row height
    measureElement: (element) => element.getBoundingClientRect().height,
  });

  // Find current playing index
  const currentPlayingIndex = useMemo(() => {
    if (!currentPlayingId) return -1;
    return filteredFiles.findIndex((file) => file.path === currentPlayingId);
  }, [filteredFiles, currentPlayingId]);

  // Update ref when current index changes
  useEffect(() => {
    currentIndexRef.current = currentPlayingIndex;
  }, [currentPlayingIndex]);

  // Handle download
  const handleDownload = (file: MidiFile) => {
    const link = document.createElement('a');
    link.href = file.path;
    link.download = file.name + '.mid';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Scroll to currently playing row
  const scrollToCurrent = () => {
    if (currentPlayingIndex >= 0 && virtualizer) {
      virtualizer.scrollToIndex(currentPlayingIndex, {
        align: 'center',
        behavior: 'smooth',
      });
    }
  };

  if (initialFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Music className="text-muted-foreground mb-4 h-12 w-12" />
        <p className="text-muted-foreground text-lg">No MIDI files found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {permissionStatus === 'denied' && (
        <div className="border-destructive/50 bg-destructive/10 mb-4 flex items-center gap-3 rounded-lg border p-4">
          <AlertCircle className="text-destructive h-5 w-5 shrink-0" />
          <div>
            <p className="text-destructive font-medium">MIDI Access Denied</p>
            <p className="text-destructive/80 text-sm">
              Web MIDI API permission was denied. Please allow MIDI access in
              your browser settings and refresh.
            </p>
          </div>
        </div>
      )}

      {permissionStatus === 'granted' && midiOutputs.length > 0 && (
        <div className="bg-muted/50 mb-4 rounded-lg p-4">
          <p className="text-muted-foreground text-sm">
            <span className="font-medium">MIDI Outputs:</span>{' '}
            {midiOutputs.join(', ') || 'None'}
          </p>
          <p className="text-muted-foreground text-xs">
            Make sure loopMIDI virtual port is running and connected to your
            piano software.
          </p>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search / 搜索"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        {currentPlayingId && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={scrollToCurrent}
            title="定位到当前播放"
            className="absolute top-1/2 right-2 h-7 w-7 -translate-y-1/2"
          >
            <LocateFixed className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="bg-card overflow-hidden rounded-lg border">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b px-4 py-3 text-sm font-medium">
          <div>Name</div>
          <div className="text-right">Duration</div>
          <div className="w-32 text-right">Action</div>
        </div>

        <div ref={parentRef} className="max-h-[60vh] overflow-auto">
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const file = filteredFiles[virtualItem.index];
              const isCurrentFile = currentPlayingId === file.path;
              const isCurrentlyPlaying = isCurrentFile && isPlaying;

              return (
                <div
                  key={file.path}
                  ref={virtualizer.measureElement}
                  data-index={virtualItem.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className={`hover:bg-muted/50 px-4 py-3 transition-colors ${
                    isCurrentFile ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <Music className="text-muted-foreground h-4 w-4 shrink-0" />
                      <span
                        className="max-w-[200px] truncate text-sm sm:max-w-[300px] md:max-w-[400px] lg:max-w-[500px]"
                        title={file.name}
                      >
                        {file.name}
                      </span>
                    </div>
                    <div className="text-muted-foreground w-16 text-right text-sm whitespace-nowrap">
                      {formatDuration(file.duration)}
                    </div>
                    <div className="flex w-32 items-center justify-end gap-2">
                      <Button
                        variant="default"
                        size="icon-sm"
                        onClick={() => handleDownload(file)}
                        title="Download"
                        className="h-8 w-8"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={isCurrentlyPlaying ? 'secondary' : 'default'}
                        size="sm"
                        onClick={() => togglePlay(file)}
                        disabled={isLoading && !isCurrentFile}
                        className="w-20"
                      >
                        {isLoading && isCurrentFile ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : isCurrentlyPlaying ? (
                          <>
                            <Pause className="mr-1 h-4 w-4" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="mr-1 h-4 w-4" />
                            Play
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  {/* Progress bar - only show for currently playing file */}
                  {isCurrentFile && isPlaying && duration > 0 && (
                    <div className="mt-2">
                      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full transition-all duration-100 ease-linear"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
