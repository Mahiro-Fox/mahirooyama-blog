import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
/**
 * 格式化日期，不包含秒
 * @param input 日期或时间戳
 * @returns 格式化后的日期字符串
 */
export function formatDate(input: string | number): string {
  const date = new Date(input);
  return date.toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
}
/**
 * 格式化日期，包含时分秒
 * @param input 日期或时间戳
 * @returns 格式化后的日期+时间字符串
 */
export function formatDateWithHMS(input: string | number): string {
  const date = new Date(input);
  return date.toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
/**
 * 生成绝对URL
 * @param path 相对路径
 * @returns 绝对URL
 */
export function absoluteUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}${path}`;
}
/**
 * 截断文本，超过最大长度时添加省略号
 * @param inputText 输入文本
 * @param maxLength 最大长度
 * @returns 截断后的文本
 */
export function truncateText(inputText: string, maxLength: number): string {
  return inputText.length > maxLength
    ? inputText.slice(0, maxLength) + '...'
    : inputText;
}

/**
 * 防抖函数
 * @param fn 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * 节流函数
 * @param fn 要节流的函数
 * @param limit 限制时间（毫秒）
 * @returns 节流后的函数
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * 格式化文件大小为人类可读格式
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isEmail(email?: string): boolean {
  if (!email) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}
