/**
 * 地面均衡器面板。
 * 配置地形对 8 个频段的响应强度，以及运动速度、振幅、地形密度与浮动方块相关选项。
 */
import { useEffect, useState } from 'react';
import { t, useLanguage } from '../../../lib/i18n/i18n';
import {
  DEFAULT_FLOATING_BLOCK_COUNT,
  DEFAULT_FLOATING_BLOCK_INTENSITY,
  DEFAULT_FLOATING_BLOCK_MAX_SIZE,
  DEFAULT_FLOATING_BLOCK_MIN_SIZE,
  DEFAULT_FLOATING_BLOCK_SPEED,
  DEFAULT_FLOATING_BLOCKS_ENABLED,
  DEFAULT_GROUND_EQ_VALUE,
  DEFAULT_GROUND_MOTION_SPEED,
  DEFAULT_TERRAIN_DENSITY,
  defaultGroundEqBands,
  deriveTerrainGridSettings,
  type GroundEqBandId,
  type StoredGroundEqSettings,
} from '../../../lib/settings/groundEqSettings';
import { colorWithAlpha } from '../shared/panelShared';

/**
 * 地面（地形）均衡器设置面板：分段增益、运动速度、振幅、地形密度等。
 *
 * @param accentHex 主题强调色
 * @param groundEqSettings 当前设置
 * @param onGroundEqSettingsChange 设置变更回调
 */
export function GroundEqPanel({
  accentHex,
  groundEqSettings,
  onGroundEqSettingsChange,
}: {
  accentHex: string;
  groundEqSettings: StoredGroundEqSettings;
  onGroundEqSettingsChange: (settings: StoredGroundEqSettings) => void;
}) {
  const lang = useLanguage();
  const [bands, setBands] = useState(groundEqSettings.bands);
  const [motionSpeed, setMotionSpeed] = useState(
    groundEqSettings.motionSpeed ?? DEFAULT_GROUND_MOTION_SPEED
  );
  const [amplitude, setAmplitude] = useState(groundEqSettings.amplitude ?? 50);
  const [terrainDensity, setTerrainDensity] = useState(
    groundEqSettings.terrainDensity ?? DEFAULT_TERRAIN_DENSITY
  );
  const [floatingBlocksEnabled, setFloatingBlocksEnabled] = useState(
    groundEqSettings.floatingBlocksEnabled ?? DEFAULT_FLOATING_BLOCKS_ENABLED
  );
  const [floatingBlockIntensity, setFloatingBlockIntensity] = useState(
    groundEqSettings.floatingBlockIntensity ?? DEFAULT_FLOATING_BLOCK_INTENSITY
  );
  const [floatingBlockMinSize, setFloatingBlockMinSize] = useState(
    groundEqSettings.floatingBlockMinSize ?? DEFAULT_FLOATING_BLOCK_MIN_SIZE
  );
  const [floatingBlockMaxSize, setFloatingBlockMaxSize] = useState(
    groundEqSettings.floatingBlockMaxSize ?? DEFAULT_FLOATING_BLOCK_MAX_SIZE
  );
  const [floatingBlockSpeed, setFloatingBlockSpeed] = useState(
    groundEqSettings.floatingBlockSpeed ?? DEFAULT_FLOATING_BLOCK_SPEED
  );
  const [floatingBlockCount, setFloatingBlockCount] = useState(
    groundEqSettings.floatingBlockCount ?? DEFAULT_FLOATING_BLOCK_COUNT
  );
  const [enabledBands, setEnabledBands] = useState(
    groundEqSettings.enabledBands ?? new Array(8).fill(true)
  );

  useEffect(() => {
    setBands(groundEqSettings.bands);
    setMotionSpeed(groundEqSettings.motionSpeed ?? DEFAULT_GROUND_MOTION_SPEED);
    setAmplitude(groundEqSettings.amplitude ?? 50);
    setTerrainDensity(
      groundEqSettings.terrainDensity ?? DEFAULT_TERRAIN_DENSITY
    );
    setFloatingBlocksEnabled(
      groundEqSettings.floatingBlocksEnabled ?? DEFAULT_FLOATING_BLOCKS_ENABLED
    );
    setFloatingBlockIntensity(
      groundEqSettings.floatingBlockIntensity ??
        DEFAULT_FLOATING_BLOCK_INTENSITY
    );
    setFloatingBlockMinSize(
      groundEqSettings.floatingBlockMinSize ?? DEFAULT_FLOATING_BLOCK_MIN_SIZE
    );
    setFloatingBlockMaxSize(
      groundEqSettings.floatingBlockMaxSize ?? DEFAULT_FLOATING_BLOCK_MAX_SIZE
    );
    setFloatingBlockSpeed(
      groundEqSettings.floatingBlockSpeed ?? DEFAULT_FLOATING_BLOCK_SPEED
    );
    setFloatingBlockCount(
      groundEqSettings.floatingBlockCount ?? DEFAULT_FLOATING_BLOCK_COUNT
    );
    setEnabledBands(groundEqSettings.enabledBands ?? new Array(8).fill(true));
  }, [
    groundEqSettings.bands,
    groundEqSettings.motionSpeed,
    groundEqSettings.amplitude,
    groundEqSettings.terrainDensity,
    groundEqSettings.floatingBlocksEnabled,
    groundEqSettings.floatingBlockIntensity,
    groundEqSettings.floatingBlockMinSize,
    groundEqSettings.floatingBlockMaxSize,
    groundEqSettings.floatingBlockSpeed,
    groundEqSettings.enabledBands,
  ]);

  const bandNotes: Array<{
    id: GroundEqBandId;
    marker: string;
    color: string;
    label: string;
    english: string;
    effect: string;
    description: string;
  }> = [
    {
      id: 'subBass',
      marker: '1',
      color: '#6ee7ff',
      label: t('ui.text.215', lang),
      english: 'Sub Bass',
      effect: t('ui.text.216', lang),
      description: t('ui.text.217', lang),
    },
    {
      id: 'bass',
      marker: '2',
      color: '#5eead4',
      label: t('ui.text.218', lang),
      english: 'Bass',
      effect: t('ui.text.219', lang),
      description: t('ui.text.220', lang),
    },
    {
      id: 'lowMid',
      marker: '3',
      color: '#a7f3d0',
      label: t('ui.text.221', lang),
      english: 'Low Mid',
      effect: t('ui.text.222', lang),
      description: t('ui.text.223', lang),
    },
    {
      id: 'mid',
      marker: '4',
      color: '#fde68a',
      label: t('ui.text.224', lang),
      english: 'Mid',
      effect: t('ui.text.225', lang),
      description: t('ui.text.226', lang),
    },
    {
      id: 'highMid',
      marker: '5',
      color: '#fbbf24',
      label: t('ui.text.227', lang),
      english: 'High Mid',
      effect: t('ui.text.228', lang),
      description: t('ui.text.229', lang),
    },
    {
      id: 'presence',
      marker: '6',
      color: '#fb7185',
      label: t('ui.text.230', lang),
      english: 'Presence',
      effect: t('ui.text.231', lang),
      description: t('ui.text.232', lang),
    },
    {
      id: 'brilliance',
      marker: '7',
      color: '#c084fc',
      label: t('ui.text.233', lang),
      english: 'Brilliance',
      effect: t('ui.text.234', lang),
      description: t('ui.text.235', lang),
    },
    {
      id: 'air',
      marker: '8',
      color: '#93c5fd',
      label: t('ui.text.236', lang),
      english: 'Air',
      effect: t('ui.text.237', lang),
      description: t('ui.text.238', lang),
    },
  ];

  const commitBand = (bandIndex: number, nextValue: number) => {
    const nextBands = bands.map((value, index) =>
      index === bandIndex
        ? Math.max(0, Math.min(100, Math.round(nextValue)))
        : value
    );
    setBands(nextBands);
    onGroundEqSettingsChange({
      bands: nextBands,
      motionSpeed,
      amplitude,
      terrainDensity,
      floatingBlocksEnabled,
      floatingBlockIntensity,
      floatingBlockMinSize,
      floatingBlockMaxSize,
      floatingBlockSpeed,
      floatingBlockCount,
      enabledBands,
    });
  };

  const commitEnabledBand = (bandIndex: number, nextEnabled: boolean) => {
    const nextEnabledBands = enabledBands.map((value, index) =>
      index === bandIndex ? nextEnabled : value
    );
    setEnabledBands(nextEnabledBands);
    onGroundEqSettingsChange({
      bands,
      motionSpeed,
      amplitude,
      terrainDensity,
      floatingBlocksEnabled,
      floatingBlockIntensity,
      floatingBlockMinSize,
      floatingBlockMaxSize,
      floatingBlockSpeed,
      floatingBlockCount,
      enabledBands: nextEnabledBands,
    });
  };

  const commitMotionSpeed = (nextValue: number) => {
    const nextMotionSpeed = Math.max(0, Math.min(100, Math.round(nextValue)));
    setMotionSpeed(nextMotionSpeed);
    onGroundEqSettingsChange({
      bands,
      motionSpeed: nextMotionSpeed,
      amplitude,
      terrainDensity,
      floatingBlocksEnabled,
      floatingBlockIntensity,
      floatingBlockMinSize,
      floatingBlockMaxSize,
      floatingBlockSpeed,
      floatingBlockCount,
      enabledBands,
    });
  };

  const commitAmplitude = (nextValue: number) => {
    const nextAmplitude = Math.max(0, Math.min(100, Math.round(nextValue)));
    setAmplitude(nextAmplitude);
    onGroundEqSettingsChange({
      bands,
      motionSpeed,
      amplitude: nextAmplitude,
      terrainDensity,
      floatingBlocksEnabled,
      floatingBlockIntensity,
      floatingBlockMinSize,
      floatingBlockMaxSize,
      floatingBlockSpeed,
      floatingBlockCount,
      enabledBands,
    });
  };

  const commitTerrainDensity = (nextValue: number) => {
    const nextTerrainDensity = Math.max(
      0,
      Math.min(100, Math.round(nextValue))
    );
    setTerrainDensity(nextTerrainDensity);
    onGroundEqSettingsChange({
      bands,
      motionSpeed,
      amplitude,
      terrainDensity: nextTerrainDensity,
      floatingBlocksEnabled,
      floatingBlockIntensity,
      floatingBlockMinSize,
      floatingBlockMaxSize,
      floatingBlockSpeed,
      floatingBlockCount,
      enabledBands,
    });
  };

  const resetBands = () => {
    const nextBands = [...defaultGroundEqBands];
    const nextEnabledBands = new Array(8).fill(true);
    setBands(nextBands);
    setEnabledBands(nextEnabledBands);
    setMotionSpeed(DEFAULT_GROUND_MOTION_SPEED);
    setAmplitude(50);
    setTerrainDensity(DEFAULT_TERRAIN_DENSITY);
    setFloatingBlocksEnabled(DEFAULT_FLOATING_BLOCKS_ENABLED);
    setFloatingBlockIntensity(DEFAULT_FLOATING_BLOCK_INTENSITY);
    setFloatingBlockMinSize(DEFAULT_FLOATING_BLOCK_MIN_SIZE);
    setFloatingBlockMaxSize(DEFAULT_FLOATING_BLOCK_MAX_SIZE);
    setFloatingBlockSpeed(DEFAULT_FLOATING_BLOCK_SPEED);
    onGroundEqSettingsChange({
      bands: nextBands,
      motionSpeed: DEFAULT_GROUND_MOTION_SPEED,
      amplitude: 50,
      terrainDensity: DEFAULT_TERRAIN_DENSITY,
      floatingBlocksEnabled: DEFAULT_FLOATING_BLOCKS_ENABLED,
      floatingBlockIntensity: DEFAULT_FLOATING_BLOCK_INTENSITY,
      floatingBlockMinSize: DEFAULT_FLOATING_BLOCK_MIN_SIZE,
      floatingBlockMaxSize: DEFAULT_FLOATING_BLOCK_MAX_SIZE,
      floatingBlockSpeed: DEFAULT_FLOATING_BLOCK_SPEED,
      floatingBlockCount: DEFAULT_FLOATING_BLOCK_COUNT,
      enabledBands: nextEnabledBands,
    });
  };

  const terrainGridSettings = deriveTerrainGridSettings(terrainDensity);
  const terrainBlockCount = terrainGridSettings.instanceCount.toLocaleString();

  return (
    <div className="grid gap-5">
      <div className="flex items-start justify-between gap-4 rounded-sm border border-white/10 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div>
          <div className="mb-2 text-[12px] tracking-[0.18em] text-white/70 uppercase">
            {t('ui.text.239', lang)}
          </div>
          <div className="text-[11px] leading-relaxed text-white/45">
            {t('ui.text.240', lang)}
          </div>
        </div>
        <button
          onClick={resetBands}
          className="shrink-0 rounded-sm border border-white/10 px-3 py-2 text-[10px] tracking-[0.15em] text-white/55 uppercase transition-colors hover:text-white"
        >
          {t('ui.text.241', lang)}
        </button>
      </div>

      <div
        className="rounded-sm border bg-white/[0.025] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
        style={{ borderColor: colorWithAlpha(accentHex, 0.16) }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[12px] tracking-[0.16em] text-white/70 uppercase">
              {t('ui.text.242', lang)}
            </div>
            <div className="mt-1 text-[10px] leading-relaxed text-white/38">
              {t('ui.text.243', lang)}
            </div>
          </div>
          <div
            className="text-[13px] font-medium tabular-nums"
            style={{ color: accentHex }}
          >
            {motionSpeed}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[42px_minmax(0,1fr)_42px] items-center gap-3">
          <span className="text-[10px] tracking-[0.12em] text-white/35 uppercase">
            {t('ui.text.244', lang)}
          </span>
          <input
            aria-label={t('ui.text.245', lang)}
            type="range"
            min={0}
            max={100}
            step={1}
            value={motionSpeed}
            onChange={(event) => commitMotionSpeed(Number(event.target.value))}
            className="h-1 w-full cursor-pointer accent-current"
            style={{ accentColor: accentHex }}
          />
          <span className="text-right text-[10px] tracking-[0.12em] text-white/35 uppercase">
            {t('ui.text.246', lang)}
          </span>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-[12px] tracking-[0.16em] text-white/70 uppercase">
              {t('ui.text.247', lang)}
            </div>
            <div className="mt-1 text-[10px] leading-relaxed text-white/38">
              {t('ui.text.248', lang)}
            </div>
          </div>
          <div
            className="text-[13px] font-medium tabular-nums"
            style={{ color: accentHex }}
          >
            {amplitude}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[42px_minmax(0,1fr)_42px] items-center gap-3">
          <span className="text-[10px] tracking-[0.12em] text-white/35 uppercase">
            {t('ui.text.249', lang)}
          </span>
          <input
            aria-label={t('ui.text.250', lang)}
            type="range"
            min={0}
            max={100}
            step={1}
            value={amplitude}
            onChange={(event) => commitAmplitude(Number(event.target.value))}
            className="h-1 w-full cursor-pointer accent-current"
            style={{ accentColor: accentHex }}
          />
          <span className="text-right text-[10px] tracking-[0.12em] text-white/35 uppercase">
            {t('ui.text.251', lang)}
          </span>
        </div>
        <div className="mt-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-[12px] tracking-[0.16em] text-white/70 uppercase">
              {t('ui.text.252', lang)}
            </div>
            <div className="mt-1 text-[10px] leading-relaxed text-white/38">
              {t('ui.text.253', lang)}
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-[13px] font-medium tabular-nums"
              style={{ color: accentHex }}
            >
              {terrainDensity}
            </div>
            <div className="mt-1 text-[10px] text-white/35 tabular-nums">
              {terrainBlockCount} blocks
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[42px_minmax(0,1fr)_42px] items-center gap-3">
          <span className="text-[10px] tracking-[0.12em] text-white/35 uppercase">
            {t('ui.text.254', lang)}
          </span>
          <input
            aria-label={t('ui.text.255', lang)}
            type="range"
            min={0}
            max={100}
            step={1}
            value={terrainDensity}
            onChange={(event) =>
              commitTerrainDensity(Number(event.target.value))
            }
            className="h-1 w-full cursor-pointer accent-current"
            style={{ accentColor: accentHex }}
          />
          <span className="text-right text-[10px] tracking-[0.12em] text-white/35 uppercase">
            {t('ui.text.256', lang)}
          </span>
        </div>
      </div>

      <div
        className="themed-scrollbar overflow-x-auto rounded-sm border bg-white/[0.025] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
        style={{ borderColor: colorWithAlpha(accentHex, 0.16) }}
      >
        <div className="grid min-w-[760px] grid-cols-8 divide-x divide-white/10">
          {bandNotes.map((note, index) => {
            const value = bands[index] ?? DEFAULT_GROUND_EQ_VALUE;
            const fill = `${value}%`;
            return (
              <div
                key={note.id}
                className="relative flex min-h-[360px] flex-col items-center px-3 py-4"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-sm border text-[10px] font-medium"
                    style={{
                      color: note.color,
                      borderColor: `${note.color}66`,
                      backgroundColor: `${note.color}22`,
                    }}
                  >
                    {note.marker}
                  </span>
                  <span
                    className="text-[11px] font-medium tabular-nums"
                    style={{ color: accentHex }}
                  >
                    {value}
                  </span>
                </div>

                <div className="mt-4 h-[190px] w-full rounded-sm border border-white/10 bg-white/[0.025] px-2 py-3">
                  <div className="relative mx-auto flex h-full w-10 items-center justify-center">
                    <div className="absolute h-full w-[3px] rounded-full bg-white/10" />
                    <div
                      className="absolute bottom-0 w-[3px] rounded-full transition-[height] duration-150"
                      style={{ height: fill, backgroundColor: note.color }}
                    />
                    <input
                      aria-label={`${note.label} ${note.english}`}
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={value}
                      onChange={(event) =>
                        commitBand(index, Number(event.target.value))
                      }
                      className="relative h-[170px] w-8 cursor-pointer accent-white"
                      style={{
                        writingMode: 'vertical-lr',
                        direction: 'rtl',
                        accentColor: note.color,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4 w-full">
                  <div className="text-[12px] leading-4 text-white/75">
                    {note.label}
                  </div>
                  <div
                    className="mt-1 text-[10px] tracking-[0.12em] uppercase"
                    style={{ color: note.color }}
                  >
                    {note.english}
                  </div>
                  <div className="mt-2 text-[10px] leading-relaxed text-white/35">
                    {note.effect}
                  </div>
                  <div className="mt-1 min-h-[42px] text-[10px] leading-relaxed text-white/35">
                    {note.description}
                  </div>
                  <label className="group mt-3 flex cursor-pointer items-center gap-2">
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors ${enabledBands[index] ? 'border-transparent text-black' : 'border-white/20 bg-transparent text-transparent'}`}
                      style={{
                        backgroundColor: enabledBands[index]
                          ? note.color
                          : undefined,
                      }}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 12 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10 3L4.5 8.5L2 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span className="text-[10px] tracking-[0.08em] text-white/50 uppercase transition-colors select-none group-hover:text-white/80">
                      {t('ui.text.257', lang)}
                    </span>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={enabledBands[index]}
                      onChange={(e) =>
                        commitEnabledBand(index, e.target.checked)
                      }
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
