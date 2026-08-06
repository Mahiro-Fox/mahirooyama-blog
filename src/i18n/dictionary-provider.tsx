'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import { Dictionary } from '@/i18n/dictionary';
import { setDictionary } from './runtime';

const DictionaryContext = createContext({});

/**
 * 把当前页的字典注入 React 树（供 useT 使用），
 * 同时同步到客户端 runtime 单例（供非 React 代码 t() 使用）。
 *
 * 服务端组件中按页取字典后包一层即可：
 * <DictionaryProvider dictionary={dictionary}>{children}</DictionaryProvider>
 */

export function DictionaryProvider({
  dictionary,
  children,
}: {
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const value = useMemo(() => dictionary || {}, [dictionary]);

  useEffect(() => {
    setDictionary(value);
  }, [value]);

  return (
    <DictionaryContext.Provider value={value}>
      {children}
    </DictionaryContext.Provider>
  );
}

type TransOptions = Record<string, string | number>;

function interpolate(
  text: string,
  values?: Record<string, string | number>
): string {
  if (!values) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const val = values[key];
    return val == null ? match : String(val);
  });
}

export function useT() {
  const dictionary = useContext(DictionaryContext);

  return useMemo(
    () => (key: string, options?: TransOptions) => {
      const { ...values } = options ?? {};
      const raw = dictionary?.[key as keyof typeof dictionary];
      const text = raw == null ? '' : raw;
      return interpolate(text, values);
    },
    [dictionary]
  );
}
