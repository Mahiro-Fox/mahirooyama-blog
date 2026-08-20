import fs from 'fs';
import path from 'path';
import { MIDI_DIR } from '@/constant/dir';
import { ensureDirectory } from '@/utils/file-utils';

/**
 * 解析 MIDI 文件总时长（秒）
 *
 * 支持：
 * - Standard MIDI File (SMF) format 0 / 1
 * - Tempo Change（0xFF 0x51）
 * - 多 Track 合并时间线
 *
 * 不支持：
 * - SMPTE time division（极少见）
 *
 * 返回：
 * - MIDI 总时长（秒）
 */

export function parseMidiDuration(buffer: Buffer): number {
  let offset = 0;

  function readUInt32(): number {
    const value = buffer.readUInt32BE(offset);
    offset += 4;
    return value;
  }

  function readUInt16(): number {
    const value = buffer.readUInt16BE(offset);
    offset += 2;
    return value;
  }

  function readString(length: number): string {
    const value = buffer.toString('ascii', offset, offset + length);
    offset += length;
    return value;
  }

  function readVarLen(trackBuffer: Buffer, state: { pos: number }): number {
    let value = 0;

    while (true) {
      const b = trackBuffer[state.pos++];
      value = (value << 7) | (b & 0x7f);

      if ((b & 0x80) === 0) {
        break;
      }
    }

    return value;
  }

  // -------------------------
  // Header Chunk
  // -------------------------

  const headerId = readString(4);

  if (headerId !== 'MThd') {
    throw new Error('Invalid MIDI file');
  }

  const headerLength = readUInt32();

  if (headerLength < 6) {
    throw new Error('Invalid MIDI header length');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const format = readUInt16(); // 此处误删，保留
  const trackCount = readUInt16();
  const division = readUInt16();

  // 跳过额外 header 数据
  offset += headerLength - 6;

  // 不支持 SMPTE timing
  if ((division & 0x8000) !== 0) {
    throw new Error('SMPTE time division is not supported');
  }

  const ticksPerQuarter = division;

  type MidiEvent = {
    tick: number;
    type: 'tempo' | 'end';
    tempo?: number;
  };

  const events: MidiEvent[] = [];

  let maxTick = 0;

  // 默认 tempo = 120 BPM
  // 500000 microseconds per quarter note
  events.push({
    tick: 0,
    type: 'tempo',
    tempo: 500000,
  });

  // -------------------------
  // Parse Tracks
  // -------------------------

  for (let t = 0; t < trackCount; t++) {
    const trackId = readString(4);

    if (trackId !== 'MTrk') {
      throw new Error(`Invalid track header at track ${t}`);
    }

    const trackLength = readUInt32();

    const trackStart = offset;
    const trackEnd = trackStart + trackLength;

    const trackBuffer = buffer.subarray(trackStart, trackEnd);

    offset = trackEnd;

    const state = { pos: 0 };

    let currentTick = 0;
    let runningStatus = 0;

    while (state.pos < trackBuffer.length) {
      const delta = readVarLen(trackBuffer, state);

      currentTick += delta;

      if (currentTick > maxTick) {
        maxTick = currentTick;
      }

      let statusByte = trackBuffer[state.pos];

      // Running Status
      if (statusByte < 0x80) {
        if (runningStatus === 0) {
          throw new Error('Invalid running status');
        }

        statusByte = runningStatus;
      } else {
        state.pos++;
        runningStatus = statusByte;
      }

      // Meta Event
      if (statusByte === 0xff) {
        const metaType = trackBuffer[state.pos++];
        const length = readVarLen(trackBuffer, state);

        // Tempo Change
        if (metaType === 0x51 && length === 3) {
          const tempo =
            (trackBuffer[state.pos] << 16) |
            (trackBuffer[state.pos + 1] << 8) |
            trackBuffer[state.pos + 2];

          events.push({
            tick: currentTick,
            type: 'tempo',
            tempo,
          });
        }

        state.pos += length;
        continue;
      }

      // SysEx
      if (statusByte === 0xf0 || statusByte === 0xf7) {
        const length = readVarLen(trackBuffer, state);
        state.pos += length;
        continue;
      }

      // Channel Voice Messages
      const eventType = statusByte >> 4;

      // Program Change / Channel Pressure -> 1 data byte
      if (eventType === 0xc || eventType === 0xd) {
        if (trackBuffer[state.pos] >= 0x80) {
          // running status case already consumed none
        } else {
          state.pos += 1;
        }
      } else {
        // Others -> 2 data bytes
        if (trackBuffer[state.pos] >= 0x80) {
          // running status case
        } else {
          state.pos += 2;
        }
      }
    }
  }

  // -------------------------
  // 计算总时长
  // -------------------------

  const tempoEvents = events
    .filter((e): e is Required<MidiEvent> => e.type === 'tempo')
    .sort((a, b) => a.tick - b.tick);

  let totalSeconds = 0;

  for (let i = 0; i < tempoEvents.length; i++) {
    const current = tempoEvents[i];
    const nextTick =
      i + 1 < tempoEvents.length ? tempoEvents[i + 1].tick : maxTick;

    const deltaTicks = nextTick - current.tick;

    const secondsPerTick = current.tempo / 1_000_000 / ticksPerQuarter;

    totalSeconds += deltaTicks * secondsPerTick;
  }

  return Math.round(totalSeconds);
}

export async function getMidis(): Promise<string[]> {
  await ensureDirectory(MIDI_DIR);
  const entries = await fs.promises.readdir(MIDI_DIR, {
    withFileTypes: true,
  });
  return entries
    .filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.mid')
    )
    .map((entry) => entry.name);
}

export async function readMidiFile(filePath: string): Promise<MidiFile> {
  const fileName = path.basename(filePath);

  // Read file and parse duration
  const buffer = await fs.promises.readFile(filePath);
  const duration = parseMidiDuration(buffer);

  return {
    name: fileName.replace(/\.mid$/i, ''),
    path: `/uploads/midisongs/${fileName}`,
    duration,
  };
}
