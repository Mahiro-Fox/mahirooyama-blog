/**
 * 频率触发（Pulse / Meteor）设置面板。
 * 通过可视化坐标图选取触发频率点与阈值，并配置灵敏度、冷却、自动跟随等参数，
 * 用于驱动脉冲波纹与流星特效。
 */
import { useEffect, useRef, useState } from 'react';
import { engine, TriggerPreset } from '../../../lib/audio/AudioEngine';
import { t, useLanguage } from '../../../lib/i18n/i18n';
import { writeTriggerSettingsStorage } from '../../../lib/settings/triggerSettings';
import { snapshotTriggerConfig } from '../shared/panelShared';

/**
 * 频率触发器设置面板，可分别配置 Pulse（脉冲）与 Meteor（流星）两种特效的触发条件。
 *
 * @param action 目标触发器：'Pulse' 或 'Meteor'
 * @param accentHex 主题强调色
 */
export function FreqTriggerPanel({
  action,
  accentHex,
}: {
  action: 'Pulse' | 'Meteor';
  accentHex: string;
}) {
  const lang = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getConfig = () =>
    action === 'Pulse' ? engine.pulseTrigger : engine.meteorTrigger;

  const [triggerPoint, setTriggerPoint] = useState({
    x: getConfig().freqIndex >= 0 ? getConfig().freqIndex / 512 : 0.5,
    y: getConfig().threshold,
  });
  const [isEnabled, setIsEnabled] = useState(getConfig().enabled);
  const [mode, setMode] = useState<TriggerPreset>(getConfig().mode);
  const [sensitivity, setSensitivity] = useState(getConfig().sensitivity);
  const [cooldown, setCooldown] = useState(getConfig().cooldown);
  const [pulseStrength, setPulseStrength] = useState(getConfig().pulseStrength);
  const [bandStart, setBandStart] = useState(getConfig().bandStart);
  const [bandEnd, setBandEnd] = useState(getConfig().bandEnd);
  const isDragging = useRef(false);

  // Sync state TO engine when parameters change
  useEffect(() => {
    const c = getConfig();
    c.enabled = isEnabled;
    c.mode = mode;
    c.sensitivity = sensitivity;
    c.cooldown = cooldown;
    c.pulseStrength = pulseStrength;
    c.bandStart = bandStart;
    c.bandEnd = bandEnd;

    if (mode === 'Advanced') {
      c.freqIndex = Math.floor(triggerPoint.x * 512);
      c.threshold = triggerPoint.y;
    } else {
      c.freqIndex = -1;
    }

    writeTriggerSettingsStorage({
      Pulse: snapshotTriggerConfig(engine.pulseTrigger),
      Meteor: snapshotTriggerConfig(engine.meteorTrigger),
    });
  }, [
    isEnabled,
    mode,
    sensitivity,
    cooldown,
    pulseStrength,
    bandStart,
    bandEnd,
    triggerPoint,
  ]);

  const handleModeChange = (newMode: TriggerPreset) => {
    setMode(newMode);
  };

  const presets: TriggerPreset[] = ['Auto Beat', 'Advanced'];
  const modeLabels: Record<TriggerPreset, string> = {
    'Auto Beat': t('ui.text.329', lang),
    Advanced: t('ui.text.330', lang),
  };
  const actionLabel =
    action === 'Pulse' ? t('ui.text.331', lang) : t('ui.text.332', lang);

  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Draw grid
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      for (let i = 1; i < 10; i++) {
        ctx.moveTo(0, (height * i) / 10);
        ctx.lineTo(width, (height * i) / 10);
        ctx.moveTo((width * i) / 10, 0);
        ctx.lineTo((width * i) / 10, height);
      }
      ctx.stroke();

      const data = engine.getRawFrequencyData();
      const binCount = data.length || 512;

      // Draw highlighted band
      const [startBin, endBin] = getConfig().getTriggerRange();
      const startX = (startBin / binCount) * width;
      const endX = (endBin / binCount) * width;

      ctx.fillStyle =
        mode === 'Advanced' ? 'rgba(255,255,255,0.02)' : `${accentHex}20`;
      ctx.fillRect(startX, 0, Math.max(1, endX - startX), height);

      if (mode !== 'Advanced') {
        ctx.strokeStyle = accentHex + '80';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(endX, 0);
        ctx.lineTo(endX, height);
        ctx.stroke();
      }

      // Draw spectrum
      ctx.fillStyle = accentHex + '40'; // opacity
      ctx.beginPath();
      ctx.moveTo(0, height);

      for (let i = 0; i < binCount; i++) {
        const x = (i / binCount) * width;
        const val = data[i] / 255.0;
        const y = height - val * height;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      if (mode === 'Advanced') {
        // Draw drag point
        const tx = triggerPoint.x * width;
        const ty = height - triggerPoint.y * height;

        ctx.beginPath();
        ctx.moveTo(tx, 0);
        ctx.lineTo(tx, height);
        ctx.moveTo(0, ty);
        ctx.lineTo(width, ty);
        ctx.strokeStyle = accentHex;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(tx, ty, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      } else {
        // Draw dynamic threshold line
        const evE = getConfig().lastEvalEnergy;
        const evThresh = getConfig().lastEvalThresh;

        const eY = height - evE * height;
        const tY = height - evThresh * height;

        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(0, tY);
        ctx.lineTo(width, tY);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.stroke();
        ctx.setLineDash([]);

        // Current energy dot
        const cx = (startX + endX) / 2;
        ctx.beginPath();
        ctx.arc(cx, eY, 6, 0, Math.PI * 2);
        ctx.fillStyle = evE > evThresh ? accentHex : 'rgba(255,255,255,0.5)';
        ctx.fill();
      }
    };
    draw();
    return () => cancelAnimationFrame(animationId);
  }, [accentHex, triggerPoint, mode]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (mode !== 'Advanced') return;
    isDragging.current = true;
    updateTriggerFromEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || mode !== 'Advanced') return;
    updateTriggerFromEvent(e);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const updateTriggerFromEvent = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(
      0,
      Math.min(1, 1 - (e.clientY - rect.top) / rect.height)
    );

    setTriggerPoint({ x, y });
    const config =
      action === 'Meteor' ? engine.meteorTrigger : engine.pulseTrigger;
    config.freqIndex = Math.floor(x * 512); // assuming binCount max 512
    config.threshold = y;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="text-[12px] tracking-[0.2em] text-white/70 uppercase">
          {actionLabel}
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="h-4 w-4 rounded-sm border-white/20 bg-black/50"
            style={{ accentColor: accentHex }}
          />
          <span className="text-[10px] tracking-widest text-white/50 uppercase">
            {t('ui.text.333', lang)}
          </span>
        </label>
      </div>

      <div className="mb-4 flex gap-2">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => handleModeChange(p)}
            className={`rounded-sm border px-3 py-1.5 text-[10px] tracking-widest uppercase transition-colors ${
              mode === p
                ? 'border-white/20 bg-white/10 text-white'
                : 'border-transparent text-white/40 hover:bg-white/5 hover:text-white'
            }`}
          >
            {modeLabels[p]}
          </button>
        ))}
      </div>

      <p className="mb-6 h-10 font-mono text-[11px] leading-relaxed text-white/40">
        {mode === 'Advanced' ? t('ui.text.334', lang) : t('ui.text.335', lang)}
      </p>
      <div
        className={`relative aspect-[2/1] w-full overflow-hidden rounded border border-white/5 bg-black/50 ${mode === 'Advanced' ? 'cursor-crosshair' : ''}`}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="block h-full w-full"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      {mode === 'Auto Beat' && (
        <div className="mt-8 grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[10px] tracking-widest text-white/50 uppercase">
              <span>{t('ui.text.336', lang)}</span>
              <span style={{ color: accentHex }}>{sensitivity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="h-1 w-full accent-current"
              style={{ accentColor: accentHex }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[10px] tracking-widest text-white/50 uppercase">
              <span>{t('ui.text.337', lang)}</span>
              <span style={{ color: accentHex }}>{cooldown}</span>
            </div>
            <input
              type="range"
              min="0"
              max="300"
              step="1"
              value={cooldown}
              onChange={(e) => setCooldown(parseInt(e.target.value))}
              className="h-1 w-full accent-current"
              style={{ accentColor: accentHex }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[10px] tracking-widest text-white/50 uppercase">
              <span>
                {t('ui.text.338', lang)}
                {bandStart} - {bandEnd})
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="range"
                min="0"
                max="250"
                step="1"
                value={bandStart}
                onChange={(e) =>
                  setBandStart(Math.min(parseInt(e.target.value), bandEnd - 1))
                }
                className="h-1 w-1/2 accent-current"
                style={{ accentColor: accentHex }}
              />
              <input
                type="range"
                min="2"
                max="256"
                step="1"
                value={bandEnd}
                onChange={(e) =>
                  setBandEnd(Math.max(parseInt(e.target.value), bandStart + 1))
                }
                className="h-1 w-1/2 accent-current"
                style={{ accentColor: accentHex }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[10px] tracking-widest text-white/50 uppercase">
              <span>{t('ui.text.339', lang)}</span>
              <span style={{ color: accentHex }}>
                {pulseStrength.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={pulseStrength}
              onChange={(e) => setPulseStrength(parseFloat(e.target.value))}
              className="h-1 w-full accent-current"
              style={{ accentColor: accentHex }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
