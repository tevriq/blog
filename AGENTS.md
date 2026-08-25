# AGENTS.md

本文件是 `tevriq/blog` 的项目级操作入口。任何 AI、Codex、自动化或人工维护者在修改内容流程、发布逻辑或媒体流程前，都应先阅读本文件及其引用的规范。

## 1. 项目定位

`blog` 是「東嬉遊記」的公开发布仓库，负责：

- Astro 网站代码与构建逻辑；
- 发布规范与可执行校验；
- 从 Obsidian 导入后的公开内容副本；
- 公开媒体的引用与渲染；
- Git 版本记录与后续部署触发。

它不是文章原稿的主存储。

## 2. Source of Truth

文章原稿的唯一权威来源是 Obsidian Vault。

当前约定：

- `draft/`：尚未获准公开的工作稿；
- `story/`：用户已经明确批准发布的文章；
- `src/content/entries/`：从 `story/` 导入的派生发布副本，不作为反向编辑源。

除非规范明确要求，否则不得直接修改 `src/content/entries/` 来代替修改 Obsidian 原稿。

## 3. AI 的角色

AI 是 draft 阶段的编辑协作者，不是自主发布者。

AI 可以：

- 读取并处理文章中的 `@AI` 指令；
- 基于当前文章、个人资料源、照片索引、Web 资料等补充内容；
- 修改 Obsidian draft；
- 做发布前检查；
- 在获得用户明确“发布”授权后执行发布步骤。

AI 不得：

- 在缺少个人资料时虚构用户经历、感受或记忆；
- 将私人素材默认视为可公开素材；
- 因“完成了”“差不多”“先这样”等模糊措辞自行发布；
- 在用户明确授权发布前，把 draft 迁移到 story 或推送发布内容。

详见 `docs/AI_DIRECTIVES.md` 与 `docs/EDITORIAL_POLICY.md`。

## 4. 发布边界

发布边界是从私人编辑工作区进入公开发布系统的明确状态转换。

只有用户出现明确发布意图，例如：

- “发布”
- “可以发布”
- “发出去”
- “push 并发布”

才允许执行：

`draft -> 发布前检查 -> story -> import -> validate -> build -> commit/push`

任何检查失败都应先停止发布并向用户说明原因。

详见 `docs/WORKFLOW.md` 与 `docs/PUBLISHING_POLICY.md`。

## 5. 媒体原则

媒体必须与内容同步实现解耦。

当前规则：

- 原始媒体保留在用户控制的 canonical storage；
- 当前 R2 中已建立 `blog/` 前缀，专门放公开博客媒体的发布衍生文件；
- Remotely Save 的同步路径不得直接成为长期公开 URL；
- 公开图片默认使用发布时预生成的 WebP 衍生文件；
- 默认只生成 `640w` 与 `1280w` 两档，不强制第三档；
- 默认不依赖 Cloudflare Images 动态转换，以降低不可预测费用；
- 页面必须以低流量为设计目标：responsive image、lazy loading、避免无意义预取；
- 长视频优先交给 YouTube 或其他可替换的视频平台，原始文件仍由用户掌控；
- 对外引用应优先使用用户控制的域名，而不是供应商专属域名。

详见 `docs/MEDIA_POLICY.md`。

## 6. 规范优先级

发生冲突时按以下顺序处理：

1. 用户当前明确指令；
2. 本 `AGENTS.md`；
3. `docs/PUBLISHING_POLICY.md`；
4. `docs/WORKFLOW.md`；
5. `docs/AI_DIRECTIVES.md`；
6. `docs/MEDIA_POLICY.md`；
7. `docs/EDITORIAL_POLICY.md`；
8. README 与现有实现。

如果现有实现与规范不一致，不得静默假设实现正确；应指出差异，并把“修实现”与“改规范”作为两个不同选择。

## 7. 变更规范本身

规范是受版本控制的项目资产。修改规范时应：

- 明确修改原因；
- 避免同时引入互相冲突的状态源；
- 优先保持“Obsidian 原稿 -> 明确发布授权 -> GitHub 发布”的单向边界；
- 新增自动化前先确定失败时的安全行为；
- 不因自动化方便而扩大私人数据进入公开系统的范围。
