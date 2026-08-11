/**
 * 客户端本地化运行时
 *
 * 用于「无法使用 React Hook」的场景，比如 Redux thunk、HTTP 拦截器、工具函数等。
 * 在 React 组件中请优先使用 useT / useDictionary（来自 DictionaryProvider）。
 *
 * 数据流：服务端组件通过 getDictionary 读取字典 → 透传给 <DictionaryProvider>
 *  → Provider 在 useEffect 中调用 setDictionary 把当前页字典灌入这里 → t() 即时可读。
 *
 * 注意：这里的 currentDict 是模块级变量，Next.js SSR 时所有请求共享同一进程，
 * 因此在服务端不允许写入（避免请求间串读）；服务端组件请走 getDictionary。
 */

import { Dictionary } from '@/i18n/dictionary';

export type DictionaryListener = (dict: Dictionary) => void;

let currentDict: Dictionary = {};
const listeners = new Set<DictionaryListener>();
const isServer = typeof window === 'undefined';

export function setDictionary(dict: Dictionary | null | undefined): void {
  if (isServer) return;
  currentDict = dict || {};
  listeners.forEach((fn) => {
    try {
      fn(currentDict);
    } catch (e) {
      console.error('[i18n runtime] listener error:', e);
    }
  });
}

