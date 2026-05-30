'use client';

import { useEffect } from 'react';
import { MonitorOff } from 'lucide-react';
import { toast } from 'sonner';

export function DeviceDetector() {
  useEffect(() => {
    // 只在客户端检测一次
    const checkDevice = () => {
      // 阈值通常设为 1024px (平板/移动端区间)
      if (window.innerWidth < 1024) {
        toast('建议使用桌面端访问', {
          description:
            '检测到您可能正在使用移动设备。为了获得最佳的管理后台操作体验，建议开启浏览器的“桌面版网站”模式或切换至 PC 端。',
          icon: <MonitorOff className="h-5 w-5 text-orange-500" />,
          duration: 6000,
          id: 'device-detection-toast', // 防止重复弹出（虽然只运行一次，但路由切换可能触发）
        });
      }
    };

    // 延迟一小会儿弹出，等页面加载稳定
    const timer = setTimeout(checkDevice, 1000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
