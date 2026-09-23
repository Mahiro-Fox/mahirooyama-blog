/**
 * 左侧导航栏。
 * 悬浮在画面左缘，提供可视化/设置/搜索/云音乐/歌单/音频输入等入口，底部含示例与本地文件导入，
 * 另含全屏与透视编辑模式的开关。
 */
import React from 'react';
import { setLanguage, t, useLanguage } from '../../../lib/i18n/i18n';
import { colorWithAlpha, themedPanelStyle } from '../shared/panelShared';
import { type CloudProvider } from '../shared/uiTypes';

/**
 * 左侧竖向导航栏（各功能入口 + 本地文件导入 + 全屏与透视编辑开关）。
 * 以鼠标移入展开、移出收起的方式交互，避免遮挡可视化画面。
 */
export function SidebarLeft({
  accentHex,
  closeFloatingPanels,
  fileInputRef,
  handleFileChange,
  isFullscreen,
  isLightSurface,
  isMobileSideNavOpen,
  isNeteaseCookieValid,
  isPerspectiveEditMode,
  isQQCookieValid,
  lastPointerUpTime,
  loadDemo,
  onPerspectiveEditModeChange,
  openAudioInputPanel,
  openCloudPanelDefault,
  openMobileSideNav,
  openOptionsPanel,
  openPlaylistPanel,
  openSearchPanel,
  setIsMobileSideNavOpen,
  sideNavActiveColor,
  toggleFullscreen,
}: {
  accentHex: string;
  closeFloatingPanels: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isFullscreen: boolean;
  isLightSurface: boolean;
  isMobileSideNavOpen: boolean;
  isNeteaseCookieValid: boolean;
  isPerspectiveEditMode?: boolean;
  isQQCookieValid: boolean;
  lastPointerUpTime: React.MutableRefObject<number>;
  loadDemo: () => Promise<void>;
  onPerspectiveEditModeChange?: (mode: boolean) => void;
  openAudioInputPanel: () => void;
  openCloudPanelDefault: (provider: CloudProvider) => void;
  openMobileSideNav: () => void;
  openOptionsPanel: () => void;
  openPlaylistPanel: () => void;
  openSearchPanel: () => void;
  setIsMobileSideNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sideNavActiveColor: string;
  toggleFullscreen: () => Promise<void>;
}) {
  const lang = useLanguage();
  return (
    <>
      {/* Sidebar Left */}
      <div
        className={`side-nav-trigger pointer-events-auto absolute top-0 left-0 z-[60] h-full transition-all ${isMobileSideNavOpen ? 'is-mobile-open' : ''}`}
        onMouseEnter={(e) => {
          // Do not open side nav if user is dragging (holding mouse button)
          if (e.buttons !== 0) return;
          // Do not open if user just released the mouse (e.g., just finished dragging the scene)
          if (Date.now() - lastPointerUpTime.current < 100) return;
          openMobileSideNav();
        }}
        onMouseLeave={() => setIsMobileSideNavOpen(false)}
      >
        <aside
          className={`side-nav-panel pointer-events-auto absolute top-0 left-0 flex h-full flex-col border-r ${isMobileSideNavOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300`}
          style={{
            ...themedPanelStyle(accentHex, isLightSurface ? 0.82 : 0.7),
            borderRightColor: colorWithAlpha(
              accentHex,
              isLightSurface ? 0.26 : 0.18
            ),
            boxShadow: `16px 0 50px rgba(0,0,0,${isLightSurface ? 0.18 : 0.2}), inset -1px 0 0 ${colorWithAlpha(accentHex, isLightSurface ? 0.14 : 0.08)}`,
          }}
        >
          <button
            onClick={closeFloatingPanels}
            className="mb-12 cursor-pointer text-[10px] tracking-[0.2em] uppercase opacity-100 transition-opacity"
            style={{ writingMode: 'vertical-rl', color: sideNavActiveColor }}
          >
            {t('nav.visualize', lang)}
          </button>
          <button
            onClick={openOptionsPanel}
            className="mb-12 flex cursor-pointer items-center justify-center gap-2 text-[10px] tracking-[0.2em] uppercase opacity-40 transition-opacity hover:opacity-100"
            style={{ writingMode: 'vertical-rl' }}
          >
            {t('nav.settings', lang)}
          </button>
          <button
            onClick={openSearchPanel}
            className="mb-12 flex cursor-pointer items-center justify-center gap-2 text-[10px] tracking-[0.2em] uppercase opacity-40 transition-opacity hover:opacity-100"
            style={{ writingMode: 'vertical-rl' }}
          >
            {t('nav.search', lang)}
          </button>
          {isNeteaseCookieValid && (
            <button
              onClick={() => openCloudPanelDefault('netease')}
              className="mb-12 flex cursor-pointer items-center justify-center gap-2 text-[10px] tracking-[0.2em] uppercase opacity-40 transition-opacity hover:opacity-100"
              style={{ writingMode: 'vertical-rl' }}
            >
              {t('nav.netease', lang)}
            </button>
          )}
          {isQQCookieValid && (
            <button
              onClick={() => openCloudPanelDefault('qq')}
              className="mb-12 flex cursor-pointer items-center justify-center gap-2 text-[10px] tracking-[0.2em] uppercase opacity-40 transition-opacity hover:opacity-100"
              style={{ writingMode: 'vertical-rl' }}
            >
              {t('nav.qqmusic', lang)}
            </button>
          )}
          <button
            onClick={openPlaylistPanel}
            className="mb-12 flex cursor-pointer items-center justify-center gap-2 text-[10px] tracking-[0.2em] uppercase opacity-40 transition-opacity hover:opacity-100"
            style={{ writingMode: 'vertical-rl' }}
          >
            {t('nav.playlist', lang)}
          </button>
          <button
            onClick={openAudioInputPanel}
            className="mb-12 flex cursor-pointer items-center justify-center gap-2 text-[10px] tracking-[0.2em] uppercase opacity-40 transition-opacity hover:opacity-100"
            style={{ writingMode: 'vertical-rl' }}
          >
            {t('nav.input', lang)}
          </button>

          <div className="side-nav-bottom mt-auto flex flex-col items-center gap-10">
            <button
              onClick={() => {
                loadDemo();
                setIsMobileSideNavOpen(false);
              }}
              className="cursor-pointer text-[10px] font-bold tracking-[0.2em] uppercase opacity-40 transition-opacity hover:opacity-100"
              style={{ writingMode: 'vertical-rl' }}
            >
              {t('nav.example', lang)}
            </button>
            <button
              onClick={() => {
                fileInputRef.current?.click();
                setIsMobileSideNavOpen(false);
              }}
              className="cursor-pointer text-[10px] tracking-[0.2em] uppercase opacity-40 transition-opacity hover:opacity-100"
              style={{ writingMode: 'vertical-rl' }}
            >
              {t('nav.upload', lang)}
            </button>
            <button
              onClick={() => {
                onPerspectiveEditModeChange?.(true);
                setIsMobileSideNavOpen(false);
              }}
              className={`cursor-pointer text-[10px] tracking-[0.2em] uppercase transition-opacity ${isPerspectiveEditMode ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}
              style={{ writingMode: 'vertical-rl' }}
            >
              {t('nav.perspective', lang)}
            </button>
            <button
              onClick={toggleFullscreen}
              className={`cursor-pointer text-[10px] tracking-[0.2em] uppercase transition-opacity ${isFullscreen ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}
              style={{ writingMode: 'vertical-rl' }}
            >
              {isFullscreen
                ? t('nav.exit_fullscreen', lang)
                : t('nav.fullscreen', lang)}
            </button>

            <button
              onClick={() => setLanguage(lang === 'zh' ? 'en' : 'zh')}
              className="mt-4 cursor-pointer text-[10px] font-bold tracking-[0.2em] uppercase opacity-40 transition-opacity hover:opacity-100"
              style={{
                writingMode: 'vertical-rl',
                color: sideNavActiveColor,
              }}
            >
              {t('nav.lang_toggle', lang)}
            </button>

            <div className="pointer-events-none mt-4 text-[14px] font-black tracking-[-1px] opacity-40 select-none">
              AJIN.
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept="audio/*,.lrc"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </aside>
      </div>
    </>
  );
}
