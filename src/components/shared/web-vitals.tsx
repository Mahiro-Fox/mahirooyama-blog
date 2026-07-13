'use client';

import { useReportWebVitals } from 'next/web-vitals';

/**
 * Web Vitals 组件，用于在控制台输出性能指标
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    // metric 包含 id, name (指标名称), label, value, delta 等属性
    const { name, value, id } = metric;

    const formatValue = (name: string | symbol, value: number) => {
      if (name === 'CLS') return value.toFixed(3);
      return `${Math.round(value)}ms`;
    };

    const getLevel = (name: string | symbol, value: number) => {
      const thresholds = {
        FCP: [1800, 3000],
        LCP: [2500, 4000],
        FID: [100, 300],
        CLS: [0.1, 0.25],
        TTFB: [800, 1800],
      };

      const [good, poor] = thresholds[name as keyof typeof thresholds] || [];
      if (!good) return '🤔'; // next相关几个指标暂不处理
      return value <= good ? '✅' : value <= poor ? '⚠️' : '❌';
    };

    switch (name) {
      case 'FCP':
        console.log(
          `%c[FCP] 首次内容绘制: ${formatValue(name, value)} ${getLevel(name, value)}`,
          'color: #FFD700; font-weight: bold;'
        );
        break;

      case 'LCP':
        console.log(
          `%c[LCP] 最大内容绘制: ${formatValue(name, value)} ${getLevel(name, value)}`,
          'color: #40E0D0; font-weight: bold;'
        );
        break;

      case 'CLS':
        console.log(
          `%c[CLS] 累积布局偏移: ${formatValue(name, value)} ${getLevel(name, value)}`,
          'color: #4169E1; font-weight: bold;'
        );
        break;

      case 'FID':
        console.log(
          `%c[FID] 首次输入延迟: ${formatValue(name, value)} ${getLevel(name, value)}`,
          'color: #2E8B57; font-weight: bold;'
        );
        break;

      case 'TTFB':
        console.log(
          `%c[TTFB] 首字节时间: ${formatValue(name, value)} ${getLevel(name, value)}`,
          'color: #9370DB; font-weight: bold;'
        );
        break;

      case 'Next.js-hydration':
        console.log(
          `%c[Hydration] 页面水合时间: ${formatValue(name, value)}`,
          'color: #87CEEB; font-weight: bold;'
        );
        break;

      case 'Next.js-route-change-to-render':
        console.log(
          `%c[Route] 路由切换到渲染: ${formatValue(name, value)}`,
          'color: #DDA0DD; font-weight: bold;'
        );
        break;

      case 'Next.js-render':
        console.log(
          `%c[Render] 页面渲染时间: ${formatValue(name, value)}`,
          'color: #98FB98; font-weight: bold;'
        );
        break;
    }

    // 性能警告
    if (getLevel(name, value) === '❌') {
      console.warn(
        '%c性能警告 ⚡️%c',
        'background: #ff0000; color: white; padding: 2px 5px; border-radius: 3px; font-weight: bold;',
        'color: inherit;',
        {
          page: window.location.pathname,
          metric: name,
          value: formatValue(name, value),
          id,
        }
      );
    }

    // 你可以在这里将数据发送给你的分析服务端，例如 Google Analytics 或自定义日志
    // window.gtag('event', metric.name, {
    //   value: Math.round(metric.value),
    //   event_label: metric.id,
    //   non_interaction: true,
    // });
  });

  return null;
}
