import { useCallback, useState } from 'react';
import type { Language } from '../../lib/i18n';

// 更新功能（useUpdateController / updateApi）在 web 移植中跳过，
// 保留为空实现以维持 UI.tsx 的类型契约。

export function formatBytes(bytes: number | undefined): string {
  if (!Number.isFinite(bytes ?? NaN) || (bytes ?? 0) <= 0) return '0 B';
  const n = bytes as number;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  const value = n / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[i]}`;
}

export function useUpdateController(_lang: Language) {
  const [updateStatus] = useState('');
  const [isCheckingUpdate] = useState(false);
  const [availableUpdate] = useState<null>(null);
  const [showUpdatePrompt] = useState(false);
  const [downloadJob] = useState<null>(null);
  const [showUpdateReleaseFallback] = useState(false);

  const checkForUpdate = useCallback((_opts?: unknown) => {}, []);
  const startUpdateDownload = useCallback((_job?: unknown) => {}, []);
  const openUpdateRelease = useCallback(() => {}, []);
  const remindUpdateLater = useCallback(() => {}, []);
  const skipThisUpdateVersion = useCallback(() => {}, []);

  return {
    updateStatus,
    isCheckingUpdate,
    availableUpdate,
    showUpdatePrompt,
    downloadJob,
    showUpdateReleaseFallback,
    checkForUpdate,
    startUpdateDownload,
    openUpdateRelease,
    remindUpdateLater,
    skipThisUpdateVersion,
  };
}