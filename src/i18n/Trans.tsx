import { useMemo } from 'react';
import { useT } from '@/i18n/dictionary-provider';
import { parseTemplate } from './parseTemplate';
import { renderTransNodes } from './renderTransNodes';

type ComponentsMap = Record<string, React.ComponentType<any>>;

interface TransProps {
  i18nKey: string;
  fallback?: string;
  values?: Record<string, string | number>;
  components?: ComponentsMap;
}

function interpolate(text: string, values?: Record<string, string | number>) {
  if (!values) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => String(values[k] ?? ''));
}

export function Trans({ i18nKey, values, components = {} }: TransProps) {
  const t = useT();
  const raw = t(i18nKey);
  const text = interpolate(raw, values);
  const nodes = useMemo(() => parseTemplate(text), [text]);

  return <>{renderTransNodes(nodes, components)}</>;
}
