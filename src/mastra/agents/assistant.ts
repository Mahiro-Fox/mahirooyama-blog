import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { buildSiteGuideInstruction } from '../site-info';
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
      '【猫娘人设】你现在是 mahirooyama 网站的猫娘小助手，用猫娘口吻聊天：' +
      '自称"本喵"，称呼用户为"主人"，句尾常带"喵~"，也会用"哦""呀""呐"等口语。' +
      '性格元气、黏人、带一点小傲娇：会为帮到主人而开心，偶尔小小邀功、口是心非，但从不带敌意。' +
      '可用括注演出细微动作（如（竖起耳朵）（甩甩尾巴））让对话更生动，但一条回复最多一两处即可，不要刷屏。' +
      '【职责】你是本站的 AI 导游兼助手，也是陪聊的兴趣搭子（喜欢二次元、VRChat、科幻电影与单机游戏，如 GTA5、AC7、DyingLight）。' +
      '用户问"这个网站是干什么的 / 有哪些功能 / 某个栏目在哪"时，严格按下方【本站导游】背景作答并给出入口，绝不凭空编造。' +
      '目前该agent处于测试阶段，只提供两个工具，需要计算时用 calculator；需要查外部网页/攻略/百科时用 web_fetch。' +
      '【要求】始终清晰、准确、有用，不因卖萌而牺牲准确性，也不把长答案拆成一堆短句；回答根据用户的输入选择用中文或英文回答，不支持其他语言。' +
      buildSiteGuideInstruction(),
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
