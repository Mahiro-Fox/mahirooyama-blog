import { getAllMidiFiles } from '@/lib/midi-files';

import { MidiPlayerClient } from './midi-player-client';

export const metadata = {
  title: '中文吧自动钢琴',
  description: '中文吧自动钢琴 - Web MIDI Player with automatic piano playback',
};

export default async function MidiPage() {
  const midiFiles = await getAllMidiFiles();

  return (
    <div className="container-wrapper">
      <div className="container py-8">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-medium tracking-tight">
            中文吧自动钢琴
          </h1>
          <p className="text-muted-foreground">
            <strong className="text-red-500">注意:</strong> 请在启动 VRChat
            之前先打开 loopMIDI。
          </p>
          <p className="text-muted-foreground">
            这是一个通过 loopMIDI 实现自动钢琴播放的 Web MIDI
            播放器，设置指南请查看:{' '}
            <a
              href="https://github.com/mahirooyama/mahirooyama-blog/blob/main/docs/midi-setup.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              MIDI 设置指南
            </a>
          </p>
        </div>

        <MidiPlayerClient initialFiles={midiFiles} />
      </div>
    </div>
  );
}
