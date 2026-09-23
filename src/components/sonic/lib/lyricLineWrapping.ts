export function clampMaxCharsPerLine(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function chunkText(text: string, maxChars: number) {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += maxChars) {
    chunks.push(text.slice(index, index + maxChars));
  }
  return chunks;
}

function splitOverwideMeasuredToken(
  token: string,
  maxWidth: number,
  measureText: (value: string) => number,
) {
  const chunks: string[] = [];
  let current = '';

  for (const char of Array.from(token)) {
    const next = current + char;
    if (current && measureText(next) > maxWidth) {
      chunks.push(current);
      current = char;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export function splitLineToMeasuredWidth(
  line: string,
  maxWidth: number,
  measureText: (value: string) => number,
) {
  const normalized = line.trim().replace(/\s+/g, ' ');
  if (!normalized) return [''];
  if (measureText(normalized) <= maxWidth) return [normalized];

  const measuredMaxWidth = Math.max(1, maxWidth);
  if (!/\s/.test(normalized)) {
    return splitOverwideMeasuredToken(normalized, measuredMaxWidth, measureText);
  }

  const chunks: string[] = [];
  let current = '';

  for (const word of normalized.split(' ')) {
    if (measureText(word) > measuredMaxWidth) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      chunks.push(...splitOverwideMeasuredToken(word, measuredMaxWidth, measureText));
      continue;
    }

    const next = current ? `${current} ${word}` : word;
    if (current && measureText(next) > measuredMaxWidth) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks.length ? chunks : [''];
}

export function wrapLyricTextLines(text: string, maxCharsPerLine: number) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized) return [''];

  const maxChars = Math.max(1, Math.round(maxCharsPerLine));
  if (!/\s/.test(normalized)) return chunkText(normalized, maxChars);

  const lines: string[] = [];
  let current = '';

  for (const word of normalized.split(' ')) {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = '';
      }
      lines.push(...chunkText(word, maxChars));
      continue;
    }

    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [''];
}
