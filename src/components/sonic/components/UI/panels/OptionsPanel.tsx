/**
 * 设置总面板。
 * 作为设置入口的容器，用标签页组织并挂载各子面板（触发、浮块、地面均衡、配色、音频、账号、歌词、显示、音质），
 * 同时负责预设的导入导出。
 */
import React, { useRef, useState } from 'react';
import {
  createPresetTransferPackage,
  normalizePresetTransferPackage,
  type PresetTransferPackage,
} from '../../../lib/api/presetTransfer';
import { t, useLanguage } from '../../../lib/i18n/i18n';
import { type DisplaySettings } from '../../../lib/settings/displaySettings';
import { type StoredGroundEqSettings } from '../../../lib/settings/groundEqSettings';
import {
  DEFAULT_MAX_CHARS_PER_LINE,
  DEFAULT_SPATIAL_ORBIT_OFFSET,
  MAX_CHARS_PER_LINE_MAX,
  MAX_CHARS_PER_LINE_MIN,
  SPATIAL_ORBIT_OFFSET_MAX,
  SPATIAL_ORBIT_OFFSET_MIN,
  type LyricsSettings,
} from '../../../lib/settings/lyricsSettings';
import { type PlaybackQualitySettings } from '../../../lib/settings/playbackQuality';
import {
  type CustomThemeSettings,
  type ThemeRotationSettings,
} from '../../../lib/theme/themes';
import {
  activeControlStyle,
  primaryGhostStyle,
  themedPanelStyle,
} from '../shared/panelShared';
import { type OptionsTab } from '../shared/uiTypes';
import { AccountLoginPanel } from './AccountLoginPanel';
import { CustomColorPanel, ThrottledRangeInput } from './CustomColorPanel';
import { FloatingBlocksPanel } from './FloatingBlocksPanel';
import { FreqTriggerPanel } from './FreqTriggerPanel';
import { GroundEqPanel } from './GroundEqPanel';
import { PlaybackQualityPanel } from './PlaybackQualityPanel';

/**
 * 设置总面板：以标签页组织各子设置面板，并处理预设导入导出。
 * 因涉及的设置项与回调较多（登录凭证、主题、歌词、显示、音质等），统一点对点通过 props 传入。
 */
export function OptionsPanel({
  onClose,
  accentHex,
  neteaseCookie,
  setNeteaseCookie,
  onSaveCookie,
  onClearCookie,
  cookieStatus,
  isNeteaseCookieValid,
  isSyncingNeteaseCookie,
  qqCookie,
  setQQCookie,
  onSaveQQCookie,
  onClearQQCookie,
  qqCookieStatus,
  isQQCookieValid,
  isSyncingQQCookie,
  desktopLoginStatus,
  onDesktopNeteaseLogin,
  onDesktopQQLogin,
  updateStatus,
  isCheckingUpdate,
  onCheckUpdate,
  theme,
  customThemes,
  activeCustomThemeId,
  themeRotation,
  groundEqSettings,
  presetTransferStatus,
  setPresetTransferStatus,
  onImportPresetPackage,
  onThemeChange,
  onCustomThemesChange,
  onThemeRotationChange,
  onGroundEqSettingsChange,
  playbackQualitySettings,
  onPlaybackQualitySettingsChange,
  lyricsSettings,
  onLyricsSettingsChange,
  displaySettings,
  onDisplaySettingsChange,
  globalSceneSettings,
  onGlobalSceneSettingsChange,
  onNeteaseLoginSuccess,
}: {
  onClose: () => void;
  accentHex: string;
  neteaseCookie: string;
  setNeteaseCookie: (cookie: string) => void;
  onSaveCookie: () => void | Promise<void>;
  onClearCookie: () => void | Promise<void>;
  cookieStatus: string;
  isNeteaseCookieValid: boolean;
  isSyncingNeteaseCookie: boolean;
  qqCookie: string;
  setQQCookie: (cookie: string) => void;
  onSaveQQCookie: () => void | Promise<void>;
  onClearQQCookie: () => void | Promise<void>;
  qqCookieStatus: string;
  isQQCookieValid: boolean;
  isSyncingQQCookie: boolean;
  desktopLoginStatus: string;
  onDesktopNeteaseLogin: () => void | Promise<void>;
  onDesktopQQLogin: () => void | Promise<void>;
  updateStatus: string;
  isCheckingUpdate: boolean;
  onCheckUpdate: () => void | Promise<void>;
  theme: string;
  customThemes: CustomThemeSettings[];
  activeCustomThemeId: string;
  themeRotation: ThemeRotationSettings;
  groundEqSettings: StoredGroundEqSettings;
  presetTransferStatus: string;
  setPresetTransferStatus: (status: string) => void;
  onImportPresetPackage: (
    presetPackage: PresetTransferPackage
  ) => Promise<void>;
  onThemeChange: (theme: string) => void;
  onCustomThemesChange: (
    settings: CustomThemeSettings[],
    activeId?: string
  ) => void;
  onThemeRotationChange: (settings: ThemeRotationSettings) => void;
  onGroundEqSettingsChange: (settings: StoredGroundEqSettings) => void;
  playbackQualitySettings: PlaybackQualitySettings;
  onPlaybackQualitySettingsChange: (
    settings:
      | PlaybackQualitySettings
      | ((prev: PlaybackQualitySettings) => PlaybackQualitySettings)
  ) => void;
  lyricsSettings: LyricsSettings;
  onLyricsSettingsChange: (settings: LyricsSettings) => void;
  displaySettings: DisplaySettings;
  onDisplaySettingsChange: (
    settings: DisplaySettings | ((prev: DisplaySettings) => DisplaySettings)
  ) => void;
  globalSceneSettings: { rotationSpeed: number };
  onGlobalSceneSettingsChange: (patch: { rotationSpeed?: number }) => void;
  /** 网易云扫码登录成功回调（透传给账号面板） */
  onNeteaseLoginSuccess?: (cookie: string) => void | Promise<void>;
}) {
  const lang = useLanguage();
  const [activeTab, setActiveTab] = useState<OptionsTab>('Meteor');
  const [includeCookieInExport, setIncludeCookieInExport] = useState(false);
  const importPresetInputRef = useRef<HTMLInputElement>(null);
  const tabs: OptionsTab[] = [
    'Pulse',
    'Meteor',
    'FloatingBlocks',
    'GroundEq',
    'Color',
    'Audio',
    'Account',
    'Lyrics',
    'Display',
  ];
  const tabLabels: Partial<Record<OptionsTab, string>> = {
    Pulse: t('ui.text.109', lang),
    Meteor: t('ui.text.110', lang),
    GroundEq: t('ui.text.111', lang),
    Color: t('ui.text.112', lang),
    Account: t('ui.text.113', lang),
    Lyrics: t('ui.text.114', lang),
    Display: t('ui.text.115', lang),
  };

  const currentStyleConfig = lyricsSettings[lyricsSettings.style] ||
    (lyricsSettings as any)['songyancai'] || {
      activeFontSize: 32,
      inactiveFontSize: 18,
      fontColor: '#ffffff',
      glowColor: '#00ffff',
      followThemeGlow: true,
      karaokeColor: '#00ffff',
      followThemeKaraoke: true,
      position: 'center',
      triggerBand: 'subBass',
      fontFamily: 'serif',
      maxCharsPerLine: DEFAULT_MAX_CHARS_PER_LINE,
      spatialOrbitOffset: DEFAULT_SPATIAL_ORBIT_OFFSET,
    };
  const updateConfig = (updates: any) =>
    onLyricsSettingsChange({
      ...lyricsSettings,
      [lyricsSettings.style]: { ...currentStyleConfig, ...updates },
    });

  const exportPreset = () => {
    try {
      const presetPackage = createPresetTransferPackage({
        includeCookies: includeCookieInExport,
      });
      const blob = new Blob([JSON.stringify(presetPackage, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      link.href = url;
      link.download = `sonic-topography-presets-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setPresetTransferStatus(
        includeCookieInExport ? t('ui.text.116', lang) : t('ui.text.117', lang)
      );
    } catch (error) {
      console.warn('Unable to export presets:', error);
      setPresetTransferStatus(t('ui.text.118', lang));
    }
  };

  const importPresetFile = async (file: File | undefined) => {
    if (!file) return;

    try {
      setPresetTransferStatus(t('ui.text.119', lang));
      const text = await file.text();
      const parsed = JSON.parse(text);
      await onImportPresetPackage(normalizePresetTransferPackage(parsed));
    } catch (error) {
      console.warn('Unable to import presets:', error);
      setPresetTransferStatus(
        error instanceof Error ? error.message : t('ui.text.120', lang)
      );
    } finally {
      if (importPresetInputRef.current) importPresetInputRef.current.value = '';
    }
  };

  return (
    <div className="pointer-events-auto absolute top-4 left-4 z-[100]">
      <div
        className="themed-scrollbar max-h-[70vh] w-[min(840px,calc(100vw-140px))] transform overflow-y-auto rounded-sm border p-8 shadow-2xl transition-all"
        style={themedPanelStyle(accentHex, 0.88)}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-xl font-light tracking-widest text-white">
              {t('ui.text.121', lang)}
            </div>
            <div className="mt-2 text-[10px] tracking-[0.18em] text-white/35 uppercase">
              {t('ui.text.122', lang)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[10px] tracking-widest text-white/50 uppercase hover:text-white"
          >
            {t('ui.text.123', lang)}
          </button>
        </div>

        <div className="mb-6 rounded-sm border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[12px] tracking-[0.18em] text-white/70 uppercase">
                {t('ui.text.124', lang)}
              </div>
              <div className="mt-2 text-[11px] leading-relaxed text-white/45">
                {t('ui.text.125', lang)}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 rounded-sm border border-white/10 px-3 py-2 text-[10px] tracking-[0.12em] text-white/50 uppercase">
                <input
                  type="checkbox"
                  checked={includeCookieInExport}
                  onChange={(event) =>
                    setIncludeCookieInExport(event.target.checked)
                  }
                  className="h-3.5 w-3.5"
                  style={{ accentColor: accentHex }}
                />
                {t('ui.text.126', lang)}
              </label>
              <button
                type="button"
                onClick={exportPreset}
                className="rounded-sm border px-3 py-2 text-[10px] tracking-[0.15em] uppercase"
                style={primaryGhostStyle(accentHex)}
              >
                {t('ui.text.127', lang)}
              </button>
              <button
                type="button"
                onClick={() => importPresetInputRef.current?.click()}
                className="rounded-sm border border-white/10 px-3 py-2 text-[10px] tracking-[0.15em] text-white/55 uppercase transition-colors hover:text-white"
              >
                {t('ui.text.128', lang)}
              </button>
              <input
                ref={importPresetInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => importPresetFile(event.target.files?.[0])}
              />
            </div>
          </div>
          {presetTransferStatus && (
            <div className="mt-3 text-[11px] text-white/45">
              {presetTransferStatus}
            </div>
          )}
        </div>

        <div className="mb-6 flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-sm border px-3 py-1.5 text-[10px] tracking-widest uppercase transition-colors ${
                activeTab === tab
                  ? ''
                  : 'border-white/10 text-white/45 hover:bg-white/5 hover:text-white'
              }`}
              style={
                activeTab === tab ? activeControlStyle(accentHex) : undefined
              }
            >
              {tab === 'Audio'
                ? t('ui.text.129', lang)
                : tabLabels[tab] || t('ui.text.130', lang)}
            </button>
          ))}
        </div>

        {activeTab === 'FloatingBlocks' ? (
          <FloatingBlocksPanel
            accentHex={accentHex}
            groundEqSettings={groundEqSettings}
            onGroundEqSettingsChange={onGroundEqSettingsChange}
          />
        ) : activeTab === 'GroundEq' ? (
          <GroundEqPanel
            accentHex={accentHex}
            groundEqSettings={groundEqSettings}
            onGroundEqSettingsChange={onGroundEqSettingsChange}
          />
        ) : activeTab === 'Color' ? (
          <CustomColorPanel
            accentHex={accentHex}
            theme={theme}
            customThemes={customThemes}
            activeCustomThemeId={activeCustomThemeId}
            themeRotation={themeRotation}
            onThemeChange={onThemeChange}
            onCustomThemesChange={onCustomThemesChange}
            onThemeRotationChange={onThemeRotationChange}
          />
        ) : activeTab === 'Audio' ? (
          <PlaybackQualityPanel
            accentHex={accentHex}
            settings={playbackQualitySettings}
            onSettingsChange={onPlaybackQualitySettingsChange}
          />
        ) : activeTab === 'Account' ? (
          <AccountLoginPanel
            accentHex={accentHex}
            neteaseCookie={neteaseCookie}
            setNeteaseCookie={setNeteaseCookie}
            onSaveCookie={onSaveCookie}
            onClearCookie={onClearCookie}
            cookieStatus={cookieStatus}
            isNeteaseCookieValid={isNeteaseCookieValid}
            isSyncingNeteaseCookie={isSyncingNeteaseCookie}
            qqCookie={qqCookie}
            setQQCookie={setQQCookie}
            onSaveQQCookie={onSaveQQCookie}
            onClearQQCookie={onClearQQCookie}
            qqCookieStatus={qqCookieStatus}
            isQQCookieValid={isQQCookieValid}
            isSyncingQQCookie={isSyncingQQCookie}
            desktopLoginStatus={desktopLoginStatus}
            onDesktopNeteaseLogin={onDesktopNeteaseLogin}
            onDesktopQQLogin={onDesktopQQLogin}
            updateStatus={updateStatus}
            isCheckingUpdate={isCheckingUpdate}
            onCheckUpdate={onCheckUpdate}
            onNeteaseLoginSuccess={onNeteaseLoginSuccess}
          />
        ) : activeTab === 'Lyrics' ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 rounded-sm border border-white/5 bg-white/[0.02] p-4">
              <div>
                <div className="mb-3 text-[12px] tracking-[0.15em] text-white/70 uppercase">
                  {t('ui.text.131', lang)}
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-sm border px-4 py-2 text-[11px] tracking-widest uppercase transition-colors"
                    style={
                      lyricsSettings.style === 'songyancai'
                        ? activeControlStyle(accentHex)
                        : {
                            borderColor: 'rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.5)',
                          }
                    }
                    onClick={() =>
                      onLyricsSettingsChange({
                        ...lyricsSettings,
                        style: 'songyancai',
                      })
                    }
                  >
                    {t('ui.text.132', lang)}
                  </button>
                  <button
                    className="rounded-sm border px-4 py-2 text-[11px] tracking-widest uppercase transition-colors"
                    style={
                      lyricsSettings.style === 'dynamic-bounce'
                        ? activeControlStyle(accentHex)
                        : {
                            borderColor: 'rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.5)',
                          }
                    }
                    onClick={() =>
                      onLyricsSettingsChange({
                        ...lyricsSettings,
                        style: 'dynamic-bounce',
                      })
                    }
                  >
                    {t('ui.text.133', lang)}
                  </button>
                  <button
                    className="rounded-sm border px-4 py-2 text-[11px] tracking-widest uppercase transition-colors"
                    style={
                      lyricsSettings.style === 'spatial-wall'
                        ? activeControlStyle(accentHex)
                        : {
                            borderColor: 'rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.5)',
                          }
                    }
                    onClick={() =>
                      onLyricsSettingsChange({
                        ...lyricsSettings,
                        style: 'spatial-wall',
                      })
                    }
                  >
                    {t('ui.text.134', lang)}
                  </button>
                </div>
              </div>

              {(lyricsSettings.style === 'dynamic-bounce' ||
                lyricsSettings.style === 'spatial-wall') && (
                <>
                  <div className="h-[1px] w-full bg-white/5"></div>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <div className="mb-3 text-[12px] tracking-[0.15em] text-white/70 uppercase">
                        {t('ui.text.135', lang)}
                      </div>
                      <select
                        className="w-full rounded-sm border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-white/80 outline-none focus:border-white/30"
                        value={currentStyleConfig.position}
                        onChange={(e) =>
                          updateConfig({ position: e.target.value as any })
                        }
                      >
                        <option value="top-left">
                          {t('ui.text.136', lang)}
                        </option>
                        <option value="top-center">
                          {t('ui.text.137', lang)}
                        </option>
                        <option value="top-right">
                          {t('ui.text.138', lang)}
                        </option>
                        <option value="center-left">
                          {t('ui.text.139', lang)}
                        </option>
                        <option value="center">{t('ui.text.140', lang)}</option>
                        <option value="center-right">
                          {t('ui.text.141', lang)}
                        </option>
                        <option value="bottom-left">
                          {t('ui.text.142', lang)}
                        </option>
                        <option value="bottom-center">
                          {t('ui.text.143', lang)}
                        </option>
                        <option value="bottom-right">
                          {t('ui.text.144', lang)}
                        </option>
                      </select>
                    </div>
                    <div>
                      <div className="mb-3 text-[12px] tracking-[0.15em] text-white/70 uppercase">
                        {t('ui.text.145', lang)}
                      </div>
                      <select
                        className="w-full rounded-sm border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-white/80 outline-none focus:border-white/30"
                        value={currentStyleConfig.triggerBand}
                        onChange={(e) =>
                          updateConfig({ triggerBand: e.target.value as any })
                        }
                      >
                        <option value="subBass">
                          {t('ui.text.146', lang)}
                        </option>
                        <option value="bass">{t('ui.text.147', lang)}</option>
                        <option value="lowMid">{t('ui.text.148', lang)}</option>
                        <option value="mid">{t('ui.text.149', lang)}</option>
                        <option value="highMid">
                          {t('ui.text.150', lang)}
                        </option>
                        <option value="presence">
                          {t('ui.text.151', lang)}
                        </option>
                        <option value="brilliance">
                          {t('ui.text.152', lang)}
                        </option>
                        <option value="air">{t('ui.text.153', lang)}</option>
                      </select>
                    </div>
                  </div>
                  {lyricsSettings.style === 'spatial-wall' && (
                    <div>
                      <div className="mb-3 flex justify-between text-[12px] tracking-[0.15em] text-white/70 uppercase">
                        <span>{t('ui.text.154', lang)}</span>
                        <span className="text-white/40">
                          {currentStyleConfig.spatialOrbitOffset}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={SPATIAL_ORBIT_OFFSET_MIN}
                        max={SPATIAL_ORBIT_OFFSET_MAX}
                        value={currentStyleConfig.spatialOrbitOffset}
                        onChange={(e) =>
                          updateConfig({
                            spatialOrbitOffset: Number(e.target.value),
                          })
                        }
                        className="h-1 w-full appearance-none rounded-full bg-white/20 accent-current"
                        style={{ accentColor: accentHex }}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="h-[1px] w-full bg-white/5"></div>

              <div>
                <div className="mb-3 flex justify-between text-[12px] tracking-[0.15em] text-white/70 uppercase">
                  <span>{t('ui.text.155', lang)}</span>
                  <span className="text-white/40">
                    {currentStyleConfig.activeFontSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={16}
                  max={64}
                  value={currentStyleConfig.activeFontSize}
                  onChange={(e) =>
                    updateConfig({ activeFontSize: Number(e.target.value) })
                  }
                  className="h-1 w-full appearance-none rounded-full bg-white/20 accent-current"
                  style={{ accentColor: accentHex }}
                />
              </div>

              <div>
                <div className="mb-3 flex justify-between text-[12px] tracking-[0.15em] text-white/70 uppercase">
                  <span>{t('ui.text.156', lang)}</span>
                  <span className="text-white/40">
                    {currentStyleConfig.maxCharsPerLine}{' '}
                    {t('ui.text.157', lang)}
                  </span>
                </div>
                <input
                  type="range"
                  min={MAX_CHARS_PER_LINE_MIN}
                  max={MAX_CHARS_PER_LINE_MAX}
                  value={currentStyleConfig.maxCharsPerLine}
                  onChange={(e) =>
                    updateConfig({ maxCharsPerLine: Number(e.target.value) })
                  }
                  className="h-1 w-full appearance-none rounded-full bg-white/20 accent-current"
                  style={{ accentColor: accentHex }}
                />
              </div>

              <div className="h-[1px] w-full bg-white/5"></div>

              <div className="grid grid-cols-3 gap-8">
                <div>
                  <div className="mb-3 text-[12px] tracking-[0.15em] text-white/70 uppercase">
                    {t('ui.text.158', lang)}
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="relative h-8 w-8 overflow-hidden rounded-full border-[2px]"
                      style={{ borderColor: 'rgba(255,255,255,0.2)' }}
                    >
                      <input
                        type="color"
                        value={currentStyleConfig.fontColor}
                        onChange={(e) =>
                          updateConfig({ fontColor: e.target.value })
                        }
                        className="absolute inset-[-10px] h-[50px] w-[50px] cursor-pointer"
                      />
                    </div>
                    <span className="font-mono text-[10px] text-white/50 uppercase">
                      {currentStyleConfig.fontColor}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-[12px] tracking-[0.15em] text-white/70 uppercase">
                    {t('ui.text.159', lang)}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="relative h-8 w-8 overflow-hidden rounded-full border-[2px]"
                        style={{
                          borderColor: 'rgba(255,255,255,0.2)',
                          opacity: currentStyleConfig.followThemeKaraoke
                            ? 0.3
                            : 1,
                        }}
                      >
                        <input
                          type="color"
                          value={currentStyleConfig.karaokeColor}
                          onChange={(e) =>
                            updateConfig({ karaokeColor: e.target.value })
                          }
                          disabled={currentStyleConfig.followThemeKaraoke}
                          className="absolute inset-[-10px] h-[50px] w-[50px] cursor-pointer"
                        />
                      </div>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-[10px] tracking-widest text-white/50 uppercase transition-colors hover:text-white">
                      <input
                        type="checkbox"
                        checked={currentStyleConfig.followThemeKaraoke}
                        onChange={(e) =>
                          updateConfig({ followThemeKaraoke: e.target.checked })
                        }
                        className="h-3 w-3"
                        style={{ accentColor: accentHex }}
                      />
                      {t('ui.text.160', lang)}
                    </label>
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-[12px] tracking-[0.15em] text-white/70 uppercase">
                    {t('ui.text.161', lang)}
                  </div>
                  <div className="flex items-center gap-4">
                    <div
                      className="relative h-8 w-8 overflow-hidden rounded-full border-[2px]"
                      style={{
                        borderColor: 'rgba(255,255,255,0.2)',
                        opacity: currentStyleConfig.followThemeGlow ? 0.3 : 1,
                      }}
                    >
                      <input
                        type="color"
                        value={currentStyleConfig.glowColor}
                        onChange={(e) =>
                          updateConfig({ glowColor: e.target.value })
                        }
                        disabled={currentStyleConfig.followThemeGlow}
                        className="absolute inset-[-10px] h-[50px] w-[50px] cursor-pointer"
                      />
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-[10px] tracking-widest text-white/50 uppercase transition-colors hover:text-white">
                      <input
                        type="checkbox"
                        checked={currentStyleConfig.followThemeGlow}
                        onChange={(e) =>
                          updateConfig({ followThemeGlow: e.target.checked })
                        }
                        className="h-3 w-3"
                        style={{ accentColor: accentHex }}
                      />
                      {t('ui.text.162', lang)}
                    </label>
                  </div>
                </div>

                <div className="col-span-3">
                  <div className="mb-3 flex items-center justify-between text-[12px] tracking-[0.15em] text-white/70 uppercase">
                    <span>{t('ui.text.163', lang)}</span>
                    <span className="text-[10px] text-white/40">
                      {currentStyleConfig.fontFamily === 'serif'
                        ? t('ui.text.164', lang)
                        : t('ui.text.165', lang)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className={`flex-1 rounded-sm border py-2 font-serif text-[12px] tracking-widest transition-colors ${currentStyleConfig.fontFamily === 'serif' ? '' : 'border-white/10 text-white/50 hover:text-white'}`}
                      style={
                        currentStyleConfig.fontFamily === 'serif'
                          ? {
                              borderColor: accentHex,
                              color: accentHex,
                              boxShadow: `0 0 10px ${accentHex}33`,
                            }
                          : {}
                      }
                      onClick={() => updateConfig({ fontFamily: 'serif' })}
                    >
                      {t('ui.text.166', lang)}
                    </button>
                    <button
                      className={`flex-1 rounded-sm border py-2 font-sans text-[12px] tracking-widest transition-colors ${currentStyleConfig.fontFamily === 'sans-serif' ? '' : 'border-white/10 text-white/50 hover:text-white'}`}
                      style={
                        currentStyleConfig.fontFamily === 'sans-serif'
                          ? {
                              borderColor: accentHex,
                              color: accentHex,
                              boxShadow: `0 0 10px ${accentHex}33`,
                            }
                          : {}
                      }
                      onClick={() => updateConfig({ fontFamily: 'sans-serif' })}
                    >
                      {t('ui.text.167', lang)}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'Display' ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 rounded-sm border border-white/5 bg-white/[0.02] p-4">
              <div>
                <div className="mb-3 text-[12px] tracking-[0.15em] text-white/70 uppercase">
                  {t('ui.text.168', lang)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] tracking-widest text-white/50 uppercase transition-colors hover:text-white">
                    <input
                      type="checkbox"
                      checked={displaySettings.showLeftIcon}
                      onChange={(e) =>
                        onDisplaySettingsChange((s) => ({
                          ...s,
                          showLeftIcon: e.target.checked,
                        }))
                      }
                      className="h-3 w-3"
                      style={{ accentColor: accentHex }}
                    />
                    {t('ui.text.169', lang)}
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] tracking-widest text-white/50 uppercase transition-colors hover:text-white">
                    <input
                      type="checkbox"
                      checked={displaySettings.showRightIcon}
                      onChange={(e) =>
                        onDisplaySettingsChange((s) => ({
                          ...s,
                          showRightIcon: e.target.checked,
                        }))
                      }
                      className="h-3 w-3"
                      style={{ accentColor: accentHex }}
                    />
                    {t('ui.text.170', lang)}
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] tracking-widest text-white/50 uppercase transition-colors hover:text-white">
                    <input
                      type="checkbox"
                      checked={displaySettings.showBottomPlayer}
                      onChange={(e) =>
                        onDisplaySettingsChange((s) => ({
                          ...s,
                          showBottomPlayer: e.target.checked,
                        }))
                      }
                      className="h-3 w-3"
                      style={{ accentColor: accentHex }}
                    />
                    {t('ui.text.171', lang)}
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] tracking-widest text-white/50 uppercase transition-colors hover:text-white">
                    <input
                      type="checkbox"
                      checked={displaySettings.showLyrics}
                      onChange={(e) =>
                        onDisplaySettingsChange((s) => ({
                          ...s,
                          showLyrics: e.target.checked,
                        }))
                      }
                      className="h-3 w-3"
                      style={{ accentColor: accentHex }}
                    />
                    {t('ui.text.172', lang)}
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] tracking-widest text-white/50 uppercase transition-colors hover:text-white">
                    <input
                      type="checkbox"
                      checked={displaySettings.showCover}
                      onChange={(e) =>
                        onDisplaySettingsChange((s) => ({
                          ...s,
                          showCover: e.target.checked,
                        }))
                      }
                      className="h-3 w-3"
                      style={{ accentColor: accentHex }}
                    />
                    {t('ui.text.173', lang)}
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5 rounded-sm border border-white/5 bg-white/[0.02] p-4">
              <div>
                <div className="mb-3 text-[12px] tracking-[0.15em] text-white/70 uppercase">
                  {t('ui.text.174', lang)}
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] text-white/75">
                          {t('ui.text.175', lang)}
                        </div>
                        <div className="mt-1 text-[9px] text-white/35">
                          {t('ui.text.176', lang)}
                        </div>
                      </div>
                      <div className="text-[11px]" style={{ color: accentHex }}>
                        {globalSceneSettings.rotationSpeed.toFixed(2)}
                      </div>
                    </div>
                    <ThrottledRangeInput
                      min="0"
                      max="2"
                      step="0.05"
                      value={globalSceneSettings.rotationSpeed}
                      onChange={(val: number) =>
                        onGlobalSceneSettingsChange({ rotationSpeed: val })
                      }
                      className="mt-3 h-1 w-full accent-current"
                      style={{ accentColor: accentHex }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-sm border border-white/5 bg-white/[0.02] p-4">
              <div className="mb-1 text-[12px] tracking-[0.15em] text-white/70 uppercase">
                {t('ui.text.177', lang)}
              </div>
              <div className="mb-2 text-[10px] text-white/40">
                {t('ui.text.178', lang)}
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] tracking-widest text-white/50 uppercase">
                    {t('ui.text.179', lang)}
                  </div>
                  <input
                    type="text"
                    value={displaySettings.shortcuts?.playPause || 'Space'}
                    readOnly
                    placeholder={t('ui.text.180', lang)}
                    className="w-40 cursor-pointer rounded-sm border border-white/10 bg-black/20 px-3 py-1 text-center text-[11px] text-white/80 transition-colors outline-none focus:border-white/30"
                    onKeyDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const keys: string[] = [];
                      if (e.ctrlKey) keys.push('Ctrl');
                      if (e.altKey) keys.push('Alt');
                      if (e.shiftKey) keys.push('Shift');
                      if (
                        e.key !== 'Control' &&
                        e.key !== 'Alt' &&
                        e.key !== 'Shift' &&
                        e.key !== 'Meta'
                      ) {
                        const keyName =
                          e.code === 'Space'
                            ? 'Space'
                            : e.key.length === 1
                              ? e.key.toUpperCase()
                              : e.key;
                        keys.push(keyName);
                        onDisplaySettingsChange((s) => ({
                          ...s,
                          shortcuts: {
                            ...s.shortcuts,
                            playPause: keys.join('+'),
                          },
                        }));
                      }
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-[11px] tracking-widest text-white/50 uppercase">
                    {t('ui.text.181', lang)}
                  </div>
                  <input
                    type="text"
                    value={
                      displaySettings.shortcuts?.prevSong || 'Ctrl+ArrowLeft'
                    }
                    readOnly
                    placeholder={t('ui.text.182', lang)}
                    className="w-40 cursor-pointer rounded-sm border border-white/10 bg-black/20 px-3 py-1 text-center text-[11px] text-white/80 transition-colors outline-none focus:border-white/30"
                    onKeyDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const keys: string[] = [];
                      if (e.ctrlKey) keys.push('Ctrl');
                      if (e.altKey) keys.push('Alt');
                      if (e.shiftKey) keys.push('Shift');
                      if (
                        e.key !== 'Control' &&
                        e.key !== 'Alt' &&
                        e.key !== 'Shift' &&
                        e.key !== 'Meta'
                      ) {
                        const keyName =
                          e.code === 'Space'
                            ? 'Space'
                            : e.key.length === 1
                              ? e.key.toUpperCase()
                              : e.key;
                        keys.push(keyName);
                        onDisplaySettingsChange((s) => ({
                          ...s,
                          shortcuts: {
                            ...s.shortcuts,
                            prevSong: keys.join('+'),
                          },
                        }));
                      }
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-[11px] tracking-widest text-white/50 uppercase">
                    {t('ui.text.183', lang)}
                  </div>
                  <input
                    type="text"
                    value={
                      displaySettings.shortcuts?.nextSong || 'Ctrl+ArrowRight'
                    }
                    readOnly
                    placeholder={t('ui.text.184', lang)}
                    className="w-40 cursor-pointer rounded-sm border border-white/10 bg-black/20 px-3 py-1 text-center text-[11px] text-white/80 transition-colors outline-none focus:border-white/30"
                    onKeyDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const keys: string[] = [];
                      if (e.ctrlKey) keys.push('Ctrl');
                      if (e.altKey) keys.push('Alt');
                      if (e.shiftKey) keys.push('Shift');
                      if (
                        e.key !== 'Control' &&
                        e.key !== 'Alt' &&
                        e.key !== 'Shift' &&
                        e.key !== 'Meta'
                      ) {
                        const keyName =
                          e.code === 'Space'
                            ? 'Space'
                            : e.key.length === 1
                              ? e.key.toUpperCase()
                              : e.key;
                        keys.push(keyName);
                        onDisplaySettingsChange((s) => ({
                          ...s,
                          shortcuts: {
                            ...s.shortcuts,
                            nextSong: keys.join('+'),
                          },
                        }));
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5 rounded-sm border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <div className="text-[12px] tracking-[0.15em] text-white/70 uppercase">
                  {t('ui.text.185', lang)}
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-[11px] tracking-widest text-white/50 uppercase transition-colors hover:text-white">
                  <input
                    type="checkbox"
                    checked={displaySettings.clock.visible}
                    onChange={(e) =>
                      onDisplaySettingsChange((s) => ({
                        ...s,
                        clock: { ...s.clock, visible: e.target.checked },
                      }))
                    }
                    className="h-3 w-3"
                    style={{ accentColor: accentHex }}
                  />
                  {t('ui.text.186', lang)}
                </label>
              </div>

              <div
                className="opacity-100 transition-opacity"
                style={{
                  opacity: displaySettings.clock.visible ? 1 : 0.4,
                  pointerEvents: displaySettings.clock.visible
                    ? 'auto'
                    : 'none',
                }}
              >
                <div className="mb-2 text-[10px] tracking-[0.15em] text-white/50 uppercase">
                  {t('ui.text.187', lang)}
                </div>
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {[
                    'top-left',
                    'top-center',
                    'top-right',
                    'center-left',
                    'center',
                    'center-right',
                    'bottom-left',
                    'bottom-center',
                    'bottom-right',
                  ].map((pos) => (
                    <button
                      key={pos}
                      className={`rounded-sm border py-1 text-[9px] tracking-widest uppercase transition-colors ${displaySettings.clock.position === pos ? '' : 'border-white/10 text-white/40 hover:text-white'}`}
                      style={
                        displaySettings.clock.position === pos
                          ? {
                              borderColor: accentHex,
                              color: accentHex,
                              boxShadow: `0 0 10px ${accentHex}33`,
                            }
                          : {}
                      }
                      onClick={() =>
                        onDisplaySettingsChange((s) => ({
                          ...s,
                          clock: { ...s.clock, position: pos as any },
                        }))
                      }
                    >
                      {pos.replace('-', ' ')}
                    </button>
                  ))}
                </div>

                <div className="mt-4 mb-2 flex justify-between text-[10px] tracking-[0.15em] text-white/50 uppercase">
                  <span>{t('ui.text.188', lang)}</span>
                  <span>{displaySettings.clock.size}px</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="20"
                    max="200"
                    value={displaySettings.clock.size}
                    onChange={(e) =>
                      onDisplaySettingsChange((s) => ({
                        ...s,
                        clock: { ...s.clock, size: Number(e.target.value) },
                      }))
                    }
                    className="flex-1 accent-white"
                    style={{ accentColor: accentHex }}
                  />
                </div>

                <div className="mt-4 mb-2 text-[10px] tracking-[0.15em] text-white/50 uppercase">
                  {t('ui.text.189', lang)}
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className="relative h-8 w-8 overflow-hidden rounded-full border-[2px]"
                    style={{
                      borderColor: 'rgba(255,255,255,0.2)',
                      opacity: displaySettings.clock.followThemeColor ? 0.3 : 1,
                    }}
                  >
                    <input
                      type="color"
                      value={displaySettings.clock.color}
                      onChange={(e) =>
                        onDisplaySettingsChange((s) => ({
                          ...s,
                          clock: { ...s.clock, color: e.target.value },
                        }))
                      }
                      disabled={displaySettings.clock.followThemeColor}
                      className="absolute inset-[-10px] h-[50px] w-[50px] cursor-pointer"
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-[10px] tracking-widest text-white/50 uppercase transition-colors hover:text-white">
                    <input
                      type="checkbox"
                      checked={displaySettings.clock.followThemeColor}
                      onChange={(e) =>
                        onDisplaySettingsChange((s) => ({
                          ...s,
                          clock: {
                            ...s.clock,
                            followThemeColor: e.target.checked,
                          },
                        }))
                      }
                      className="h-3 w-3"
                      style={{ accentColor: accentHex }}
                    />
                    {t('ui.text.190', lang)}
                  </label>
                </div>

                <div className="mt-4 mb-2 text-[10px] tracking-[0.15em] text-white/50 uppercase">
                  {t('ui.text.191', lang)}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={1}
                    value={Math.round(
                      (displaySettings.clock.opacity ?? 1) * 100
                    )}
                    onChange={(e) =>
                      onDisplaySettingsChange((s) => ({
                        ...s,
                        clock: {
                          ...s.clock,
                          opacity: Number(e.target.value) / 100,
                        },
                      }))
                    }
                    className="flex-1 accent-white"
                    style={{ accentColor: accentHex }}
                  />
                  <span className="w-8 text-right text-[10px] text-white/50 tabular-nums">
                    {Math.round((displaySettings.clock.opacity ?? 1) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'Pulse' || activeTab === 'Meteor' ? (
          <FreqTriggerPanel
            key={activeTab}
            action={activeTab}
            accentHex={accentHex}
          />
        ) : null}
      </div>
    </div>
  );
}
