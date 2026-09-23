export type AudioInputMode = 'player' | 'system' | 'microphone';

export type AudioInputDevice = {
  id: string;
  label: string;
};

export function normalizeAudioInputDevices(devices: MediaDeviceInfo[]): AudioInputDevice[] {
  let index = 0;
  return devices
    .filter((device) => device.kind === 'audioinput')
    .map((device) => {
      index += 1;
      return {
        id: device.deviceId,
        label: device.label || `Microphone ${index}`,
      };
    });
}

export async function listAudioInputDevices(): Promise<AudioInputDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return normalizeAudioInputDevices(devices);
}

export function hasMediaDeviceSupport(): boolean {
  return Boolean(navigator.mediaDevices?.getUserMedia);
}
