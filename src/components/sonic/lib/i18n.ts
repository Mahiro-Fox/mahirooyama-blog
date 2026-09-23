import { useState, useEffect } from 'react';

export type Language = 'zh' | 'en';

import { locales } from './locales';

export const i18nDict: Record<string, { zh: string; en: string }> = {
  ...locales,
  // Sidebar Left
  'nav.visualize': { zh: '可视化', en: 'VISUAL' },
  'nav.settings': { zh: '设置', en: 'SETTINGS' },
  'nav.search': { zh: '搜索', en: 'SEARCH' },
  'nav.netease': { zh: '网易云', en: 'NETEASE' },
  'nav.qqmusic': { zh: 'QQ音乐', en: 'QQ MUSIC' },
  'nav.playlist': { zh: '歌单', en: 'PLAYLIST' },
  'nav.input': { zh: 'INPUT', en: 'INPUT' },
  'nav.example': { zh: '示例', en: 'EXAMPLE' },
  'nav.upload': { zh: '上传', en: 'UPLOAD' },
  'nav.perspective': { zh: '视角', en: 'VIEW' },
  'nav.fullscreen': { zh: '全屏', en: 'FULLSCREEN' },
  'nav.exit_fullscreen': { zh: '退出', en: 'EXIT' },
  'nav.hint': { zh: '或将鼠标滑到左侧打开侧边栏', en: 'OR HOVER LEFT TO OPEN SIDEBAR' },
  'nav.lang_toggle': { zh: '中/EN', en: '中/EN' }
};

let currentLang: Language = 'zh';
if (typeof window !== 'undefined') {
  const stored = window.localStorage.getItem('app_language') as Language;
  currentLang = stored === 'en' ? 'en' : 'zh';
}

const listeners = new Set<(lang: Language) => void>();

export function setLanguage(lang: Language) {
  currentLang = lang;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('app_language', lang);
  }
  listeners.forEach(l => l(lang));
}

export function useLanguage() {
  const [lang, setLang] = useState<Language>(currentLang);
  
  useEffect(() => {
    listeners.add(setLang);
    return () => {
      listeners.delete(setLang);
    };
  }, []);
  
  return lang;
}

export function t(key: string, lang: Language = currentLang): string {
  if (i18nDict[key]) {
    return i18nDict[key][lang] || i18nDict[key]['zh'] || key;
  }
  return key;
}
