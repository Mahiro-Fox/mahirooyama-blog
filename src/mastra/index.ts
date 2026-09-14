import { Mastra } from '@mastra/core';
import { assistant } from './agents/assistant';
import { calculator } from './tools/calculator';
import { webFetch } from './tools/web-fetch';
import { storage } from './storage';

export const mastra = new Mastra({
  agents: { assistant },
  tools: { calculator, webFetch },
  storage,
});

// Server Action / 页面通过 mastra.getAgent('assistant') 获取 Agent 实例
export const assistantAgent = () => mastra.getAgent('assistant');