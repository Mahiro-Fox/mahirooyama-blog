import commonLocale from '../../public/language/common/locale.json';
import { i18nConfig } from './i18n.config';

type LocaleModule = { default: Record<string, Record<string, string>> };

// 静态字面量手动映射，方便 bundle 的 tree-shaking
const loaders: Record<string, () => Promise<LocaleModule>> = {
  home: () => import('../../public/language/home/locale.json'),
  header: () => import('../../public/language/header/locale.json'),
  footer: () => import('../../public/language/footer/locale.json'),
};

function pickLang(
  localeData: Record<string, Record<string, string>>,
  lang: string
) {
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
