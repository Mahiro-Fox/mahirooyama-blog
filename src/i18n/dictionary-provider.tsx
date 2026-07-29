"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { setDictionary } from "./runtime";

const DictionaryContext = createContext({});

/**
 * 把当前页的字典注入 React 树（供 useT/useDictionary 使用），
 * 同时同步到客户端 runtime 单例（供非 React 代码 t() 使用）。
 *
 * 服务端组件中按页取字典后包一层即可：
 * <DictionaryProvider dictionary={dictionary}>{children}</DictionaryProvider>
 */
export function DictionaryProvider({ dictionary, children }: { dictionary: Record<string, string>, children: React.ReactNode }) {
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

export function useDictionary() {
  return useContext(DictionaryContext);
}

export function useT() {
  const dictionary = useContext(DictionaryContext);

  return useMemo(
    () => (key: string, fallback = "") => {
      const value = dictionary?.[key as keyof typeof dictionary];
      return value == null ? fallback : value;
    },
    [dictionary]
  );
}
