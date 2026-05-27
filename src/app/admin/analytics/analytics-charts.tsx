'use client';

import { useMemo } from 'react';
import { type AnalyticsLog } from '@/actions/admin/analytics-actions';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// 图表颜色配置
const COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00c49f',
  '#ff8042',
  '#8dd1e1',
  '#d084d0',
];

// 按日期分组数据并统计每天的访问量
const groupLogsByDate = (logs: AnalyticsLog[]) => {
  const dateMap = new Map<string, number>();

  logs.forEach((log) => {
    const date = new Date(log.timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dateMap.set(date, (dateMap.get(date) || 0) + 1);
  });

  // 转换为数组并按日期排序
  const sortedData = Array.from(dateMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => {
      const dateA = new Date(a.date.replace(/\//g, '-'));
      const dateB = new Date(b.date.replace(/\//g, '-'));
      return dateA.getTime() - dateB.getTime();
    });

  return sortedData;
};

// 按设备类型分组
const groupByDeviceType = (logs: AnalyticsLog[]) => {
  const deviceMap = new Map<string, number>();
  logs.forEach((log) => {
    const type = log.device.isMobile ? '移动端' : '桌面端';
    deviceMap.set(type, (deviceMap.get(type) || 0) + 1);
  });
  return Array.from(deviceMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));
};

// 按操作系统分组
const groupByOS = (logs: AnalyticsLog[]) => {
  const osMap = new Map<string, number>();
  logs.forEach((log) => {
    const os = log.device.os || '未知';
    osMap.set(os, (osMap.get(os) || 0) + 1);
  });
  return Array.from(osMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

// 按浏览器分组
const groupByBrowser = (logs: AnalyticsLog[]) => {
  const browserMap = new Map<string, number>();
  logs.forEach((log) => {
    const browser = log.device.browser || '未知';
    browserMap.set(browser, (browserMap.get(browser) || 0) + 1);
  });
  return Array.from(browserMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

// 按事件类型分组
const groupByEvent = (logs: AnalyticsLog[]) => {
  const eventMap = new Map<string, number>();
  logs.forEach((log) => {
    eventMap.set(log.event, (eventMap.get(log.event) || 0) + 1);
  });
  return Array.from(eventMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

// 按访问页面分组（Top 10）
const groupByUrl = (logs: AnalyticsLog[]) => {
  const urlMap = new Map<string, number>();
  logs.forEach((log) => {
    const url = log.url || '/';
    urlMap.set(url, (urlMap.get(url) || 0) + 1);
  });
  return Array.from(urlMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
};

// 按国家分组（Top 10）
const groupByCountry = (logs: AnalyticsLog[]) => {
  const countryMap = new Map<string, number>();
  logs.forEach((log) => {
    const country =
      log.location.country !== 'unknown' ? log.location.country : '未知';
    countryMap.set(country, (countryMap.get(country) || 0) + 1);
  });
  return Array.from(countryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
};

interface AnalyticsChartsProps {
  logs: AnalyticsLog[];
}

export default function AnalyticsCharts({ logs }: AnalyticsChartsProps) {
  const chartData = useMemo(() => groupLogsByDate(logs), [logs]);
  const deviceTypeData = useMemo(() => groupByDeviceType(logs), [logs]);
  const osData = useMemo(() => groupByOS(logs), [logs]);
  const browserData = useMemo(() => groupByBrowser(logs), [logs]);
  const eventData = useMemo(() => groupByEvent(logs), [logs]);
  const urlData = useMemo(() => groupByUrl(logs), [logs]);
  const countryData = useMemo(() => groupByCountry(logs), [logs]);

  return (
    <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-2">
      {/* 每日访问趋势折线图 */}
      <div className="bg-card col-span-full rounded-lg border p-6">
        <h3 className="mb-4 text-lg font-semibold">每日访问趋势</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#8884d8"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 设备类型饼图 */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="mb-4 text-lg font-semibold">设备类型</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={deviceTypeData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {deviceTypeData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 操作系统饼图 */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="mb-4 text-lg font-semibold">操作系统</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={osData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {osData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 浏览器饼图 */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="mb-4 text-lg font-semibold">浏览器</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={browserData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {browserData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 事件类型饼图 */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="mb-4 text-lg font-semibold">事件类型</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={eventData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {eventData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 访问页面柱状图 Top 10 */}
      <div className="bg-card col-span-full rounded-lg border p-6">
        <h3 className="mb-4 text-lg font-semibold">热门访问页面 Top 10</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={urlData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis
              dataKey="name"
              type="category"
              width={300}
              tick={{ fontSize: 12 }}
            />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 国家/地区柱状图 Top 10 */}
      <div className="bg-card col-span-full rounded-lg border p-6">
        <h3 className="mb-4 text-lg font-semibold">访问来源国家/地区 Top 10</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={countryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
