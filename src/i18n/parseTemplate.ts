// parseTemplate.ts
export type TransNode = string | { tag: string; children: TransNode[] };

export function parseTemplate(template: string): TransNode[] {
  const tokenRegex = /<(\/?)([a-zA-Z][\w-]*)\s*(\/?)>/g;
  const root: TransNode[] = [];
  const stack: { tag: string; children: TransNode[] }[] = [];
  let currentChildren = root;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushText = (text: string) => {
    if (text) currentChildren.push(text);
  };

  while ((match = tokenRegex.exec(template))) {
    const [full, closing, tag, selfClosing] = match;
    pushText(template.slice(lastIndex, match.index));
    lastIndex = match.index + full.length;

    if (closing) {
      stack.pop();
      currentChildren = stack.length ? stack[stack.length - 1].children : root;
    } else {
      const node = { tag, children: [] as TransNode[] };
      currentChildren.push(node);
      if (!selfClosing) {
        stack.push(node);
        currentChildren = node.children;
      }
    }
  }
  pushText(template.slice(lastIndex));
  return root;
}
