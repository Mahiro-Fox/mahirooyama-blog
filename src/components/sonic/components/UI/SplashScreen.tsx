import React, { useEffect, useRef, useState } from 'react';

interface SplashScreenProps {
  /** 开屏动画完成（含渐出）后调用 */
  onComplete: () => void;
  /** 开屏显示时长（毫秒），默认 2700，之后淡出 300ms，总约 3 秒 */
  duration?: number;
  /** 页面背景色 (Hex) */
  surfaceColor?: string;
  /** 页面强调色 (Hex) */
  accentColor?: string;
}

const parseHex = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255 || 0;
  const g = parseInt(clean.slice(2, 4), 16) / 255 || 0;
  const b = parseInt(clean.slice(4, 6), 16) / 255 || 0;
  return [r, g, b];
};

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  duration = 2000,
  surfaceColor,
  accentColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fadeOut, setFadeOut] = useState(false);

  // ---- WebGL 初始化（完整保留） ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    // ---- Shader 源码 ----
    const vsSource = `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        vUv.y = 1.0 - vUv.y;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      varying vec2 vUv;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec3 u_surfaceColor;
      uniform vec3 u_accentColor;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                   mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        vec2 shift = vec2(100.0);
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for (int i = 0; i < 5; ++i) {
          value += amplitude * noise(p);
          p = rot * p * 2.0 + shift;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
        p *= 1.8;

        vec2 q = vec2(0.0);
        q.x = fbm(p + vec2(0.0, 0.0) + 0.04 * u_time);
        q.y = fbm(p + vec2(4.2, 1.1) + 0.03 * u_time);

        vec2 r = vec2(0.0);
        r.x = fbm(p + 3.0 * q + vec2(2.5, 7.5) + 0.06 * u_time);
        r.y = fbm(p + 3.0 * q + vec2(5.1, 3.2) + 0.05 * u_time);

        float f = fbm(p + 4.0 * r);

        vec3 baseBg = u_surfaceColor;
        vec3 deepBlue = mix(u_surfaceColor, u_accentColor, 0.3);
        vec3 midBlue = mix(u_surfaceColor, u_accentColor, 0.7);
        vec3 goldShine = vec3(0.780, 0.710, 0.520);
        vec3 warmLight = vec3(0.920, 0.890, 0.820);

        vec3 color = mix(baseBg, deepBlue, clamp(length(q) * 0.8, 0.0, 1.0));
        color = mix(color, midBlue, clamp(length(r.x) * 0.7, 0.0, 1.0));

        float goldMask = pow(f, 4.0) * 1.2;
        color += goldShine * goldMask * 0.9;

        float warmMask = pow(f, 8.0) * 1.6;
        color += warmLight * warmMask * 0.5;

        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        float vignette = 0.15 + 0.85 * pow(16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y), 0.22);
        color *= vignette;

        color = clamp(color, 0.0, 1.0);
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    // ---- 编译 Shader ----
    const createShader = (type: number, src: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = createShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    const positionAttr = gl.getAttribLocation(program, 'position');
    const resolutionUniform = gl.getUniformLocation(program, 'u_resolution');
    const timeUniform = gl.getUniformLocation(program, 'u_time');
    const surfaceColorUniform = gl.getUniformLocation(
      program,
      'u_surfaceColor'
    );
    const accentColorUniform = gl.getUniformLocation(program, 'u_accentColor');

    // ---- 顶点缓冲 ----
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    // ---- 尺寸调整 ----
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    // ---- 动画循环 ----
    let animationId: number;
    const render = (time: number) => {
      time *= 0.001;

      const sColor = surfaceColor
        ? parseHex(surfaceColor)
        : [0.031, 0.043, 0.075];
      const aColor = accentColor ? parseHex(accentColor) : [0.09, 0.17, 0.3];

      gl.clearColor(sColor[0], sColor[1], sColor[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.enableVertexAttribArray(positionAttr);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.vertexAttribPointer(positionAttr, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(resolutionUniform, canvas.width, canvas.height);
      gl.uniform1f(timeUniform, time);
      gl.uniform3f(surfaceColorUniform, sColor[0], sColor[1], sColor[2]);
      gl.uniform3f(accentColorUniform, aColor[0], aColor[1], aColor[2]);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationId = requestAnimationFrame(render);
    };
    render(0);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(buffer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 指定时长后触发淡出 ----
  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  // ---- 淡出动画结束后通知父组件 ----
  useEffect(() => {
    if (!fadeOut) return;
    const timer = setTimeout(() => {
      onComplete();
    }, 300); // 淡出过渡时间 300ms
    return () => clearTimeout(timer);
  }, [fadeOut, onComplete]);

  // ---- 鼠标/触摸倾斜交互 ----
  useEffect(() => {
    const titleWrap = document.querySelector(
      '.splash-title-wrap'
    ) as HTMLElement;
    if (!titleWrap) return;

    let mouseX = 0,
      mouseY = 0;
    let currentRotX = 0,
      currentRotY = 0;
    const MAX_ANGLE = 6;

    const onMove = (e: MouseEvent | TouchEvent) => {
      const rect = titleWrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let clientX, clientY;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      mouseX = Math.max(-1, Math.min(1, (clientX - cx) / (rect.width / 2)));
      mouseY = Math.max(-1, Math.min(1, (clientY - cy) / (rect.height / 2)));
    };

    const updateTilt = () => {
      const targetRotY = mouseX * MAX_ANGLE;
      const targetRotX = -mouseY * MAX_ANGLE;
      currentRotX += (targetRotX - currentRotX) * 0.08;
      currentRotY += (targetRotY - currentRotY) * 0.08;
      titleWrap.style.transform = `rotateX(${currentRotX}deg) rotateY(${currentRotY}deg)`;
      requestAnimationFrame(updateTilt);
    };
    updateTilt();

    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('mouseleave', () => {
      mouseX = 0;
      mouseY = 0;
    });

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
    };
  }, []);

  // ---- 渲染 ----
  return (
    <div
      ref={containerRef}
      className="splash-container"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'auto',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: surfaceColor || '#080c16',
        overflow: 'hidden',
        userSelect: 'none',
        perspective: '1200px',
      }}
    >
      {/* WebGL Canvas 背景 */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* 内容层（仅文字） */}
      <div
        className="splash-content"
        style={{
          position: 'relative',
          zIndex: 5,
          width: '86vw',
          maxWidth: '1160px',
          height: '62vh',
          maxHeight: '640px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 30px',
        }}
      >
        <div
          className="splash-title-wrap"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.2rem',
            width: '100%',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.08s cubic-bezier(0.1, 0.7, 0.3, 1)',
            willChange: 'transform',
          }}
        >
          {/* SONIC */}
          <div style={{ display: 'flex', transform: 'translateY(45px)' }}>
            {'SONIC'.split('').map((char, i, arr) => (
              <span
                key={i}
                style={{
                  fontSize: 'clamp(3.5rem, 8vw, 6.4rem)',
                  fontWeight: 400,
                  color: '#e8e1cf',
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  marginRight: i === arr.length - 1 ? 0 : '0.12em',
                  textShadow: '0 2px 12px rgba(0,0,0,0.4)',
                  opacity: 0,
                  animation: 'charFadeIn 0.8s ease-out forwards',
                  animationDelay: `${0.1 + i * 0.08}s`,
                }}
              >
                {char}
              </span>
            ))}
          </div>

          {/* TOPOGRAPHY */}
          <div style={{ display: 'flex', marginTop: '0.6rem' }}>
            {'TOPOGRAPHY'.split('').map((char, i, arr) => (
              <span
                key={i}
                style={{
                  fontSize: 'clamp(1.4rem, 3vw, 2.2rem)',
                  fontWeight: 400,
                  color: '#c9bc9c',
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  fontStyle: 'italic',
                  marginRight: i === arr.length - 1 ? 0 : '0.45em',
                  textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  opacity: 0,
                  animation: 'charFadeIn 0.8s ease-out forwards',
                  animationDelay: `${0.6 + i * 0.06}s`,
                }}
              >
                {char}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 全局关键帧动画 */}
      <style>{`
        @keyframes charFadeIn {
          0% { opacity: 0; filter: blur(4px); transform: translateY(4px); }
          100% { opacity: 1; filter: blur(0px); transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .splash-content { padding: 20px 20px; height: 56vh; max-height: 420px; width: 94vw; }
          .splash-title-wrap { gap: 0.1rem; }
          .splash-title-wrap > div:first-child span { font-size: clamp(2.2rem, 8vw, 3.6rem); }
          .splash-title-wrap > div:last-child span { font-size: clamp(1.8rem, 6vw, 3.0rem); }
        }
        @media (max-width: 480px) {
          .splash-content { padding: 14px 14px; height: 48vh; max-height: 340px; }
          .splash-title-wrap { gap: 0.05rem; }
          .splash-title-wrap > div:first-child span { font-size: clamp(1.8rem, 10vw, 2.6rem); }
          .splash-title-wrap > div:last-child span { font-size: clamp(1.5rem, 7vw, 2.2rem); }
        }
      `}</style>
    </div>
  );
};
