/**
 * 前端埋点工具函数
 * 用于收集用户行为数据并发送到后端 API
 */

// 埋点 API 端点
const ANALYTICS_API_URL = '/api/analytics';

/**
 * 通用埋点函数
 * @param eventName - 事件名称（如：page_view, click_moment_image, submit_comment）
 * @param properties - 事件附加属性（如：{ moment_id: "123" }）
 */
export function trackEvent(
  eventName: string,
  properties: Record<string, any> = {}
) {
  // 确保只在客户端执行
  if (typeof window === 'undefined') {
    return;
  }

  // 自动抓取基础环境数据
  const eventData = {
    event: eventName,
    url: window.location.pathname,
    referrer: document.referrer,
    screen: `${window.screen.width}x${window.screen.height}`,
    properties,
    timestamp: new Date().toISOString(),
  };

  // 将数据转换为 JSON 字符串
  const data = JSON.stringify(eventData);

  // 优先使用 navigator.sendBeacon（异步、不阻塞页面加载）
  if (navigator.sendBeacon) {
    const blob = new Blob([data], { type: 'application/json' });
    navigator.sendBeacon(ANALYTICS_API_URL, blob);
  } else {
    // 降级使用 fetch（keepalive: true 确保页面卸载时也能发送）
    fetch(ANALYTICS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data,
      keepalive: true,
    }).catch((error) => {
      console.error('埋点数据发送失败:', error);
    });
  }
}

/**
 * 页面访问埋点（PV/UV）
 * 在页面加载时调用，自动记录当前页面访问
 */
export function trackPageView() {
  trackEvent('page_view');
}
