# DSH Web 插件安装说明

安装目标：DSH `web` profile（`%USERPROFILE%\.dsh\profiles\web`），
安装命令统一为 `pnpm dsh plugin --profile web add <spec>`（在 DSH 源码 checkout `D:\work\deepseek-harness` 下执行）。
装完需重启 `dsh web` 生效。

---

## 1. dsh-at-file（@ 路径引用）

- 仓库：<https://github.com/omdsh-dev/dsh-at-file>
- 版本：v0.6.0（tarball 安装）
- 安装：`dsh plugin --profile web add https://github.com/omdsh-dev/dsh-at-file/archive/refs/tags/v0.6.0.tar.gz`
- 作用：在 DSH Web 聊天输入框里输入 `@` 搜索当前工作区文件/目录，把路径引用（而非文件内容）插入草稿。
  提交前 host 校验路径确实在工作区内，然后注入一条 `<workspace-reference path="..." kind="file|dir" />`
  引用消息。文件内容与大小不受影响（v0.3.0 起不再预读文件内容）。配套"文件引用"设置页：
  全局/工作区两级的 Exact/Regex 文件名过滤规则。
- 配置（`~/.dsh/profiles/web/cordis.patch.yml`，按 id `dsh-at-file` 覆盖）：
  `maxIndexedFiles`（索引上限）、`ignoreDirs`（替换内置忽略目录列表）。

## 2. @anysearch/anysearch-dsh（AnySearch 网络搜索）

- 仓库：<https://github.com/anysearch-team/anysearch-dsh>
- 版本：0.1.1（npm，官方 registry）
- 安装：`dsh plugin --profile web add @anysearch/anysearch-dsh --registry=https://registry.npmjs.org/`
- 作用：把 [AnySearch](https://anysearch.com) 接入 DSH 原生的 `web_search` 工具，并新增能力发现、
  垂直搜索与有界批量搜索。快速开始无需 API key（匿名配额）；账户级配额在
  `~/.dsh/.credentials.yaml` 配 `ANYSEARCH_API_KEY`。
- 其 patch 同时把 base bundle 中 `web` 行的 `searchProvider` 覆盖为 `anysearch`。

## 3. dsh-web-billing（人民币/美元 token 计费）

- 仓库：<https://github.com/bpc-oss/dsh-web-billing>
- 版本：1.1.0（git 安装，GitHub 最新版；npm 上的 0.1.1 已滞后）
- 安装：`dsh plugin --profile web add github:bpc-oss/dsh-web-billing`
- 作用：DSH Web 的 token 计费插件。按官方价格表自动计价（内置 2026-08-17 起的峰谷定价：
  高峰 09:00-12:00 / 14:00-18:00 北京时间、低谷半价），逐条消息记账（持久化到
  `~/.dsh/storages/web-billing.json`），实时显示账户余额（调官方 `/user/balance`）、
  本地模型"名义价值/已节省"统计；浏览器端每条 assistant 消息显示费用角标，会话头部可展开
  本会话/今日/本月/累计明细，界面语言自动切换 ¥/$。
- 配置键：`currency`、`symbol`/`symbolUsd`、`displayCurrency`、`timezone`、`peakWindows`、
  `officialPricing`、`prices`/`usdPrices`（冻结某模型价格）、`localProviders`/`localCostPerM`、
  `policyOverrides`、`persistPath` 等（默认值即可用）。

## 4. @liustack/modlens（纯文本模型的视觉能力）

- 仓库：<https://github.com/liustack/modlens>
- 版本：3.16.6（npm）
- 安装：`dsh plugin --profile web add @liustack/modlens@3.16.6`
- 作用：DSH 首个视觉插件。为纯文本模型（DeepSeek/GLM 系）提供 `modlens_read_image` 原生工具，
  直接读聊天里粘贴的图片（无需先存文件再传路径）。模型选择器里会出现
  `DeepSeek-V4-Flash (modlens vision)` / `DeepSeek-V4-Pro (modlens vision)` 等包装条目，
  选后粘贴图片即走视觉通道；纯文本条目下粘贴则转为私有临时文件路径。
- 后端：插件自带的 modlens CLI（`dist/main.js`），引擎配置在 `~/.modlens/config.json`；
  可复用机器上已有的 Claude Code/Codex/OpenCode/Pi 多模态模型，零配置起步，
  也可用免费的 Antigravity CLI 或 Gemini key。装完后可用 `modlens doctor` 做健康检查。

## 5. @anionex/dsh-vision-toolkit（视觉工程工具箱）

- 仓库：<https://github.com/Anionex/dsh-vision-toolkit>
- 版本：0.1.7（git 安装）
- 安装：`dsh plugin --profile web add github:Anionex/dsh-vision-toolkit`
- 作用：把 [agent-vision-toolkit](https://github.com/Anionex/agent-vision-toolkit) 以原生
  DSH bundle 形式接入：10 个结构化视觉工具（意图感知图片问答、OCR、原始像素级定位 grounding、
  UI 还原、像素级校验/差异对比、Artifacts 管理），配套 Web 设置页、DSH Credentials 管理
  API key、按需加载的 Skill，以及会话日志里结构化的视觉结果。
- 前置：DSH 0.1.0-rc.6 或兼容更新的 0.1.x；Python 3.11+（托管模式会自建隔离环境，无需手动装上游）。

## 6. dsh-web-ui（Web UI 功能插件 + 皮肤全家桶）

- 仓库：<https://github.com/zhu1090093659/dsh-web-ui>
- 版本：0.1.15（npm 聚合包 `@linxin666/dsh-web-ui-all`）
- 安装：`dsh plugin --profile web add @linxin666/dsh-web-ui-all@0.1.15 --registry=https://registry.npmjs.org/ --ignore-scripts`
  （只想要皮肤可装 `@linxin666/dsh-skins`）
- 作用：Web GUI 插件与皮肤合集，一个聚合包装齐全部功能插件：

  | 插件 | 作用 |
  |---|---|
  | task-board 任务看板 | 侧边栏多列看板，卡片由真实 DSH 会话执行，支持 cron 定时执行 |
  | git-graph Git 图谱 | 分支选择器 + 提交历史可视化 |
  | 右侧面板 | 文件树浏览、markdown/HTML/代码/diff/PDF/Office/图片预览、分屏编辑保存、真实 git 变更（stage/unstage/discard） |
  | pet 鲮鱼娘宠物 | 常驻桌面、随 agent 状态切换动画的陪伴宠物，可喂食互动 |
  | live-stats 实时令牌统计 | 输入框下方实时显示 TPS、LLM 耗时、上下文占用、缓存命中率、输入/输出 token |
  | remote-web-ui 移动端远程 | 扫码配对后手机远程控制 dsh web（收发明细、切模型、调权限），支持 cloudflared 公网隧道 |
  | ssh 远程连接 | xterm.js 远程终端、SFTP 上传下载、本地端口转发、多主机集群执行、Agent 直连 |
  | tool-describe-image 图像理解 | 为纯文本模型提供 `describe_image` 工具，对接 OpenAI 兼容视觉端点（Qwen-VL、GLM-4V、GPT-4o、本地 Ollama 等） |
  | web-ui-settings 插件设置中心 | 统一开关与参数、社区插件索引卡片 |
  | liangshen / aionui-panel 等 | 附加功能面板 |
  | skins 皮肤中心 | 10 款皮肤（Windows XP/Luna、Blue Fantasy、Whale Song、Harbor、Miku、Minecraft、QQ98、Dragon Heir、THS、Trading），先试穿后应用 |

- 注意事项：
  - profile 的 `pnpm-workspace.yaml` 必须 `nodeLinker: hoisted`（本机已满足），否则子包解析不到。
  - 首次安装若提示 `ERR_PNPM_IGNORED_BUILDS`（cloudflared / cpu-features / ssh2），
    可把这三个加入 `allowBuilds` 后重跑；本次安装用 `--ignore-scripts` 跳过（ssh2 走纯 JS 回退，
    cloudflared 隧道需二进制时再补授权）。
  - pnpm 11 release-age 门禁可能静默装回旧版 `@linxin666/*`，必要时在
    `pnpm-workspace.yaml` 加 `minimumReleaseAgeExclude: ['@linxin666/*']`。

---

## 生效方式

所有插件安装完成后需要**重启 `dsh web`**（Host 侧 bundle 行与浏览器侧 client bundle 都在启动时扫描/组合）。
重启后：侧边栏出现新入口、模型选择器出现 `(modlens vision)` 条目、`web_search` 走 AnySearch、
聊天中出现费用角标 / `@` 路径引用 / 图片工具，即代表对应插件已生效。
