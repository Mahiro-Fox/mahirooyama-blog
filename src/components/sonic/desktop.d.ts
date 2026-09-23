export {};

declare global {
  interface Window {
    sonicDesktop?: {
      isDesktop: true;
      platform?: NodeJS.Platform;
      supportsSystemAudioLoopback?: boolean;
      minimize: () => Promise<void>;
      toggleMaximize: () => Promise<{ maximized: boolean }>;
      close: () => Promise<void>;
      startWindowDrag: (point: { screenX: number; screenY: number }) => Promise<{ ok: boolean }>;
      moveWindowDrag: (point: { screenX: number; screenY: number }) => Promise<{ ok: boolean }>;
      endWindowDrag: () => Promise<{ ok: boolean }>;
      openNeteaseLogin: () => Promise<{ ok?: boolean; cookie?: string; reused?: boolean; cancelled?: boolean; error?: string; message?: string }>;
      clearNeteaseLogin: () => Promise<{ ok: boolean }>;
      openQQLogin: () => Promise<{ ok?: boolean; cookie?: string; reused?: boolean; partial?: boolean; cancelled?: boolean; error?: string; message?: string }>;
      clearQQLogin: () => Promise<{ ok: boolean }>;
      openUpdateInstaller: (filePath: string) => Promise<{ ok?: boolean; error?: string }>;
      openUpdateRelease: (releaseUrl: string) => Promise<{ ok?: boolean; error?: string }>;
    };
  }
}
