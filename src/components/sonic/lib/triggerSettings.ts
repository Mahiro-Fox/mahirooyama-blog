import type { TriggerPreset } from './AudioEngine';

export const TRIGGER_SETTINGS_STORAGE_KEY = 'sonic-topography-trigger-settings-v1';

export interface StoredTriggerConfig {
  enabled: boolean;
  mode: TriggerPreset;
  freqIndex: number;
  threshold: number;
  sensitivity: number;
  cooldown: number;
  bandStart: number;
  bandEnd: number;
  pulseStrength: number;
  autoTrack: boolean;
}

export interface StoredTriggerSettings {
  Pulse?: Partial<StoredTriggerConfig>;
  Meteor?: Partial<StoredTriggerConfig>;
}

export function normalizeTriggerConfig(value: Partial<StoredTriggerConfig> | undefined) {
  if (!value) return {};

  return {
    ...(typeof value.enabled === 'boolean' ? { enabled: value.enabled } : {}),
    ...(value.mode === 'Auto Beat' || value.mode === 'Advanced' ? { mode: value.mode } : {}),
    ...(Number.isFinite(value.freqIndex) ? { freqIndex: Number(value.freqIndex) } : {}),
    ...(Number.isFinite(value.threshold) ? { threshold: clamp(Number(value.threshold), 0, 1) } : {}),
    ...(Number.isFinite(value.sensitivity) ? { sensitivity: clamp(Number(value.sensitivity), 0, 1) } : {}),
    ...(Number.isFinite(value.cooldown) ? { cooldown: Math.max(0, Math.min(300, Math.round(Number(value.cooldown)))) } : {}),
    ...(Number.isFinite(value.bandStart) ? { bandStart: clampInt(Number(value.bandStart), 0, 250) } : {}),
    ...(Number.isFinite(value.bandEnd) ? { bandEnd: clampInt(Number(value.bandEnd), 2, 256) } : {}),
    ...(Number.isFinite(value.pulseStrength) ? { pulseStrength: clamp(Number(value.pulseStrength), 0, 5) } : {}),
    ...(typeof value.autoTrack === 'boolean' ? { autoTrack: value.autoTrack } : {}),
  };
}

export function readTriggerSettingsStorage(): StoredTriggerSettings {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(TRIGGER_SETTINGS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredTriggerSettings;
    return {
      Pulse: normalizeTriggerConfig(parsed.Pulse),
      Meteor: normalizeTriggerConfig(parsed.Meteor),
    };
  } catch (error) {
    console.warn('Unable to read trigger settings:', error);
    return {};
  }
}

export function writeTriggerSettingsStorage(settings: StoredTriggerSettings) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(TRIGGER_SETTINGS_STORAGE_KEY, JSON.stringify({
    Pulse: normalizeTriggerConfig(settings.Pulse),
    Meteor: normalizeTriggerConfig(settings.Meteor),
  }));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
