import commonLocale from '../../public/language/common/locale.json';
import { i18nConfig } from './i18n.config';

export type Dictionary = Record<string, string | string[]>;
type LocaleModule = {
  default: Record<string, Dictionary>;
};

// 静态字面量手动映射，方便 bundle 的 tree-shaking
const loaders: Record<string, () => Promise<LocaleModule>> = {
  header: () => import('../../public/language/header/locale.json'),
  footer: () => import('../../public/language/footer/locale.json'),
  home: () => import('../../public/language/home/locale.json'),
  page: () => import('../../public/language/page/locale.json'),
  photos: () => import('../../public/language/photos/locale.json'),
  moments: () => import('../../public/language/moments/locale.json'),
  guestbook: () => import('../../public/language/guestbook/locale.json'),
  login: () => import('../../public/language/login/locale.json'),
  midi: () => import('../../public/language/midi/locale.json'),
  movies: () => import('../../public/language/movies/locale.json'),
  about: () => import('../../public/language/about/locale.json'),
  'bilibili-parse': () =>
    import('../../public/language/bilibili-parse/locale.json'),
  'image-compressor': () =>
    import('../../public/language/image-compressor/locale.json'),
};

function pickLang(localeData: Record<string, Dictionary>, lang: string) {
  return localeData?.[lang] || localeData?.[i18nConfig.defaultLang] || {};
}

/**
 * 仅供服务端组件使用：按当前语言取页面字典（自动合并 common 兜底层）。
 * 客户端组件请使用 useT/useDictionary；非 React 代码请使用 runtime 的 t()。
 */
export const getDictionary = async (
  lang = i18nConfig.defaultLang,
  key = ''
) => {
  if (!i18nConfig.locales.includes(lang)) {
    lang = i18nConfig.defaultLang;
  }

  const common = pickLang(commonLocale, lang);

  if (!key || key === 'common') return common;

  const loader = loaders[key];
  if (!loader) return common;

  const localeModule = await loader();
  const page = pickLang(localeModule.default, lang);

  return { ...common, ...page };
};
