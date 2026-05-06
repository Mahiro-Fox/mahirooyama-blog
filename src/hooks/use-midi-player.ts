'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { MidiFile } from '@/lib/midi-files';

// MIDI Parser Types
interface MidiEvent {
  deltaTime: number;
  type: string;
  channel?: number;
  noteNumber?: number;
  velocity?: number;
  data?: number[];
}

interface MidiTrack {
  events: MidiEvent[];
}

interface ParsedMidi {
  header: {
    format: number;
    numTracks: number;
    ticksPerBeat: number;
  };
  tracks: MidiTrack[];
}

// Simple MIDI file parser
function parseMidiFile(buffer: ArrayBuffer): ParsedMidi {
  const data = new Uint8Array(buffer);
  let pos = 0;

  function readUint32(): number {
    return (
      (data[pos++] << 24) |
      (data[pos++] << 16) |
      (data[pos++] << 8) |
      data[pos++]
    );
  }

  function readUint16(): number {
    return (data[pos++] << 8) | data[pos++];
  }

  function readVariableLength(): number {
    let value = 0;
    let byte;
    do {
      byte = data[pos++];
      value = (value << 7) | (byte & 0x7f);
    } while (byte & 0x80);
    return value;
  }

  // Read header
  const headerChunk = String.fromCharCode(...data.slice(pos, pos + 4));
  pos += 4;
  if (headerChunk !== 'MThd') {
    throw new Error('Invalid MIDI file: missing MThd header');
  }

  const headerLength = readUint32();
  pos += headerLength - 6;

  const format = readUint16();
  const numTracks = readUint16();
  const ticksPerBeat = readUint16();

  const tracks: MidiTrack[] = [];

  // Read tracks
  for (let i = 0; i < numTracks; i++) {
    const trackChunk = String.fromCharCode(...data.slice(pos, pos + 4));
    pos += 4;
    if (trackChunk !== 'MTrk') {
      throw new Error(`Invalid track header at track ${i}`);
    }

    const trackLength = readUint32();
    const trackEnd = pos + trackLength;
    const events: MidiEvent[] = [];
    let runningStatus = 0;

    while (pos < trackEnd) {
      const deltaTime = readVariableLength();
      const byte = data[pos++];

      // Meta event or SysEx
      if (byte === 0xff || byte === 0xf0 || byte === 0xf7) {
        if (byte === 0xff) {
          const length = readVariableLength();
          pos += length;
        } else {
          const length = readVariableLength();
          pos += length;
        }
        events.push({ deltaTime, type: 'meta' });
      } else {
        // MIDI channel event
        let status = byte;
        if ((byte & 0x80) === 0) {
          status = runningStatus;
          pos--;
        } else {
          runningStatus = status;
        }

        const type = status >> 4;
        const channel = status & 0x0f;

        let noteNumber: number | undefined;
        let velocity: number | undefined;

        if (type === 0x8 || type === 0x9) {
          noteNumber = data[pos++];
          velocity = data[pos++];
        } else if (type === 0xa || type === 0xb || type === 0xe) {
          pos += 2;
        } else if (type === 0xc || type === 0xd) {
          pos += 1;
        }

        events.push({
          deltaTime,
          type: type === 0x9 && velocity && velocity > 0 ? 'noteOn' : 'noteOff',
          channel,
          noteNumber,
          velocity,
        });
      }
    }

    tracks.push({ events });
  }

  return {
    header: { format, numTracks, ticksPerBeat },
    tracks,
  };
}

export interface MidiPlayerState {
  currentPlayingId: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  duration: number;
  permissionStatus: 'pending' | 'granted' | 'denied';
  midiOutputs: string[];
}

export interface MidiPlayerActions {
  play: (file: MidiFile) => Promise<void>;
  stop: () => void;
  togglePlay: (file: MidiFile) => void;
}

export function useMidiPlayer(): MidiPlayerState & MidiPlayerActions {
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [midiAccess, setMidiAccess] = useState<MIDIAccess | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<
    'pending' | 'granted' | 'denied'
  >('pending');
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [midiOutputs, setMidiOutputs] = useState<string[]>([]);

  const playbackRef = useRef<{ stop: () => void } | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Request MIDI permission on mount
  useEffect(() => {
    const requestMidiAccess = async () => {
      try {
        if (
          typeof navigator === 'undefined' ||
          !('requestMIDIAccess' in navigator)
        ) {
          setPermissionStatus('denied');
          return;
        }

        const access = await navigator.requestMIDIAccess({ sysex: false });
        setMidiAccess(access);
        setPermissionStatus('granted');

        // Update outputs list
        const outputs = Array.from(access.outputs.values()) as Array<{
          name: string;
        }>;
        setMidiOutputs(outputs.map((o) => o.name));
      } catch (error) {
        console.error('MIDI access denied:', error);
        setPermissionStatus('denied');
      }
    };

    requestMidiAccess();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (playbackRef.current) {
        playbackRef.current.stop();
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (playbackRef.current) {
      playbackRef.current.stop();
      playbackRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setIsPlaying(false);
    setCurrentPlayingId(null);
    setProgress(0);
    setDuration(0);
  }, []);

  const play = useCallback(
    async (file: MidiFile) => {
      if (!midiAccess) {
        alert(
          'Web MIDI API not available or permission denied. Please allow MIDI access and refresh.'
        );
        return;
      }

      // Check if another file is playing
      if (currentPlayingId && currentPlayingId !== file.path) {
        const confirmed = confirm(
          'Another MIDI file is currently playing. Do you want to switch to the new file?'
        );
        if (!confirmed) {
          return;
        }
        // Stop current playback
        if (playbackRef.current) {
          playbackRef.current.stop();
          playbackRef.current = null;
        }
      }

      setIsLoading(true);

      try {
        // Fetch and parse MIDI file
        const response = await fetch(file.path);
        const arrayBuffer = await response.arrayBuffer();
        const parsedMidi = parseMidiFile(arrayBuffer);

        // Get MIDI output
        const outputs = Array.from(midiAccess.outputs.values());
        if (outputs.length === 0) {
          alert(
            'No MIDI output devices found. Please set up loopMIDI or another virtual MIDI device.'
          );
          setIsLoading(false);
          return;
        }

        const output = outputs[0];

        // Schedule playback
        const ticksPerBeat = parsedMidi.header.ticksPerBeat;
        const tempo = 500000; // Default 120 BPM
        const secondsPerTick = tempo / ticksPerBeat / 1000000;

        const scheduledEvents: { time: number; data: number[] }[] = [];

        // Collect all note events with timestamps
        for (const track of parsedMidi.tracks) {
          let trackTick = 0;
          for (const event of track.events) {
            if (event.type === 'noteOn' || event.type === 'noteOff') {
              trackTick += event.deltaTime;
              const time = trackTick * secondsPerTick * 1000;
              const status =
                event.type === 'noteOn'
                  ? 0x90 | (event.channel || 0)
                  : 0x80 | (event.channel || 0);
              scheduledEvents.push({
                time,
                data: [status, event.noteNumber || 0, event.velocity || 0],
              });
            } else {
              trackTick += event.deltaTime;
            }
          }
        }

        // Sort events by time
        scheduledEvents.sort((a, b) => a.time - b.time);

        // Calculate total duration
        const totalDuration =
          scheduledEvents.length > 0
            ? scheduledEvents[scheduledEvents.length - 1].time
            : 0;
        setDuration(totalDuration);

        // Playback control using setInterval for background playback support
        let isStopped = false;
        let eventIndex = 0;
        let playIntervalId: NodeJS.Timeout | null = null;
        const playbackStartTime = Date.now();
        let lastProcessedTime = 0;

        // Function to process events in a time window
        const processEvents = () => {
          if (isStopped) return;

          // Use Date.now() to get actual elapsed time (not affected by throttling as much as RAF)
          const now = Date.now() - playbackStartTime;

          // Detect if we missed a large chunk of time (tab was inactive)
          // and catch up by processing all missed events
          if (now > lastProcessedTime + 200) {
            // We missed more than 200ms, likely due to throttling
            console.log(
              `Catching up: ${now - lastProcessedTime}ms gap detected`
            );
          }

          // Process all events up to current time
          while (
            eventIndex < scheduledEvents.length &&
            scheduledEvents[eventIndex].time <= now
          ) {
            const event = scheduledEvents[eventIndex];
            const eventDelay = Math.max(0, event.time - (now - 16)); // Small buffer for timing
            try {
              // Send with timestamp for hardware scheduling
              output.send(event.data, performance.now() + eventDelay);
            } catch {
              // Ignore errors
            }
            eventIndex++;
          }

          lastProcessedTime = now;

          // Check if playback finished
          if (eventIndex >= scheduledEvents.length && !isStopped) {
            if (playIntervalId !== null) {
              clearInterval(playIntervalId);
              playIntervalId = null;
            }
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            setIsPlaying(false);
            setCurrentPlayingId(null);
            setProgress(0);
          }
        };

        // Start playback loop (16ms = ~60fps)
        playIntervalId = setInterval(processEvents, 16);

        // Start progress tracking
        progressIntervalRef.current = setInterval(() => {
          const elapsed = Date.now() - playbackStartTime;
          const newProgress =
            totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
          if (newProgress >= 100) {
            setProgress(100);
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
          } else {
            setProgress(newProgress);
          }
        }, 100);

        // Store stop function
        playbackRef.current = {
          stop: () => {
            isStopped = true;
            if (playIntervalId !== null) {
              clearInterval(playIntervalId);
              playIntervalId = null;
            }
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            // Send note-off for all notes (0-127) on all channels
            for (let channel = 0; channel < 16; channel++) {
              for (let note = 0; note < 128; note++) {
                try {
                  output.send([0x80 | channel, note, 0]);
                } catch {
                  // Ignore errors
                }
              }
            }
          },
        };

        setCurrentPlayingId(file.path);
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing MIDI file:', error);
        alert(
          'Failed to play MIDI file. The file may be corrupted or in an unsupported format.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [midiAccess, currentPlayingId]
  );

  const togglePlay = useCallback(
    (file: MidiFile) => {
      if (currentPlayingId === file.path && isPlaying) {
        stop();
      } else {
        play(file);
      }
    },
    [currentPlayingId, isPlaying, stop, play]
  );

  return {
    currentPlayingId,
    isPlaying,
    isLoading,
    progress,
    duration,
    permissionStatus,
    midiOutputs,
    play,
    stop,
    togglePlay,
  };
}
