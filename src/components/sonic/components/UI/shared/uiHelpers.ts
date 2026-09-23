/**
 * UI 层通用工具。
 * 包含站点基础路径、歌曲唯一标识与来源标签，以及把本地存储的触发器配置写回音频引擎的初始化逻辑。
 */
import { engine } from '../../../lib/audio/AudioEngine';
import {
  readTriggerSettingsStorage,
  type StoredTriggerConfig,
} from '../../../lib/settings/triggerSettings';
import type { NeteaseSong } from '../../../types';

export const baseUrl = process.env.NEXT_PUBLIC_BASE_PATH || '/';

export function songIdentity(song: Pick<NeteaseSong, 'id' | 'provider'>) {
  return `${song.provider || 'netease'}:${String(song.id)}`;
}

export function songSourceLabel(song: NeteaseSong | null) {
  if (!song) return 'Local Audio';
  return song.provider === 'qq' ? 'QQ Music' : 'Netease Cloud';
}

export function applyStoredTriggerConfig(
  config: typeof engine.pulseTrigger,
  stored?: Partial<StoredTriggerConfig>
) {
  if (!stored) return;
  if (typeof stored.enabled === 'boolean') config.enabled = stored.enabled;
  if (stored.mode === 'Auto Beat' || stored.mode === 'Advanced')
    config.mode = stored.mode;
  if (Number.isFinite(stored.freqIndex))
    config.freqIndex = Number(stored.freqIndex);
  if (Number.isFinite(stored.threshold))
    config.threshold = Number(stored.threshold);
  if (Number.isFinite(stored.sensitivity))
    config.sensitivity = Number(stored.sensitivity);
  if (Number.isFinite(stored.cooldown))
    config.cooldown = Number(stored.cooldown);
  if (Number.isFinite(stored.bandStart))
    config.bandStart = Number(stored.bandStart);
  if (Number.isFinite(stored.bandEnd)) config.bandEnd = Number(stored.bandEnd);
  if (Number.isFinite(stored.pulseStrength))
    config.pulseStrength = Number(stored.pulseStrength);
  if (typeof stored.autoTrack === 'boolean')
    config.autoTrack = stored.autoTrack;
}

export function loadStoredTriggerSettings() {
  const settings = readTriggerSettingsStorage();
  applyStoredTriggerConfig(engine.pulseTrigger, settings.Pulse);
  applyStoredTriggerConfig(engine.meteorTrigger, settings.Meteor);
}

// 模块加载时初始化引擎触发器配置（保持原模块顶层副作用语义）
loadStoredTriggerSettings();
