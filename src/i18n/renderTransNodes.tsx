import { createElement, Fragment, ReactNode } from 'react';
import type { TransNode } from './parseTemplate';

type ComponentsMap = Record<string, React.ComponentType<any>>;

export function renderTransNodes(
  nodes: TransNode[],
  components: ComponentsMap,
  keyPrefix = 'n'
): ReactNode[] {
  return nodes.map((node, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (typeof node === 'string') return node;

    const children = renderTransNodes(node.children, components, key);
    const Comp = components[node.tag];

    if (Comp == null) {
      console.warn(`[Trans] 未提供 <${node.tag}> 对应的组件，已忽略标签`);
      return createElement(Fragment, { key }, ...children);
    }

    return createElement(Comp, { key }, ...children);
  });
}
