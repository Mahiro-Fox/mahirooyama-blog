/**
 * 音频输入控制 hook。
 * 负责枚举音频输入设备、切换播放/系统音频/麦克风三种输入模式，并处理设备热插拔与断开回落。
 */
import { useEffect, useState } from 'react';
import { engine } from '../../../lib/audio/AudioEngine';
import {
  hasMediaDeviceSupport,
  listAudioInputDevices,
  type AudioInputDevice,
  type AudioInputMode,
} from '../../../lib/audio/audioInput';

interface AudioInputControllerOptions {
  currentTrackName: string;
  hasCurrentSong: boolean;
  onPrepareExternalInput: (label: string, mode: AudioInputMode) => void;
  onResetDisconnectedInput: () => void;
  onReturnToPlayer: () => void;
  onClosePanel: () => void;
}

/**
 * 管理外部音频输入（系统音频回环 / 麦克风）的枚举、切换与状态提示。
 *
 * @param options.currentTrackName 当前曲名，用于判断是否仍停留在外部输入
 * @param options.hasCurrentSong 当前是否有真实曲目，决定断开时是否回落到播放器
 * @param options.onPrepareExternalInput 切换到外部输入时通知外层更新界面标题
 * @param options.onResetDisconnectedInput 设备断开时的重置回调
 * @param options.onReturnToPlayer 回落到播放器输入时的回调
 * @param options.onClosePanel 成功开启输入后关闭面板
 */
export function useAudioInputController(options: AudioInputControllerOptions) {
  const [audioInputMode, setAudioInputMode] =
    useState<AudioInputMode>('player');
  const [audioInputDevices, setAudioInputDevices] = useState<
    AudioInputDevice[]
  >([]);
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
      if (!selectedAudioInputId && devices[0])
        setSelectedAudioInputId(devices[0].id);
      if (
        selectedAudioInputId &&
        !devices.some((device) => device.id === selectedAudioInputId)
      ) {
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
    return () =>
      mediaDevices.removeEventListener(
        'devicechange',
        refreshAudioInputDevices
      );
  }, [selectedAudioInputId, audioInputMode]);

  useEffect(() => () => engine.stopExternalInput(), []);

  const prepare = (label: string, mode: AudioInputMode) => {
    setAudioInputMode(mode);
    options.onPrepareExternalInput(label, mode);
  };

  const startSystemAudioInput = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setAudioInputStatus(
        'System audio capture is not available in this environment.'
      );
      return;
    }
    if (
      window.sonicDesktop?.isDesktop &&
      !window.sonicDesktop.supportsSystemAudioLoopback
    ) {
      setAudioInputStatus(
        'System audio capture is currently supported on Windows.'
      );
      return;
    }
    try {
      setAudioInputStatus('Starting system audio...');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
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
      setAudioInputStatus(
        'Microphone capture is not available in this environment.'
      );
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
      prepare(
        device?.label ? `Mic: ${device.label}` : 'Microphone Input',
        'microphone'
      );
      setAudioInputStatus(
        device?.label
          ? `Listening to ${device.label}.`
          : 'Listening to microphone.'
      );
      options.onClosePanel();
    } catch (error) {
      console.warn('Unable to start microphone input:', error);
      setAudioInputStatus(
        'Unable to start microphone input. Check device permission.'
      );
    }
  };

  const returnToPlayerInput = () => {
    engine.stopExternalInput();
    setAudioInputMode('player');
    setAudioInputStatus('');
    if (
      !options.hasCurrentSong &&
      (options.currentTrackName === 'System Audio Input' ||
        options.currentTrackName === 'Microphone Input' ||
        options.currentTrackName.startsWith('Mic: '))
    )
      options.onReturnToPlayer();
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
