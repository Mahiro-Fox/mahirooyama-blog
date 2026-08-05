import type { UIMessage } from 'ai';

export const MAX_CONTEXT_TOKENS = 24000;

const CJK_RANGE =
  /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;

function countTokensInText(text: string): number {
  let cjkCount = 0;
  let otherCount = 0;

  for (const char of text) {
    if (CJK_RANGE.test(char)) {
      cjkCount += 1;
    } else {
      otherCount += 1;
    }
  }

  return Math.ceil(cjkCount * 1.5 + otherCount / 3.5);
}

export function estimateTokens(messages: UIMessage[]): number {
  let total = 0;

  for (const message of messages) {
    if (!message.parts) continue;

    for (const part of message.parts) {
      if (part.type === 'text' && part.text) {
        total += countTokensInText(part.text);
      }
    }
  }

  return total;
}
