import fs from 'fs';
import path from 'path';
import { MIDI_DIR } from '@/constant/dir';

export interface MidiFile {
  name: string;
  path: string;
  duration: number; // duration in seconds
}

// MIDI parser to extract duration
function parseMidiDuration(buffer: Buffer): number {
  let pos = 0;
  const data = new Uint8Array(buffer);

  function readUint32(): number {
    if (pos + 4 > data.length) return 0;
    return (
      (data[pos++] << 24) |
      (data[pos++] << 16) |
      (data[pos++] << 8) |
      data[pos++]
    );
  }

  function readUint16(): number {
    if (pos + 2 > data.length) return 0;
    return (data[pos++] << 8) | data[pos++];
  }

  function readUint8(): number {
    if (pos >= data.length) return 0;
    return data[pos++];
  }

  function readVariableLength(): number {
    let value = 0;
    let byte;
    let count = 0;
    do {
      if (pos >= data.length || count > 4) return value; // Prevent infinite loop
      byte = data[pos++];
      value = (value << 7) | (byte & 0x7f);
      count++;
    } while (byte & 0x80);
    return value;
  }

  // Read header
  if (pos + 4 > data.length) return 0;
  const headerChunk = String.fromCharCode(...data.slice(pos, pos + 4));
  pos += 4;
  if (headerChunk !== 'MThd') {
    return 0;
  }

  const headerLength = readUint32();
  const format = readUint16();
  const numTracks = readUint16();
  const ticksPerBeat = readUint16();

  // Skip any extra header bytes if headerLength > 6
  if (headerLength > 6) {
    pos += headerLength - 6;
  }

  let maxTick = 0;
  let defaultTempo = 500000; // Default 120 BPM in microseconds per beat

  // Read tracks
  for (let i = 0; i < numTracks && pos < data.length; i++) {
    if (pos + 4 > data.length) break;
    const trackChunk = String.fromCharCode(...data.slice(pos, pos + 4));
    pos += 4;
    if (trackChunk !== 'MTrk') {
      continue;
    }

    const trackLength = readUint32();
    const trackEnd = pos + trackLength;
    let currentTick = 0;
    let runningStatus = 0;

    while (pos < trackEnd && pos < data.length) {
      const deltaTime = readVariableLength();
      currentTick += deltaTime;
      if (currentTick > maxTick) {
        maxTick = currentTick;
      }

      if (pos >= data.length) break;
      let byte = readUint8();

      // Meta event (0xFF)
      if (byte === 0xff) {
        if (pos >= data.length) break;
        const metaType = readUint8();
        const length = readVariableLength();
        if (metaType === 0x51 && length === 3 && pos + 3 <= data.length) {
          // Set Tempo
          defaultTempo =
            (data[pos] << 16) | (data[pos + 1] << 8) | data[pos + 2];
        }
        pos += length;
      }
      // SysEx (0xF0, 0xF7)
      else if (byte === 0xf0 || byte === 0xf7) {
        const length = readVariableLength();
        pos += length;
      }
      // MIDI channel event
      else {
        let status = byte;
        // Running status: if high bit is not set, use previous status
        if ((byte & 0x80) === 0) {
          status = runningStatus;
          // Don't consume next byte, it was the first data byte
        } else {
          runningStatus = status;
        }

        const type = status >> 4;
        const channel = status & 0x0f;

        // Skip data bytes based on message type
        if (
          type === 0x8 ||
          type === 0x9 ||
          type === 0xa ||
          type === 0xb ||
          type === 0xe
        ) {
          // Note Off, Note On, Poly Pressure, Control Change, Pitch Bend: 2 data bytes
          pos += (byte & 0x80) === 0 ? 1 : 2; // Running status uses 1 less byte
        } else if (type === 0xc || type === 0xd) {
          // Program Change, Channel Pressure: 1 data byte
          pos += (byte & 0x80) === 0 ? 0 : 1; // Running status uses 1 less byte
        } else if (type === 0xf) {
          // System messages (shouldn't appear in files, but handle them)
          const systemType = status & 0x0f;
          if (systemType === 0x2) {
            // Song Position Pointer: 2 bytes
            pos += 2;
          } else if (systemType === 0x3) {
            // Song Select: 1 byte
            pos += 1;
          }
          // Other system messages have no data bytes
        }
      }
    }

    // Ensure we don't get stuck due to parsing errors
    if (pos > trackEnd) {
      pos = trackEnd;
    }
  }

  // Convert ticks to seconds
  if (ticksPerBeat === 0) return 0;
  const secondsPerTick = defaultTempo / ticksPerBeat / 1000000;
  return Math.round(maxTick * secondsPerTick);
}

export async function getAllMidiFiles(): Promise<MidiFile[]> {
  try {
    await fs.promises.access(MIDI_DIR);
  } catch {
    return [];
  }

  const files = await getMidiFiles();
  const midiFiles = await Promise.all(
    files.map((file) => readMidiFile(path.join(MIDI_DIR, file)))
  );

  // Sort alphabetically by name
  return midiFiles.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

async function getMidiFiles(): Promise<string[]> {
  const entries = await fs.promises.readdir(MIDI_DIR, {
    withFileTypes: true,
  });
  return entries
    .filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.mid')
    )
    .map((entry) => entry.name);
}

async function readMidiFile(filePath: string): Promise<MidiFile> {
  const fileName = path.basename(filePath);

  // Read file and parse duration
  const buffer = await fs.promises.readFile(filePath);
  const duration = parseMidiDuration(buffer);

  return {
    name: fileName.replace(/\.mid$/i, ''),
    path: `/midisongs/${fileName}`,
    duration,
  };
}
