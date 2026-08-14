import { ReactNode } from 'react';
import { getPublicMidis } from '@/actions/admin/midi-actions';
import { getDictionary } from '@/i18n/dictionary';
import { DictionaryProvider } from '@/i18n/dictionary-provider';

export const generateMetadata = async (params: Promise<{ lang: string }>) => {
  const { lang } = await params;
  const midiDictionary = await getDictionary(lang, 'midi');
  return {
    title: midiDictionary['midi.title'],
    description: midiDictionary['midi.description'],
  };
};

interface MidiLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function MidiLayout({
  children,
  params,
}: MidiLayoutProps) {
  const { lang } = await params;
  const [midiDictionary, midiResult] = await Promise.all([
    getDictionary(lang, 'midi'),
    getPublicMidis(),
  ]);
  const midiFiles = midiResult.success ? midiResult.data : [];

  return (
    <DictionaryProvider dictionary={midiDictionary}>
      <div className="container-wrapper">
        <div className="container py-8">
          <div className="mb-8 flex flex-col gap-2">
            <h1 className="text-3xl font-medium tracking-tight">
              {midiDictionary['midi.title']}
            </h1>
            <p className="text-muted-foreground">
              <strong className="text-red-500">
                {midiDictionary['midi.notice']}
              </strong>
            </p>
            <p className="text-muted-foreground">
              {midiDictionary['midi.intro']}{' '}
              <a
                href="/blog/how-to-set-up-your-loopMIDI-to-play-piano-in-vrchat"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {midiDictionary['midi.setup_guide']}
              </a>
            </p>
            <p className="text-muted-foreground">
              {midiDictionary['midi.browser_notice']}
              <a
                href="/app.exe"
                download
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {midiDictionary['midi.desktop_download']}
              </a>
            </p>
          </div>

          {midiFiles.length > 0 && children}
        </div>
      </div>
    </DictionaryProvider>
  );
}
