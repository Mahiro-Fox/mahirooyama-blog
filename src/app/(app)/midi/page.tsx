import { getAllMidiFiles } from '@/lib/midi-files';

import { MidiPlayerClient } from './midi-player-client';

export const metadata = {
  title: 'MIDI Player',
  description: 'Web MIDI Player with automatic piano playback',
};

export default async function MidiPage() {
  const midiFiles = await getAllMidiFiles();

  return (
    <div className="container-wrapper">
      <div className="container py-8">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-medium tracking-tight">MIDI Player</h1>
          <p className="text-muted-foreground">
            Web MIDI Player for automatic piano playback via loopMIDI, here is
            the setup guide:{' '}
            <a
              href="https://github.com/mahirooyama/mahirooyama-blog/blob/main/docs/midi-setup.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              MIDI Setup Guide
            </a>
          </p>
        </div>

        <MidiPlayerClient initialFiles={midiFiles} />
      </div>
    </div>
  );
}
