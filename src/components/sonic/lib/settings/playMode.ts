/**
 * 播放模式。
 * 定义顺序/随机/单曲循环三种模式及其切换与判定工具函数。
 */
export type PlayMode = 'sequence' | 'shuffle' | 'repeat-one';

const PLAY_MODE_ORDER: PlayMode[] = ['sequence', 'shuffle', 'repeat-one'];

export function nextPlayMode(mode: PlayMode): PlayMode {
  const index = PLAY_MODE_ORDER.indexOf(mode);
  return PLAY_MODE_ORDER[(index + 1) % PLAY_MODE_ORDER.length];
}

export function isRepeatOneMode(mode: PlayMode) {
  return mode === 'repeat-one';
}
