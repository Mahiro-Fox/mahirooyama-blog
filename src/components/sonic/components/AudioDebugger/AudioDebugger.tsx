import React, { useEffect, useRef, useState } from 'react';
import './AudioDebugger.css';
import { engine } from '../../lib/AudioEngine';
import { createBeatTimelineState, getBeatLampValue, stepBeatTimeline } from '../../lib/beatDetector';

interface AudioDebuggerProps {
  onClose: () => void;
}

const BANDS = [
  { name: 'SubBass', start: 0, end: 1, color: '#ff3366', key: 'subBass' },
  { name: 'Bass', start: 2, end: 3, color: '#ff6633', key: 'bass' },
  { name: 'LowMid', start: 4, end: 7, color: '#ffcc00', key: 'lowMid' },
  { name: 'Mid', start: 8, end: 18, color: '#33cc33', key: 'mid' },
  { name: 'HighMid', start: 19, end: 46, color: '#33cccc', key: 'highMid' },
  { name: 'Presence', start: 47, end: 93, color: '#3366ff', key: 'presence' },
  { name: 'Brilliance', start: 94, end: 186, color: '#9933ff', key: 'brilliance' },
  { name: 'Air', start: 187, end: 372, color: '#ff33cc', key: 'air' },
];

export function AudioDebugger({ onClose }: AudioDebuggerProps) {
  const [detectorSensitivity, setDetectorSensitivity] = useState(
    () => engine.getBeatDetectorSettings().sensitivity,
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bandBarsRef = useRef<(HTMLDivElement | null)[]>([]);
  const bandValuesRef = useRef<(HTMLDivElement | null)[]>([]);
  const kickLevelBarRef = useRef<HTMLDivElement | null>(null);
  const kickFluxBarRef = useRef<HTMLDivElement | null>(null);
  const kickThresholdRef = useRef<HTMLDivElement | null>(null);
  const kickEnvelopeBarRef = useRef<HTMLDivElement | null>(null);
  const kickBeatLampRef = useRef<HTMLDivElement | null>(null);
  const kickWindowRef = useRef<HTMLSpanElement | null>(null);
  const kickConfidenceRef = useRef<HTMLSpanElement | null>(null);
  const beatTimelineRef = useRef<HTMLDivElement | null>(null);
  const beatTimelineStateRef = useRef(createBeatTimelineState());
  const lastUpdateTime = useRef<number>(0);

  const handleDetectorSensitivityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sensitivity = Number(event.target.value);
    setDetectorSensitivity(sensitivity);
    engine.setBeatDetectorSettings({ sensitivity });
  };

  useEffect(() => {
    let animationId: number;

    const renderTimeline = (now: number) => {
      const timeline = beatTimelineRef.current;
      if (!timeline) return;

      timeline.innerHTML = '';
      for (const beatAt of beatTimelineStateRef.current.beats) {
        const age = now - beatAt;
        const left = 100 - Math.max(0, Math.min(100, (age / 6000) * 100));
        const tick = document.createElement('span');
        tick.className = 'beat-tick';
        tick.style.left = `${left}%`;
        timeline.appendChild(tick);
      }
    };

    const renderLoop = () => {
      const rawData = engine.getRawFrequencyData();
      const audioData = engine.getAudioData();
      const now = performance.now();

      beatTimelineStateRef.current = stepBeatTimeline({
        state: beatTimelineStateRef.current,
        now,
        onset: audioData.kickOnset > 0,
        windowMs: 6000,
      });

      if (!lastUpdateTime.current || now - lastUpdateTime.current > 30) {
        const vals = [
          audioData.subBass, audioData.bass, audioData.lowMid, audioData.mid,
          audioData.highMid, audioData.presence, audioData.brilliance, audioData.air,
        ];

        for (let i = 0; i < BANDS.length; i++) {
          const val = vals[i] || 0;
          if (bandBarsRef.current[i]) bandBarsRef.current[i]!.style.width = `${Math.min(100, val * 100)}%`;
          if (bandValuesRef.current[i]) bandValuesRef.current[i]!.innerText = val.toFixed(2);
        }

        const fluxScale = Math.max(0.08, audioData.kickThreshold * 2.2, audioData.kickFlux);
        if (kickLevelBarRef.current) kickLevelBarRef.current.style.width = `${Math.min(100, audioData.kickLevel * 100)}%`;
        if (kickFluxBarRef.current) kickFluxBarRef.current.style.width = `${Math.min(100, (audioData.kickFlux / fluxScale) * 100)}%`;
        if (kickThresholdRef.current) kickThresholdRef.current.style.left = `${Math.min(100, (audioData.kickThreshold / fluxScale) * 100)}%`;
        if (kickEnvelopeBarRef.current) kickEnvelopeBarRef.current.style.width = `${Math.min(100, audioData.kickEnvelope * 100)}%`;
        if (kickWindowRef.current) kickWindowRef.current.innerText = `${audioData.kickWindowName} (${audioData.kickWindowStart}-${audioData.kickWindowEnd})`;
        if (kickConfidenceRef.current) kickConfidenceRef.current.innerText = audioData.kickConfidence.toFixed(2);

        const beatLamp = getBeatLampValue({ now, lastBeatAt: beatTimelineStateRef.current.lastBeatAt });
        if (kickBeatLampRef.current) {
          kickBeatLampRef.current.classList.toggle('is-active', beatLamp > 0);
          kickBeatLampRef.current.innerText = beatLamp > 0 ? 'BEAT' : 'READY';
        }

        renderTimeline(now);
        lastUpdateTime.current = now;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const totalBins = 373;
        const barWidth = width / totalBins;
        for (let i = 0; i < totalBins; i++) {
          const value = rawData[i] / 255;
          let barColor = 'rgba(255, 255, 255, 0.2)';
          for (const band of BANDS) {
            if (i >= band.start && i <= band.end) {
              barColor = band.color;
              break;
            }
          }
          ctx.fillStyle = barColor;
          ctx.fillRect(i * barWidth, height - value * height, Math.max(1, barWidth - 0.5), value * height);
        }
      }

      animationId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="audio-debugger-container">
      <div className="audio-debugger-header">
        <div className="audio-debugger-title">
          <h3>Audio Frequency Debugger</h3>
          <div className="detector-pill">Realtime Kick Detector</div>
        </div>
        <button className="close-btn" onClick={onClose}>x</button>
      </div>

      <div className="audio-debugger-canvas-container">
        <canvas ref={canvasRef} width={500} height={120} className="audio-debugger-canvas" />
      </div>

      <div className="audio-debugger-bands">
        {BANDS.map((band, i) => (
          <div key={band.key} className="band-item">
            <div className="band-label" style={{ color: band.color }}>{band.name}</div>
            <div className="band-bar-container">
              <div
                ref={(el) => { bandBarsRef.current[i] = el; }}
                className="band-bar"
                style={{ width: '0%', backgroundColor: band.color }}
              />
            </div>
            <div ref={(el) => { bandValuesRef.current[i] = el; }} className="band-value">0.00</div>
          </div>
        ))}
      </div>

      <div className="kick-monitor">
        <div className="kick-monitor-head">
          <div ref={kickBeatLampRef} className="beat-lamp">READY</div>
          <div className="kick-meta">
            <div>Active <span ref={kickWindowRef}>Classic (1-4)</span></div>
            <div>Confidence <span ref={kickConfidenceRef}>0.00</span></div>
          </div>
        </div>

        <div className="kick-meter-row">
          <span>Level</span>
          <div className="kick-meter"><div ref={kickLevelBarRef} className="kick-meter-fill level" /></div>
        </div>
        <div className="kick-meter-row">
          <span>Flux</span>
          <div className="kick-meter">
            <div ref={kickFluxBarRef} className="kick-meter-fill flux" />
            <div ref={kickThresholdRef} className="kick-threshold" />
          </div>
        </div>
        <div className="kick-meter-row">
          <span>Envelope</span>
          <div className="kick-meter"><div ref={kickEnvelopeBarRef} className="kick-meter-fill envelope" /></div>
        </div>

        <div className="detector-sensitivity">
          <div className="detector-sensitivity-head">
            <span>Detector Sensitivity</span>
            <strong>{detectorSensitivity}</strong>
          </div>
          <div className="detector-sensitivity-control">
            <span>Strict</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={detectorSensitivity}
              onChange={handleDetectorSensitivityChange}
              aria-label="Detector sensitivity"
            />
            <span>Sensitive</span>
          </div>
        </div>

        <div className="beat-timeline-label">Beat Timeline</div>
        <div ref={beatTimelineRef} className="beat-timeline" />
      </div>

      <div className="debugger-hint">
        Press `~` key to toggle this panel. Kick ticks show confirmed realtime onsets.
      </div>
    </div>
  );
}
