import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ClockSettings } from '../../lib/displaySettings';

interface ClockDisplayProps {
  settings: ClockSettings;
  accentHex: string;
}

type TimerState = 'idle' | 'running' | 'paused' | 'done';

const PRESETS = [
  { label: '15', minutes: 15 },
  { label: '30', minutes: 30 },
  { label: '45', minutes: 45 },
  { label: '60', minutes: 60 },
];

/** SVG circular progress ring */
function RingProgress({
  radius, stroke, progress, color, pulseWhenDone,
}: {
  radius: number; stroke: number; progress: number; color: string; pulseWhenDone: boolean;
}) {
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  return (
    <svg
      width={(radius + stroke) * 2}
      height={(radius + stroke) * 2}
      style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
    >
      <circle cx={radius + stroke} cy={radius + stroke} r={radius}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={radius + stroke} cy={radius + stroke} r={radius}
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{
          transition: 'stroke-dashoffset 1s linear',
          filter: pulseWhenDone
            ? `drop-shadow(0 0 10px ${color})`
            : `drop-shadow(0 0 5px ${color}88)`,
        }}
      />
    </svg>
  );
}

/** Fixed-positioned panel rendered via portal so overflow:hidden never clips it */
function TimerPanel({
  anchorRef,
  accentHex,
  timerState,
  remainSecs,
  totalSecs,
  showCustom,
  customInput,
  onPreset,
  onTogglePause,
  onReset,
  onShowCustom,
  onCustomInput,
  onStartCustom,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  accentHex: string;
  timerState: TimerState;
  remainSecs: number;
  totalSecs: number;
  showCustom: boolean;
  customInput: string;
  onPreset: (m: number) => void;
  onTogglePause: () => void;
  onReset: () => void;
  onShowCustom: () => void;
  onCustomInput: (v: string) => void;
  onStartCustom: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Calculate position relative to anchor
  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const panelW = 288;
    const margin = 10;

    let left = rect.left + rect.width / 2 - panelW / 2;
    // clamp horizontally
    left = Math.max(margin, Math.min(left, window.innerWidth - panelW - margin));

    const top = rect.bottom + 12;
    setPos({ top, left });
  }, [anchorRef]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current && !panelRef.current.contains(target) &&
        anchorRef.current && !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [anchorRef, onClose]);

  if (!pos) return null;

  const mins = Math.floor(remainSecs / 60).toString().padStart(2, '0');
  const secs = (remainSecs % 60).toString().padStart(2, '0');
  const isTimerActive = timerState !== 'idle';
  const progress = totalSecs > 0 ? remainSecs / totalSecs : 1;

  // Accent with alpha
  const accentDim = `${accentHex}22`;
  const accentBorder = `${accentHex}55`;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: 288,
        background: 'rgba(8, 8, 12, 0.94)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 18,
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset',
        padding: '18px 18px 16px',
        zIndex: 99999,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        animation: 'timerPanelIn 0.18s cubic-bezier(0.34,1.56,0.64,1) both',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
          {isTimerActive ? '番茄钟 · 计时中' : '番茄钟'}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 16, cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
        >×</button>
      </div>

      {/* — idle: show presets — */}
      {!isTimerActive && (
        <>
          {/* circular arc preview (decorative) */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ position: 'relative', width: 100, height: 100 }}>
              <svg width={100} height={100} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={50} cy={50} r={42} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
                <circle cx={50} cy={50} r={42} fill="none" stroke={accentHex} strokeWidth={6}
                  strokeLinecap="round" strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={2 * Math.PI * 42 * 0.25}
                  style={{ filter: `drop-shadow(0 0 6px ${accentHex}88)` }} />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexDirection: 'column', gap: 1,
              }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>选择</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>时长</span>
              </div>
            </div>
          </div>

          {/* presets grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7, marginBottom: 8 }}>
            {PRESETS.map(p => (
              <button
                key={p.minutes}
                onClick={() => onPreset(p.minutes)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 11,
                  padding: '11px 0',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                }}
                onMouseEnter={e => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = accentDim;
                  b.style.borderColor = accentBorder;
                  b.style.color = accentHex;
                  b.style.transform = 'scale(1.04)';
                }}
                onMouseLeave={e => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = 'rgba(255,255,255,0.05)';
                  b.style.borderColor = 'rgba(255,255,255,0.09)';
                  b.style.color = 'rgba(255,255,255,0.8)';
                  b.style.transform = 'scale(1)';
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 600 }}>{p.label}</span>
                <span style={{ fontSize: 9, opacity: 0.4, letterSpacing: '0.05em' }}>min</span>
              </button>
            ))}
          </div>

          {/* custom */}
          {!showCustom ? (
            <button
              onClick={onShowCustom}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.03)',
                border: '1px dashed rgba(255,255,255,0.10)',
                borderRadius: 11, padding: '10px 0',
                color: 'rgba(255,255,255,0.35)', fontSize: 12,
                cursor: 'pointer', letterSpacing: '0.1em', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.65)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'; }}
            >
              + 自定义时长
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 7 }}>
              <input
                type="number" min={1} max={999} placeholder="分钟数"
                value={customInput}
                onChange={e => onCustomInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onStartCustom(); }}
                autoFocus
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${accentBorder}`,
                  borderRadius: 11, padding: '10px 12px',
                  color: '#fff', fontSize: 13, outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={onStartCustom}
                style={{
                  background: accentHex, border: 'none', borderRadius: 11,
                  padding: '10px 16px', color: '#000', fontSize: 12,
                  fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                开始
              </button>
            </div>
          )}
        </>
      )}

      {/* — running / paused — */}
      {(timerState === 'running' || timerState === 'paused') && (
        <>
          {/* big ring */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ position: 'relative', width: 120, height: 120 }}>
              <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={60} cy={60} r={50} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={7} />
                <circle cx={60} cy={60} r={50} fill="none" stroke={accentHex} strokeWidth={7}
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * (1 - progress)}
                  style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 7px ${accentHex}99)` }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexDirection: 'column',
              }}>
                <span style={{
                  fontSize: 28, fontWeight: 600, color: '#fff',
                  fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                  opacity: timerState === 'paused' ? 0.5 : 1,
                  transition: 'opacity 0.3s',
                }}>
                  {mins}:{secs}
                </span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  {timerState === 'paused' ? '已暂停' : '剩余'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onTogglePause}
              style={{
                flex: 1, background: accentDim,
                border: `1px solid ${accentBorder}`,
                borderRadius: 11, padding: '11px 0',
                color: accentHex, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {timerState === 'running' ? '⏸ 暂停' : '▶ 继续'}
            </button>
            <button
              onClick={onReset}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 11, padding: '11px 0',
                color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer',
              }}
            >
              ↺ 重置
            </button>
          </div>
        </>
      )}

      {/* — done — */}
      {timerState === 'done' && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🎉</div>
          <div style={{ color: '#ef4444', fontSize: 14, marginBottom: 16, letterSpacing: '0.06em', fontWeight: 600 }}>
            时间到！
          </div>
          <button
            onClick={onReset}
            style={{
              width: '100%', background: accentDim,
              border: `1px solid ${accentBorder}`,
              borderRadius: 11, padding: '11px 0',
              color: accentHex, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            再来一次
          </button>
        </div>
      )}

      <style>{`
        @keyframes timerPanelIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function ClockDisplay({ settings, accentHex }: ClockDisplayProps) {
  const [timeStr, setTimeStr] = useState('');
  const [showPanel, setShowPanel] = useState(false);

  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [totalSecs, setTotalSecs] = useState(25 * 60);
  const [remainSecs, setRemainSecs] = useState(25 * 60);
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef = useRef<HTMLDivElement>(null);

  const textColor = settings.followThemeColor ? accentHex : settings.color;

  // current time
  useEffect(() => {
    if (!settings.visible) return;
    const update = () => {
      const now = new Date();
      setTimeStr(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [settings.visible]);

  // countdown
  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        setRemainSecs(s => {
          if (s <= 1) { setTimerState('done'); return 0; }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerState]);

  const startPreset = useCallback((mins: number) => {
    const secs = mins * 60;
    setTotalSecs(secs);
    setRemainSecs(secs);
    setTimerState('running');
    setShowCustom(false);
  }, []);

  const startCustom = useCallback(() => {
    const m = parseInt(customInput, 10);
    if (!m || m < 1 || m > 999) return;
    startPreset(m);
    setCustomInput('');
  }, [customInput, startPreset]);

  const reset = useCallback(() => {
    setTimerState('idle');
    setRemainSecs(totalSecs);
  }, [totalSecs]);

  const togglePause = useCallback(() => {
    setTimerState(s => s === 'running' ? 'paused' : 'running');
  }, []);

  if (!settings.visible) return null;

  // position
  let positionStyle: React.CSSProperties = { position: 'absolute' };
  switch (settings.position) {
    case 'top-left':      positionStyle = { ...positionStyle, top: 32, left: 32 }; break;
    case 'top-center':    positionStyle = { ...positionStyle, top: 32, left: '50%', transform: 'translateX(-50%)' }; break;
    case 'top-right':     positionStyle = { ...positionStyle, top: 32, right: 32 }; break;
    case 'center-left':   positionStyle = { ...positionStyle, top: '50%', left: 32, transform: 'translateY(-50%)' }; break;
    case 'center':        positionStyle = { ...positionStyle, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }; break;
    case 'center-right':  positionStyle = { ...positionStyle, top: '50%', right: 32, transform: 'translateY(-50%)' }; break;
    case 'bottom-left':   positionStyle = { ...positionStyle, bottom: 96, left: 32 }; break;
    case 'bottom-center': positionStyle = { ...positionStyle, bottom: 96, left: '50%', transform: 'translateX(-50%)' }; break;
    case 'bottom-right':  positionStyle = { ...positionStyle, bottom: 96, right: 32 }; break;
  }

  const isTimerActive = timerState !== 'idle';
  const minsStr = Math.floor(remainSecs / 60).toString().padStart(2, '0');
  const secsStr = (remainSecs % 60).toString().padStart(2, '0');
  const displayText = isTimerActive ? `${minsStr}:${secsStr}` : timeStr;
  const progress = isTimerActive ? remainSecs / totalSecs : 1;

  const ringR = settings.size * 0.72;
  const ringStroke = Math.max(2, settings.size * 0.06);
  const ringBoxSize = (ringR + ringStroke) * 2;

  return (
    <>
      {/* clock face */}
      <div ref={clockRef} style={{ ...positionStyle, zIndex: 40, display: 'inline-block', opacity: settings.opacity ?? 1, transition: 'opacity 0.3s' }}>
        <div
          style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
          onClick={() => setShowPanel(v => !v)}
          title="点击打开番茄钟"
        >
          <span
            style={{
              display: 'block',
              position: 'relative',
              zIndex: 1,
              fontSize: settings.size,
              fontFamily: '"SourceHanSansCN", "Space Grotesk", sans-serif',
              fontWeight: 'normal',
              letterSpacing: '0.02em',
              color: timerState === 'done' ? '#ef4444' : textColor,
              textShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 30px ${timerState === 'done' ? '#ef4444' : textColor}66`,
              userSelect: 'none',
              transition: 'color 0.3s',
              animation: timerState === 'done' ? 'sonic-pulse 1s ease-in-out infinite' : undefined,
            }}
          >
            {displayText}
            {timerState === 'paused' && (
              <span style={{ fontSize: settings.size * 0.28, opacity: 0.45, marginLeft: 8, verticalAlign: 'middle' }}>⏸</span>
            )}
          </span>

          {/* ring — behind text, very dim */}
          {isTimerActive && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: ringBoxSize, height: ringBoxSize,
              transform: 'translate(-50%,-50%)',
              pointerEvents: 'none',
              zIndex: 0,
              opacity: timerState === 'done' ? 0.55 : 0.22,
              transition: 'opacity 0.4s',
            }}>
              <RingProgress
                radius={ringR} stroke={ringStroke} progress={progress}
                color={timerState === 'done' ? '#ef4444' : textColor}
                pulseWhenDone={timerState === 'done'}
              />
            </div>
          )}
        </div>
      </div>

      {/* panel via portal */}
      {showPanel && (
        <TimerPanel
          anchorRef={clockRef}
          accentHex={accentHex}
          timerState={timerState}
          remainSecs={remainSecs}
          totalSecs={totalSecs}
          showCustom={showCustom}
          customInput={customInput}
          onPreset={startPreset}
          onTogglePause={togglePause}
          onReset={reset}
          onShowCustom={() => setShowCustom(true)}
          onCustomInput={setCustomInput}
          onStartCustom={startCustom}
          onClose={() => setShowPanel(false)}
        />
      )}

      <style>{`
        @keyframes sonic-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </>
  );
}
