/**
 * 浮动方块参数面板。
 * 调整 3D 场景中浮动方块的开关、强度、尺寸范围与运动速度。
 */
import { t, useLanguage } from '../../../lib/i18n/i18n';
import {
  DEFAULT_FLOATING_BLOCK_COUNT,
  DEFAULT_FLOATING_BLOCK_INTENSITY,
  DEFAULT_FLOATING_BLOCK_MAX_SIZE,
  DEFAULT_FLOATING_BLOCK_MIN_SIZE,
  DEFAULT_FLOATING_BLOCK_SPEED,
  DEFAULT_FLOATING_BLOCKS_ENABLED,
  type StoredGroundEqSettings,
} from '../../../lib/settings/groundEqSettings';
import { colorWithAlpha } from '../shared/panelShared';

/**
 * 浮动方块（3D 装饰元素）的外观与运动参数面板。
 *
 * @param accentHex 主题强调色
 * @param groundEqSettings 当前地面均衡器设置（浮动方块参数包含其中）
 * @param onGroundEqSettingsChange 设置变更回调
 */
export function FloatingBlocksPanel({
  accentHex,
  groundEqSettings,
  onGroundEqSettingsChange,
}: {
  accentHex: string;
  groundEqSettings: StoredGroundEqSettings;
  onGroundEqSettingsChange: (settings: StoredGroundEqSettings) => void;
}) {
  const lang = useLanguage();
  const enabled =
    groundEqSettings.floatingBlocksEnabled ?? DEFAULT_FLOATING_BLOCKS_ENABLED;
  const intensity =
    groundEqSettings.floatingBlockIntensity ?? DEFAULT_FLOATING_BLOCK_INTENSITY;
  const minSize =
    groundEqSettings.floatingBlockMinSize ?? DEFAULT_FLOATING_BLOCK_MIN_SIZE;
  const maxSize =
    groundEqSettings.floatingBlockMaxSize ?? DEFAULT_FLOATING_BLOCK_MAX_SIZE;
  const speed =
    groundEqSettings.floatingBlockSpeed ?? DEFAULT_FLOATING_BLOCK_SPEED;
  const count =
    groundEqSettings.floatingBlockCount ?? DEFAULT_FLOATING_BLOCK_COUNT;

  const commit = (updates: Partial<StoredGroundEqSettings>) => {
    onGroundEqSettingsChange({ ...groundEqSettings, ...updates });
  };

  const clampSetting = (value: number) =>
    Math.max(0, Math.min(100, Math.round(value)));
  const commitMinSize = (value: number) =>
    commit({ floatingBlockMinSize: Math.min(clampSetting(value), maxSize) });
  const commitMaxSize = (value: number) =>
    commit({ floatingBlockMaxSize: Math.max(clampSetting(value), minSize) });

  return (
    <div className="grid gap-5">
      <div className="flex items-start justify-between gap-4 rounded-sm border border-white/10 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div>
          <div className="mb-2 text-[12px] tracking-[0.18em] text-white/70 uppercase">
            {t('ui.text.192', lang)}
          </div>
          <div className="text-[11px] leading-relaxed text-white/45">
            {t('ui.text.193', lang)}
          </div>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-sm border border-white/10 px-3 py-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) =>
              commit({ floatingBlocksEnabled: event.target.checked })
            }
            className="h-4 w-4 rounded-sm border-white/20 bg-black/50"
            style={{ accentColor: accentHex }}
          />
          <span className="text-[10px] tracking-[0.12em] text-white/55 uppercase">
            {t('ui.text.194', lang)}
          </span>
        </label>
      </div>

      <div
        className="rounded-sm border bg-white/[0.025] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
        style={{ borderColor: colorWithAlpha(accentHex, 0.16) }}
      >
        {[
          {
            label: t('ui.text.195', lang),
            hint: t('ui.text.196', lang),
            value: intensity,
            minLabel: t('ui.text.197', lang),
            maxLabel: t('ui.text.198', lang),
            onChange: (value: number) =>
              commit({ floatingBlockIntensity: clampSetting(value) }),
          },
          {
            label: t('ui.text.199', lang),
            hint: t('ui.text.200', lang),
            value: minSize,
            minLabel: t('ui.text.201', lang),
            maxLabel: t('ui.text.202', lang),
            onChange: commitMinSize,
          },
          {
            label: t('ui.text.203', lang),
            hint: t('ui.text.204', lang),
            value: maxSize,
            minLabel: t('ui.text.205', lang),
            maxLabel: t('ui.text.206', lang),
            onChange: commitMaxSize,
          },
          {
            label: t('ui.text.207', lang),
            hint: t('ui.text.208', lang),
            value: speed,
            minLabel: t('ui.text.209', lang),
            maxLabel: t('ui.text.210', lang),
            onChange: (value: number) =>
              commit({ floatingBlockSpeed: clampSetting(value) }),
          },
          {
            label: t('ui.text.211', lang),
            hint: t('ui.text.212', lang),
            value: count,
            minLabel: t('ui.text.213', lang),
            maxLabel: t('ui.text.214', lang),
            onChange: (value: number) =>
              commit({ floatingBlockCount: clampSetting(value) }),
          },
        ].map((control) => (
          <div key={control.label} className="mt-6 first:mt-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[12px] tracking-[0.16em] text-white/70 uppercase">
                  {control.label}
                </div>
                <div className="mt-1 text-[10px] leading-relaxed text-white/38">
                  {control.hint}
                </div>
              </div>
              <div
                className="text-[13px] font-medium tabular-nums"
                style={{ color: accentHex }}
              >
                {control.value}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-[42px_minmax(0,1fr)_42px] items-center gap-3">
              <span className="text-[10px] tracking-[0.12em] text-white/35 uppercase">
                {control.minLabel}
              </span>
              <input
                aria-label={control.label}
                type="range"
                min={0}
                max={100}
                step={1}
                value={control.value}
                onChange={(event) =>
                  control.onChange(Number(event.target.value))
                }
                className="h-1 w-full cursor-pointer accent-current disabled:opacity-40"
                style={{ accentColor: accentHex }}
                disabled={!enabled}
              />
              <span className="text-right text-[10px] tracking-[0.12em] text-white/35 uppercase">
                {control.maxLabel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
