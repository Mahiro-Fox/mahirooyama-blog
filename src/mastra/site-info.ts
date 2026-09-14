// 本站站点知识库：作为"本站导游"注入 Agent instructions。
// 来源：src/config/common.ts 的功能/路由清单 + public/language/header/locale.json(cn) 功能描述 + home 定位文案。
// 维护：新增/调整本站对外功能时，同步更新 features/extras 数组即可（纯静态、无运行时依赖）。

interface SiteFeature {
  name: string;
  route: string;
  summary: string;
}

interface SiteInfo {
  name: string;
  url: string;
  position: string;
  features: SiteFeature[];
  extras: string[];
}

// 对外功能清单（排除纯后台管理路由，如 音乐管理/用户管理/上传文件/访问日志等）
const siteInfo: SiteInfo = {
  name: 'Mahirooyama Blog',
  url: 'https://mahirooyama.cn',
  position:
    'mahirooyama（Mahiro）的个人网站。主要内容是分享照片，尤其是和朋友在 VRChat 里拍的照片；' +
    '次要内容是编程笔记与技术分享；此外还集成了一批即开即用的小工具。' +
    '源代码开源在 GitHub（github.com/Mahiro-Fox/mahirooyama-blog）。',
  features: [
    { name: '帖子（博客）', route: '/page/blog/1', summary: '浏览 mahiro 写的博客文章，支持 mdx/md。' },
    { name: '相册', route: '/page/gallery/1', summary: '浏览图片相册。' },
    { name: '照片', route: '/photos', summary: '瀑布流形式的图片展示。' },
    { name: '碎碎念', route: '/moments', summary: 'mahiro 的日常动态，支持文字、图片、心情与位置。' },
    { name: '影视收藏', route: '/movies', summary: '私人影视收藏库，含海报、标签、简介与播放链接。' },
    { name: '留言墙', route: '/guestbook', summary: '访客留言与互动。' },
    { name: 'MIDI', route: '/midi', summary: 'VRChat 中文吧自动钢琴工具。' },
    { name: 'B站解析', route: '/bilibili-parse', summary: '解析 B 站视频链接。' },
    { name: '图片转换压缩', route: '/image-compressor', summary: '在线图片压缩与格式转换工具。' },
    { name: 'AI 聊天', route: '/chat', summary: '与 AI 模型聊天（你正用于回答的页面）。' },
    { name: '秘密页面', route: '/secret', summary: '仅特定登录用户可访问的内容。' },
    { name: '标签', route: '/tag', summary: '查看全站内容标签分类。' },
    { name: '关于我', route: '/about', summary: '站长的个人介绍。' },
  ],
  extras: [
    '全站有全局音乐播放器，可在任意页面播放站内歌曲（无独立栏目页）。',
    '访客可在留言墙留言；遇到网站问题可在问题反馈里提交。',
    'AI 聊天页含"标准对话"与"Agent 模式"，Agent 模式的回答即由你（当前 AI）完成，需要前台登录。',
  ],
};

// 生成"本站导游"背景指令，供 Agent 注入（纯字符串拼接，函数式）
const buildSiteGuideInstruction = (): string => `
【本站导游·背景知识】（当用户询问本网站是做什么的、有哪些功能时，依据以下信息用中文作答，无需调用工具）
本站名称：${siteInfo.name}（${siteInfo.url}）
定位：${siteInfo.position}
对外功能：
${siteInfo.features.map((f) => `- ${f.name}（入口 ${f.route}）：${f.summary}`).join('\n')}
补充：${siteInfo.extras.map((s) => `- ${s}`).join('\n')}
回答本站相关提问时直接引用以上信息；若用户想了解实时的内容数量等数据，可指出对应入口并建议其自行查看。`;

export { buildSiteGuideInstruction };