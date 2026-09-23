export type PlayMode = 'sequence' | 'shuffle' | 'repeat-one';

const PLAY_MODE_ORDER: PlayMode[] = ['sequence', 'shuffle', 'repeat-one'];

export function nextPlayMode(mode: PlayMode): PlayMode {
  const index = PLAY_MODE_ORDER.indexOf(mode);
  return PLAY_MODE_ORDER[(index + 1) % PLAY_MODE_ORDER.length];
}

export function isRepeatOneMode(mode: PlayMode) {
  return mode === 'repeat-one';
}
