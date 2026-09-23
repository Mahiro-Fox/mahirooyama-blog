import React from 'react';
import { Lock, Unlock } from 'lucide-react';
import {
  BUILT_IN_THEME_IDS,
  createCustomThemePreset,
  CUSTOM_THEME_ID,
  themes,
  type CustomThemeSettings,
  type ThemeRotationSettings,
} from '../../lib/themes';
import { t, useLanguage } from '../../lib/i18n';
import {
  activeControlStyle,
  colorWithAlpha,
  primaryGhostStyle,
} from './panelShared';

export function ThrottledColorInput({
  value,
  onChange,
  disabled,
  className,
  title,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const [localValue, setLocalValue] = React.useState(value);
  const lastUpdateRef = React.useRef(0);
  const timeoutRef = React.useRef<any>(null);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);

    const now = Date.now();
    if (now - lastUpdateRef.current >= 50) {
      onChange(val);
      lastUpdateRef.current = now;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onChange(val);
        lastUpdateRef.current = Date.now();
      }, 50);
    }
  };

  React.useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  return (
    <input
      type="color"
      value={localValue}
      onChange={handleChange}
      disabled={disabled}
      className={className}
      title={title}
    />
  );
}

export function ThrottledRangeInput({
  min,
  max,
  step,
  value,
  onChange,
  className,
  style,
}: any) {
  const [localValue, setLocalValue] = React.useState(value);
  const lastUpdateRef = React.useRef(0);
  const timeoutRef = React.useRef<any>(null);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setLocalValue(val);

    const now = Date.now();
    if (now - lastUpdateRef.current >= 50) {
      onChange(val);
      lastUpdateRef.current = now;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onChange(val);
        lastUpdateRef.current = Date.now();
      }, 50);
    }
  };

  React.useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={localValue}
      onChange={handleChange}
      className={className}
      style={style}
    />
  );
}

export function CustomColorPanel({
  accentHex,
  theme,
  customThemes,
  activeCustomThemeId,
  themeRotation,
  onThemeChange,
  onCustomThemesChange,
  onThemeRotationChange,
}: {
  accentHex: string;
  theme: string;
  customThemes: CustomThemeSettings[];
  activeCustomThemeId: string;
  themeRotation: ThemeRotationSettings;
  onThemeChange: (theme: string) => void;
  onCustomThemesChange: (
    settings: CustomThemeSettings[],
    activeId?: string
  ) => void;
  onThemeRotationChange: (settings: ThemeRotationSettings) => void;
}) {
  const lang = useLanguage();
  const activePreset =
    customThemes.find((preset) => preset.id === activeCustomThemeId) ||
    customThemes[0] ||
    createCustomThemePreset();
  const rotationItems = [
    ...BUILT_IN_THEME_IDS.map((id) => ({
      id,
      name: themes[id]?.name || id,
      colors: [
        `#${themes[id].uBaseColor1.getHexString()}`,
        `#${themes[id].uCoolCore.getHexString()}`,
        `#${themes[id].uWarmCore.getHexString()}`,
        `#${themes[id].uRippleColor.getHexString()}`,
      ],
    })),
    ...customThemes.map((preset) => ({
      id: preset.id,
      name: preset.name,
      colors: [
        preset.background,
        preset.fog,
        preset.cool,
        preset.warm,
        preset.accent,
      ],
    })),
  ];

  const savePresets = (
    nextPresets: CustomThemeSettings[],
    nextActiveId = activePreset.id
  ) => {
    onCustomThemesChange(nextPresets, nextActiveId);
  };

  const updateRotation = (patch: Partial<ThemeRotationSettings>) => {
    onThemeRotationChange({ ...themeRotation, ...patch });
  };

  const toggleRotationTheme = (themeId: string) => {
    const isSelected = themeRotation.themeIds.includes(themeId);
    const nextIds = isSelected
      ? themeRotation.themeIds.filter((id) => id !== themeId)
      : [...themeRotation.themeIds, themeId];
    updateRotation({ themeIds: nextIds });
  };

  const updateCustomTheme = (patch: Partial<CustomThemeSettings>) => {
    const nextPresets = customThemes.map((preset) =>
      preset.id === activePreset.id
        ? (() => {
            const next = { ...preset, ...patch };
            if (patch.fogLinkedToBackground === true)
              next.fog = next.background;
            else if (patch.background && next.fogLinkedToBackground)
              next.fog = patch.background;
            return next;
          })()
        : preset
    );
    savePresets(nextPresets, activePreset.id);
    onThemeChange(CUSTOM_THEME_ID);
  };

  const switchCustomTheme = (presetId: string) => {
    savePresets(customThemes, presetId);
    onThemeChange(CUSTOM_THEME_ID);
  };

  const addCustomTheme = () => {
    const nextPreset = createCustomThemePreset({
      ...activePreset,
      id: undefined,
      name: `自定义主题 ${customThemes.length + 1}`,
    });
    savePresets([...customThemes, nextPreset], nextPreset.id);
  };

  const deleteCustomTheme = (presetId: string) => {
    if (customThemes.length <= 1) return;
    const nextPresets = customThemes.filter((preset) => preset.id !== presetId);
    const nextActiveId =
      activePreset.id === presetId ? nextPresets[0].id : activePreset.id;
    savePresets(nextPresets, nextActiveId);
  };

  const colorControls: Array<{
    key: keyof Pick<CustomThemeSettings, 'cool' | 'warm' | 'accent'>;
    label: string;
    hint: string;
  }> = [
    {
      key: 'cool',
      label: t('ui.text.258', lang),
      hint: t('ui.text.259', lang),
    },
    {
      key: 'warm',
      label: t('ui.text.260', lang),
      hint: t('ui.text.261', lang),
    },
    {
      key: 'accent',
      label: t('ui.text.262', lang),
      hint: t('ui.text.263', lang),
    },
  ];

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-4 rounded-sm border border-white/10 bg-white/[0.03] p-4">
        <div>
          <div className="mb-2 text-[12px] tracking-[0.18em] text-white/70 uppercase">
            {t('ui.text.264', lang)}
          </div>
          <div className="text-[11px] leading-relaxed text-white/45">
            {t('ui.text.265', lang)}
          </div>
        </div>
        <button
          onClick={addCustomTheme}
          className="shrink-0 rounded-sm border border-white/10 px-3 py-2 text-[10px] tracking-[0.15em] text-white/55 uppercase transition-colors hover:text-white"
        >
          {t('ui.text.266', lang)}
        </button>
      </div>

      <div className="grid gap-4 rounded-sm border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-2 text-[12px] tracking-[0.18em] text-white/70 uppercase">
              {t('ui.text.267', lang)}
            </div>
            <div className="text-[11px] leading-relaxed text-white/45">
              {t('ui.text.268', lang)}
            </div>
          </div>
          <button
            onClick={() => updateRotation({ enabled: !themeRotation.enabled })}
            className={`rounded-sm border px-3 py-2 text-[10px] tracking-[0.15em] uppercase transition-colors ${
              themeRotation.enabled
                ? ''
                : 'border-white/10 text-white/45 hover:text-white'
            }`}
            style={
              themeRotation.enabled ? activeControlStyle(accentHex) : undefined
            }
          >
            {themeRotation.enabled
              ? t('ui.text.269', lang)
              : t('ui.text.270', lang)}
          </button>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[12px] text-white/75">
              {t('ui.text.271', lang)}
            </div>
            <div className="text-[12px]" style={{ color: accentHex }}>
              {themeRotation.intervalSeconds} {t('ui.text.272', lang)}
            </div>
          </div>
          <ThrottledRangeInput
            min="3"
            max="120"
            step="1"
            value={themeRotation.intervalSeconds}
            onChange={(val: number) => updateRotation({ intervalSeconds: val })}
            className="h-1 w-full accent-current"
            style={{ accentColor: accentHex }}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() =>
              updateRotation({ themeIds: rotationItems.map((item) => item.id) })
            }
            className="rounded-sm border border-white/10 px-3 py-1.5 text-[10px] tracking-[0.15em] text-white/45 uppercase transition-colors hover:text-white"
          >
            {t('ui.text.273', lang)}
          </button>
          <button
            onClick={() => updateRotation({ themeIds: [] })}
            className="rounded-sm border border-white/10 px-3 py-1.5 text-[10px] tracking-[0.15em] text-white/45 uppercase transition-colors hover:text-white"
          >
            {t('ui.text.274', lang)}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rotationItems.map((item) => {
            const isSelected = themeRotation.themeIds.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleRotationTheme(item.id)}
                className={`flex items-center justify-between gap-3 rounded-sm border px-3 py-2 text-left transition-colors ${
                  isSelected
                    ? 'bg-white/[0.06]'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/5'
                }`}
                style={
                  isSelected
                    ? { borderColor: colorWithAlpha(accentHex, 0.38) }
                    : undefined
                }
              >
                <span className="min-w-0">
                  <span className="block truncate text-[11px] text-white/75">
                    {item.name}
                  </span>
                  <span className="mt-2 flex gap-1">
                    {item.colors.map((color) => (
                      <span
                        key={`${item.id}-${color}`}
                        className="h-2.5 w-5 rounded-[1px]"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                </span>
                <span
                  className="h-4 w-4 shrink-0 rounded-sm border"
                  style={{
                    borderColor: isSelected
                      ? accentHex
                      : 'rgba(255,255,255,0.18)',
                    backgroundColor: isSelected ? accentHex : 'transparent',
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="themed-scrollbar flex gap-2 overflow-x-auto pb-1">
        {customThemes.map((preset) => {
          const isActivePreset = preset.id === activePreset.id;
          const isUsingPreset =
            theme === CUSTOM_THEME_ID && preset.id === activeCustomThemeId;
          return (
            <div
              key={preset.id}
              className={`relative min-w-[140px] shrink-0 rounded-sm border transition-colors ${
                isActivePreset
                  ? 'bg-white/[0.06]'
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/5'
              }`}
              style={
                isActivePreset
                  ? { borderColor: colorWithAlpha(accentHex, 0.38) }
                  : undefined
              }
            >
              <button
                onClick={() => savePresets(customThemes, preset.id)}
                className="block w-full px-3 py-2 pr-10 text-left"
              >
                <span className="block truncate text-[11px] text-white/75">
                  {preset.name}
                </span>
                <span className="mt-2 flex gap-1">
                  {[
                    preset.background,
                    preset.fog,
                    preset.cool,
                    preset.warm,
                    preset.accent,
                  ].map((color) => (
                    <span
                      key={color}
                      className="h-2.5 w-5 rounded-[1px]"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                <span
                  className="mt-2 block text-[9px] tracking-[0.14em] uppercase"
                  style={{
                    color: isUsingPreset ? accentHex : 'rgba(255,255,255,0.35)',
                  }}
                >
                  {isUsingPreset
                    ? t('ui.text.275', lang)
                    : t('ui.text.276', lang)}
                </span>
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  deleteCustomTheme(preset.id);
                }}
                disabled={customThemes.length <= 1}
                className="absolute top-2 right-2 rounded-sm border border-white/10 px-2 py-1 text-[9px] tracking-[0.12em] text-white/35 uppercase hover:text-[#ef4444] disabled:opacity-25 disabled:hover:text-white/35"
                title={t('ui.text.277', lang)}
              >
                {t('ui.text.278', lang)}
              </button>
            </div>
          );
        })}
      </div>

      <div className="grid gap-2">
        <label className="text-[10px] tracking-[0.18em] text-white/45 uppercase">
          {t('ui.text.279', lang)}
        </label>
        <input
          value={activePreset.name}
          onChange={(event) => updateCustomTheme({ name: event.target.value })}
          className="rounded-sm border bg-white/[0.035] px-3 py-2 text-[12px] text-white outline-none focus:border-white/30"
          style={{ borderColor: colorWithAlpha(accentHex, 0.16) }}
        />
      </div>

      <div className="grid gap-3">
        <div
          className="grid grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] items-stretch gap-2 rounded-sm border bg-white/[0.025] px-3 py-3"
          style={{ borderColor: colorWithAlpha(accentHex, 0.16) }}
        >
          <label className="flex min-w-0 items-center gap-3">
            <ThrottledColorInput
              value={activePreset.background}
              onChange={(val: string) => updateCustomTheme({ background: val })}
              className="h-9 w-9 shrink-0 cursor-pointer rounded-sm border border-white/10 bg-transparent p-0"
              title={t('ui.text.280', lang)}
            />
            <span className="min-w-0">
              <span className="block text-[12px] text-white/75">
                {t('ui.text.281', lang)}
              </span>
              <span className="mt-1 block text-[10px] leading-relaxed text-white/35">
                {t('ui.text.282', lang)}
              </span>
            </span>
          </label>

          <button
            type="button"
            onClick={() =>
              updateCustomTheme({
                fogLinkedToBackground: !activePreset.fogLinkedToBackground,
              })
            }
            className="grid h-full min-h-[52px] place-items-center rounded-sm border border-white/10 text-white/45 transition-colors hover:text-white"
            style={
              activePreset.fogLinkedToBackground
                ? activeControlStyle(accentHex)
                : undefined
            }
            title={
              activePreset.fogLinkedToBackground
                ? t('ui.text.283', lang)
                : t('ui.text.284', lang)
            }
          >
            {activePreset.fogLinkedToBackground ? (
              <Lock size={15} />
            ) : (
              <Unlock size={15} />
            )}
          </button>

          <label
            className={`flex min-w-0 items-center gap-3 ${activePreset.fogLinkedToBackground ? 'opacity-55' : ''}`}
          >
            <ThrottledColorInput
              value={activePreset.fog}
              disabled={activePreset.fogLinkedToBackground}
              onChange={(val: string) => updateCustomTheme({ fog: val })}
              className="h-9 w-9 shrink-0 cursor-pointer rounded-sm border border-white/10 bg-transparent p-0 disabled:cursor-not-allowed"
              title={t('ui.text.285', lang)}
            />
            <span className="min-w-0">
              <span className="block text-[12px] text-white/75">
                {t('ui.text.286', lang)}
              </span>
              <span className="mt-1 block text-[10px] leading-relaxed text-white/35">
                {activePreset.fogLinkedToBackground
                  ? t('ui.text.287', lang)
                  : t('ui.text.288', lang)}
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {colorControls.map((control) => (
          <label
            key={control.key}
            className="flex items-center gap-3 rounded-sm border bg-white/[0.025] px-3 py-3"
            style={{ borderColor: colorWithAlpha(accentHex, 0.16) }}
          >
            <ThrottledColorInput
              value={activePreset[control.key]}
              onChange={(val: string) =>
                updateCustomTheme({
                  [control.key]: val,
                } as Partial<CustomThemeSettings>)
              }
              className="h-9 w-9 shrink-0 cursor-pointer rounded-sm border border-white/10 bg-transparent p-0"
              title={control.label}
            />
            <span className="min-w-0">
              <span className="block text-[12px] text-white/75">
                {control.label}
              </span>
              <span className="mt-1 block text-[10px] leading-relaxed text-white/35">
                {control.hint}
              </span>
            </span>
          </label>
        ))}
      </div>

      <div
        className="rounded-sm border bg-white/[0.025] px-4 py-3"
        style={{ borderColor: colorWithAlpha(accentHex, 0.16) }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[12px] text-white/75">
              {t('ui.text.289', lang)}
            </div>
            <div className="mt-1 text-[10px] text-white/35">
              {t('ui.text.290', lang)}
            </div>
          </div>
          <div className="text-[12px]" style={{ color: accentHex }}>
            {activePreset.glowIntensity.toFixed(2)}
          </div>
        </div>
        <ThrottledRangeInput
          min="0.4"
          max="2.2"
          step="0.05"
          value={activePreset.glowIntensity}
          onChange={(val: number) =>
            updateCustomTheme({ glowIntensity: val })
          }
          className="mt-3 h-1 w-full accent-current"
          style={{ accentColor: accentHex }}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => deleteCustomTheme(activePreset.id)}
          disabled={customThemes.length <= 1}
          className="rounded-sm border border-white/10 px-3 py-2 text-[10px] tracking-[0.15em] text-white/35 uppercase transition-colors hover:text-white disabled:opacity-25 disabled:hover:text-white/35"
        >
          {t('ui.text.291', lang)}
        </button>
        <button
          onClick={() => switchCustomTheme(activePreset.id)}
          className="rounded-sm border px-3 py-2 text-[10px] tracking-[0.15em] uppercase"
          style={primaryGhostStyle(accentHex)}
        >
          {t('ui.text.292', lang)}
        </button>
      </div>
    </div>
  );
}