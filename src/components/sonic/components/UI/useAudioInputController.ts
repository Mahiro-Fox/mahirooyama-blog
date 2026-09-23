import { useEffect, useState } from 'react';
import { engine } from '../../lib/AudioEngine';
import {
  hasMediaDeviceSupport,
  listAudioInputDevices,
  type AudioInputDevice,
  type AudioInputMode,
} from '../../lib/audioInput';

interface AudioInputControllerOptions {
  currentTrackName: string;
  hasCurrentSong: boolean;
  onPrepareExternalInput: (label: string, mode: AudioInputMode) => void;
  onResetDisconnectedInput: () => void;
  onReturnToPlayer: () => void;
  onClosePanel: () => void;
}

export function useAudioInputController(options: AudioInputControllerOptions) {
  const [audioInputMode, setAudioInputMode] = useState<AudioInputMode>('player');
  const [audioInputDevices, setAudioInputDevices] = useState<AudioInputDevice[]>([]);
  const [selectedAudioInputId, setSelectedAudioInputId] = useState('');
  const [audioInputStatus, setAudioInputStatus] = useState('');

  const refreshAudioInputDevices = async () => {
    if (!hasMediaDeviceSupport()) {
      setAudioInputDevices([]);
      return;
    }
    try {
      const devices = await listAudioInputDevices();
      setAudioInputDevices(devices);
      if (!selectedAudioInputId && devices[0]) setSelectedAudioInputId(devices[0].id);
      if (selectedAudioInputId && !devices.some((device) => device.id === selectedAudioInputId)) {
        setSelectedAudioInputId(devices[0]?.id || '');
        if (audioInputMode === 'microphone') {
          setAudioInputStatus('Microphone disconnected. Choose another input.');
          engine.stopExternalInput();
          setAudioInputMode('player');
          options.onResetDisconnectedInput();
        }
      }
    } catch (error) {
      console.warn('Unable to list audio input devices:', error);
      setAudioInputStatus('Unable to read audio input devices.');
    }
  };

  useEffect(() => {
    void refreshAudioInputDevices();
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.addEventListener) return;
    mediaDevices.addEventListener('devicechange', refreshAudioInputDevices);
    return () => mediaDevices.removeEventListener('devicechange', refreshAudioInputDevices);
  }, [selectedAudioInputId, audioInputMode]);

  useEffect(() => () => engine.stopExternalInput(), []);

  const prepare = (label: string, mode: AudioInputMode) => {
    setAudioInputMode(mode);
    options.onPrepareExternalInput(label, mode);
  };

  const startSystemAudioInput = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setAudioInputStatus('System audio capture is not available in this environment.');
      return;
    }
    if (window.sonicDesktop?.isDesktop && !window.sonicDesktop.supportsSystemAudioLoopback) {
      setAudioInputStatus('System audio capture is currently supported on Windows.');
      return;
    }
    try {
      setAudioInputStatus('Starting system audio...');
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      stream.getVideoTracks().forEach((track) => track.stop());
      if (stream.getAudioTracks().length === 0) {
        stream.getTracks().forEach((track) => track.stop());
        setAudioInputStatus('No system audio track was captured.');
        return;
      }
      engine.loadStream(stream, 'system');
      prepare('System Audio Input', 'system');
      setAudioInputStatus('Listening to system audio.');
      options.onClosePanel();
    } catch (error) {
      console.warn('Unable to start system audio input:', error);
      setAudioInputStatus('Unable to start system audio capture.');
    }
  };

  const startMicrophoneInput = async (deviceId = selectedAudioInputId) => {
    if (!hasMediaDeviceSupport()) {
      setAudioInputStatus('Microphone capture is not available in this environment.');
      return;
    }
    try {
      setAudioInputStatus('Starting microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        video: false,
      });
      await refreshAudioInputDevices();
      const device = audioInputDevices.find((item) => item.id === deviceId);
      engine.loadStream(stream, 'microphone');
      prepare(device?.label ? `Mic: ${device.label}` : 'Microphone Input', 'microphone');
      setAudioInputStatus(device?.label ? `Listening to ${device.label}.` : 'Listening to microphone.');
      options.onClosePanel();
    } catch (error) {
      console.warn('Unable to start microphone input:', error);
      setAudioInputStatus('Unable to start microphone input. Check device permission.');
    }
  };

  const returnToPlayerInput = () => {
    engine.stopExternalInput();
    setAudioInputMode('player');
    setAudioInputStatus('');
    if (!options.hasCurrentSong && (
      options.currentTrackName === 'System Audio Input'
      || options.currentTrackName === 'Microphone Input'
      || options.currentTrackName.startsWith('Mic: ')
    )) options.onReturnToPlayer();
  };

  return {
    audioInputMode,
    audioInputDevices,
    selectedAudioInputId,
    audioInputStatus,
    setAudioInputMode,
    setSelectedAudioInputId,
    setAudioInputStatus,
    refreshAudioInputDevices,
    startSystemAudioInput,
    startMicrophoneInput,
    returnToPlayerInput,
  };
}
