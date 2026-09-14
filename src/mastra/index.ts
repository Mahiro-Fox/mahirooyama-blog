import { Mastra } from '@mastra/core';
import { createAssistant } from './agents/assistant';
import { calculator } from './tools/calculator';
import { webFetch } from './tools/web-fetch';
import { getStorage } from './storage';

// Mastra 实例惰性单例：next build(standalone) 会在构建期执行 server 模块顶层，
// 若顶层实例化会连锁触发 getStorage() 读取缺失的运行时 env 而失败；故延迟到
// 首次调用（server 运行时，容器已注入 env）才创建。
let mastraInstance: Mastra | undefined;

const getMastra = (): Mastra => {
  if (!mastraInstance) {
    mastraInstance = new Mastra({
      agents: { assistant: createAssistant() },
      tools: { calculator, webFetch },
      storage: getStorage(),
    });
  }
  return mastraInstance;
};

// Server Action / 页面通过 getMastra().getAgent('assistant') 获取 Agent 实例
const assistantAgent = () => getMastra().getAgent('assistant');

export { getMastra, assistantAgent };