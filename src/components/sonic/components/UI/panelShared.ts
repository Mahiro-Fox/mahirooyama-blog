import type { CSSProperties } from 'react';
import { engine } from '../../lib/AudioEngine';
import type { StoredTriggerConfig } from '../../lib/triggerSettings';

export function colorWithAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const value = /^[0-9a-fA-F]{6}$/.test(normalized) ? normalized : '22d3ee';
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function rgbFromHex(hex: string) {
  const normalized = hex.replace('#', '');
  const value = /^[0-9a-fA-F]{6}$/.test(normalized) ? normalized : '22d3ee';
  return {
    red: parseInt(value.slice(0, 2), 16),
    green: parseInt(value.slice(2, 4), 16),
    blue: parseInt(value.slice(4, 6), 16),
  };
}

export function relativeLuminanceFromHex(hex: string) {
  const { red, green, blue } = rgbFromHex(hex);
  const toLinear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue)
  );
}

export function readableAccentColor(accentHex: string, isLightSurface: boolean) {
  const { red, green, blue } = rgbFromHex(accentHex);
  const max = Math.max(red, green, blue) / 255;
  const min = Math.min(red, green, blue) / 255;
  const lightness = (max + min) / 2;
  const delta = max - min;
  let hue = 0;
  let saturation = 0;

  if (delta > 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    switch (max) {
      case red / 255:
        hue =
          ((green / 255 - blue / 255) / delta + (green < blue ? 6 : 0)) * 60;
        break;
      case green / 255:
        hue = ((blue / 255 - red / 255) / delta + 2) * 60;
        break;
      default:
        hue = ((red / 255 - green / 255) / delta + 4) * 60;
    }
  }

  const readableLightness = isLightSurface
    ? Math.min(lightness * 100, 34)
    : Math.max(lightness * 100, 62);
  const readableSaturation = Math.max(
    saturation * 100,
    isLightSurface ? 45 : 52
  );
  return `hsl(${Math.round(hue)} ${Math.round(readableSaturation)}% ${Math.round(readableLightness)}%)`;
}

export function themedPanelStyle(
  accentHex: string,
  opacity = 0.84
): CSSProperties {
  return {
    background: `linear-gradient(135deg, ${colorWithAlpha(accentHex, 0.11)}, rgba(8, 11, 16, ${opacity}) 34%, rgba(8, 11, 16, ${Math.min(opacity + 0.06, 0.96)}))`,
    borderColor: colorWithAlpha(accentHex, 0.24),
    boxShadow: `0 24px 70px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px ${colorWithAlpha(accentHex, 0.05)}`,
  };
}

export function activeControlStyle(accentHex: string): CSSProperties {
  return {
    backgroundColor: colorWithAlpha(accentHex, 0.16),
    borderColor: colorWithAlpha(accentHex, 0.45),
    color: accentHex,
  };
}

export function primaryGhostStyle(accentHex: string): CSSProperties {
  return {
    backgroundColor: colorWithAlpha(accentHex, 0.14),
    borderColor: colorWithAlpha(accentHex, 0.35),
    color: accentHex,
  };
}

export function snapshotTriggerConfig(
  config: typeof engine.pulseTrigger
): StoredTriggerConfig {
  return {
    enabled: config.enabled,
    mode: config.mode,
    freqIndex: config.freqIndex,
    threshold: config.threshold,
    sensitivity: config.sensitivity,
    cooldown: config.cooldown,
    bandStart: config.bandStart,
    bandEnd: config.bandEnd,
    pulseStrength: config.pulseStrength,
    autoTrack: config.autoTrack,
  };
}