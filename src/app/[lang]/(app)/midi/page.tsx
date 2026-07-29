import { getPublicMidis } from '@/actions/admin/midi-actions';

import { MidiPlayerClient } from './midi-player-client';

export default async function MidiPage() {
  const res = await getPublicMidis();
  const midiFiles = res.success ? res.data : [];

  return <MidiPlayerClient initialFiles={midiFiles} />;
}
