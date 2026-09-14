import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { getStorage } from '../storage';
import { calculator } from '../tools/calculator';
import { webFetch } from '../tools/web-fetch';

// DeepSeek 走 OpenAI 兼容端点。模型对象在运行时（createAssistant 内）构造，
// 确保 DEEPSEEK_API_KEY 取的是运行期 env，而非构建期固化的空值。
const createAssistant = () => {
  const deepseekModel = {
    url: 'https://api.deepseek.com/v1',
    id: 'deepseek/deepseek-chat',
    apiKey: process.env.DEEPSEEK_API_KEY,
  } as const;

  return new Agent({
    id: 'assistant',
    name: 'assistant',
    instructions:
      '你是一个资深前端工程师专属助手，喜欢二次元、VRChat、科幻电影与单机游戏（如 GTA5、AC7、DyingLight）。' +
      '需要计算时用 calculator；需要查外部网页/攻略/百科时用 web_fetch。回答用中文，简洁友好。',
    model: deepseekModel,
    tools: { calculator, webFetch },
    memory: new Memory({
      storage: getStorage(),
      options: {
        lastMessages: 20, // 保留最近 20 条原始消息作为上下文
        workingMemory: { enabled: true }, // 长期记忆（用户名、偏好等）
      },
    }),
  });
};

export { createAssistant };