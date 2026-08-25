# Local AI Implementation Guide

本文件面向“本地低推理 AI 编码代理”，用于把现有规范真正落地为可运行的博客编辑与发布基础设施。

它不是新的产品规范。若本文件与 `AGENTS.md`、`docs/WORKFLOW.md`、`docs/AI_DIRECTIVES.md`、`docs/EDITORIAL_POLICY.md`、`docs/PUBLISHING_POLICY.md`、`docs/MEDIA_POLICY.md` 冲突，以这些规范文件为准。

---

## 1. 可直接复制给本地 AI 的提示词

```text
你现在是 tevriq/blog 的实现代理。你的任务不是重新设计项目，而是严格按照仓库现有规范，把“AI 深度参与 draft、用户明确授权后再发布”的机械基础设施落地。

开始前必须完整阅读并遵守：
1. AGENTS.md
2. docs/WORKFLOW.md
3. docs/AI_DIRECTIVES.md
4. docs/EDITORIAL_POLICY.md
5. docs/PUBLISHING_POLICY.md
6. docs/MEDIA_POLICY.md
7. docs/LOCAL_AI_IMPLEMENTATION.md

先检查当前代码与 git 状态，再给出一个简短实施计划，然后按 docs/LOCAL_AI_IMPLEMENTATION.md 的阶段顺序执行。

重要边界：
- Obsidian 是文章 Source of Truth。
- draft 是未发布状态，story 是已获得明确发布授权的状态。
- 不得为了实现方便，把 src/content/entries 当成主编辑源。
- 不得自动把“完成、好了、没问题”等措辞当成发布授权。
- 不得在测试过程中真的发布文章或把私人附件公开。
- 第一版不要自行开发一个 OpenAI API 自主 Agent。正常工作时，和用户对话的 AI 本身就是 @AI 指令的 resolver/orchestrator；代码只负责扫描、追踪、验证、媒体处理和发布衔接。
- 任何个人记忆类内容没有证据时不得编造。
- 私人媒体“可被 AI 读取”不代表“可公开”。
- 公开照片默认只生成一个 1280w WebP 衍生文件；不要再生成 640w，也不要默认接入 Cloudflare Images 动态转换。
- R2 中已经存在 blog/ 前缀，公开博客衍生媒体必须放在该前缀下。
- R2/Cloudflare 密钥只能来自环境变量，绝不能写入代码、测试夹具、日志或 Git。
- 如果同一个 R2 bucket 还包含私人 Obsidian/Remotely Save 数据，不得为了 blog/ 公开访问而直接暴露整个 bucket；必须只暴露 blog/ 前缀，或明确提示需要独立公开 bucket/受限网关。

实施目标：
A. @AI 指令扫描与 AI_TASK 追踪基础设施；
B. 发布副本自动剥离内部 AI_TASK 标记；
C. validate:ai，可阻止未处理 @AI / unresolved task / 内部标记泄露到公开副本；
D. 本地图片发布工具：输入本地照片 -> 自动纠正方向 -> 最大宽度 1280、不放大 -> WebP -> 去除不必要 EXIF -> 稳定 immutable key -> 上传 R2 blog/ -> 返回公开 URL；
E. 支持 Obsidian 本地图片引用在发布阶段解析成公开 R2 URL，原稿仍保留适合 Obsidian 使用的本地引用；
F. 将新的校验接入现有 import/tag/validate/build 流程，但不要把 npm 命令变成用户必须记忆的主要交互方式；
G. 提供 dry-run、失败保护、基础测试和明确验收结果。

执行时：
- 优先做最小、可测试、可回滚的实现。
- 每个阶段完成后运行对应测试。
- 不要顺手重构无关代码。
- 不要更改现有文章内容，除非测试夹具使用临时文件。
- 不要在未确认 R2 环境变量和公开访问边界前执行真实上传。
- 如果发现现有实现与规范冲突，停止该部分，说明“实现冲突点、推荐修法、是否需要用户拍板”，不要自行改规范。

完成后请输出：
1. 实际修改的文件；
2. 新增 npm scripts；
3. 运行过的测试与结果；
4. 仍需人工配置的环境变量/Cloudflare 设置；
5. 尚未实现或刻意延后的能力；
6. 一次模拟的“draft -> AI 处理 -> 用户发布 -> media -> import -> validate -> build”流程结果。
```

---

## 2. 这次到底需要落地什么

第一版不要把范围做成“完整个人 AI 写作平台”。需要实现的是让当前工作流具备可靠的机械边界。

### 必须落地

1. `@AI` 指令扫描
2. `AI_TASK` 机器标记的识别与公开剥离
3. `validate:ai`
4. 图片发布处理与 R2 `blog/` 上传
5. Obsidian 本地图片引用 -> 公开图片 URL 的发布解析
6. 发布前必要校验与现有构建链衔接
7. dry-run 与自动化测试

### 第一版不需要落地

1. 不需要单独开发常驻 AI Resolver 服务
2. 不需要 OpenAI SDK 自动调用 memory/web/photo 工具
3. 不需要把用户私人 Chatlog/邮件/照片索引搬进 GitHub Actions
4. 不需要 Cloudflare Images 动态 transformation
5. 不需要 640w/多尺寸图片
6. 不需要自动上传长视频
7. 不需要自动发布到 YouTube
8. 不需要完整 DAM/图库后台
9. 不需要在公开仓库记录私人原始文件路径

正常编辑时，当前与用户交互的 AI 负责理解 `@AI`、查资料、选择照片和修改 Obsidian。仓库代码负责“让这件事有规则、有痕迹、可校验、可发布”。

---

## 3. 开始执行前

### Step 0.1：确认仓库状态

先执行：

```bash
git status
git branch --show-current
git log -5 --oneline
```

要求：

- 不覆盖用户尚未提交的改动；
- 若工作区不干净，先报告；
- 建议在功能分支实施，例如：

```bash
git switch -c feat/ai-publishing-infrastructure
```

### Step 0.2：读取现有实现

至少检查：

- `package.json`
- `.env.example`
- `scripts/import-obsidian.mjs`
- `scripts/obsidian-metadata.mjs`
- `scripts/validate-content.mjs`
- `src/content.config.ts`
- 页面中 Markdown 图片最终如何渲染

不要假设 README 中的历史描述一定等于当前代码。

### Step 0.3：建立基线

运行当前已有流程：

```bash
npm install
npm run validate
npm run build -- --force
```

如当前基线本身失败，先记录失败，不要把旧错误误认为新实现造成。

---

## 4. Phase 1：`@AI` 指令扫描

### 目标

代码能稳定识别：

```md
@AI：……
```

和：

```md
@AI: ……
```

并返回至少：

- 文件路径
- 行号
- 原始 instruction
- 是否 unresolved

### 推荐实现

新增一个纯逻辑模块，例如：

```text
scripts/ai-directives.mjs
```

它只负责：

- 解析可见 `@AI` 指令；
- 解析 `AI_TASK` HTML comment；
- 提供 strip internal marker 的纯函数；
- 不访问模型 API；
- 不修改 Git；
- 不发布内容。

### `AI_TASK` 第一版格式

继续兼容规范中的格式：

```html
<!--
AI_TASK:
  id: ai-20260825-001
  status: resolved
  instruction: 帮我回忆下近期去京都的感悟，最多100来字就行
-->
```

最低支持状态：

- `resolved`
- `unresolved`

不要在公开 marker 中记录私人检索路径、账号、token、完整资料来源等。

### 验收

至少有自动测试覆盖：

- 全角冒号；
- 半角冒号；
- 多个指令；
- 普通正文里出现“AI”但不是 directive；
- resolved task；
- unresolved task；
- strip 后正文不被误删。

推荐使用 Node 自带 `node:test`，避免为了几条测试引入大型测试框架。

---

## 5. Phase 2：公开副本剥离 AI 内部标记

### 目标

Obsidian 原稿可以保留 `AI_TASK` 追踪信息，但 `src/content/entries/` 不应包含这些内部 comment。

### 实现位置

优先在“Obsidian -> site copy”的 normalization/import 阶段处理，而不是修改 Obsidian 源稿。

也就是说：

```text
Obsidian source
保留 AI_TASK
      ↓
normalize/import
      ↓ strip internal markers
site copy
无 AI_TASK
```

### 重要边界

- 只能剥离明确属于本项目的 `AI_TASK` marker；
- 不要粗暴删除所有 HTML comments；
- 不要删除 AI 生成的实际正文；
- 不要反向修改用户已经手工编辑的 AI 输出。

### 验收

使用临时 Markdown fixture，验证：

- source 仍有 marker；
- imported content 没有 marker；
- 实际正文保持不变。

---

## 6. Phase 3：实现 `validate:ai`

### 目标

在公开内容进入 build 前阻止以下情况：

1. `story/` 仍有可见 `@AI:` / `@AI：`
2. `story/` 存在 `status: unresolved` 的 AI task
3. `src/content/entries/` 出现可见 `@AI`
4. `src/content/entries/` 泄露 `AI_TASK` 内部 marker

### 推荐脚本

```text
scripts/validate-ai-directives.mjs
```

package script：

```json
"validate:ai": "node scripts/validate-ai-directives.mjs"
```

### 扫描边界

- `draft/` 可以合法存在 unresolved `@AI`，不能因为 draft 有任务就让整个站点失败；
- `story/` 不允许；
- generated public entries 不允许。

应支持 `OBSIDIAN_STORY_DIR`，不要把路径逻辑重复硬编码在多个脚本里。

### 错误信息

错误必须可操作，例如：

```text
ERROR story/京都.md:37 unresolved @AI directive
ERROR story/名古屋.md AI_TASK ai-xxx status=unresolved
ERROR src/content/entries/xxx.md internal AI_TASK marker leaked into public copy
```

### 接入现有流程

建议最终使：

```text
import
  ↓
tag
  ↓
validate:ai
  ↓
validate
  ↓
build
```

`publish:local` 可以加入 `validate:ai`，但 README/规范必须继续强调：这个 npm script 不是用户层面的“发布授权”。

---

## 7. Phase 4：图片发布工具

### 核心规则

照片类公开图片默认只生成一个版本：

```text
1280w WebP
```

具体含义：

- 宽度最大 1280px；
- 原图宽度小于 1280 时不放大；
- 自动按 EXIF orientation 纠正方向后再剥离不必要 metadata；
- 默认输出 WebP；
- 不生成 640w；
- 不默认生成 AVIF；
- 不默认调用 Cloudflare Images transformation。

### 推荐依赖

优先使用成熟库：

```text
sharp
@aws-sdk/client-s3
```

不要自己手写图像编码器或 S3 签名实现。

### 推荐脚本

```text
scripts/publish-media.mjs
```

至少支持：

```bash
node scripts/publish-media.mjs --file /path/to/photo.jpg --article <slug> --dry-run
```

真实上传时：

```bash
node scripts/publish-media.mjs --file /path/to/photo.jpg --article <slug>
```

### 图片处理建议

默认逻辑可类似：

```text
auto rotate
→ resize width <= 1280, without enlargement
→ WebP
→ strip unnecessary metadata
→ hash final content
→ upload
```

质量值不要写死成不可调整的产品规则。实现可以先用一个合理默认值，例如 80，并允许环境变量覆盖：

```text
BLOG_WEBP_QUALITY=80
```

### R2 object key

使用 immutable、可预测但不暴露私人路径的 key，例如：

```text
blog/<year>/<article-slug>/<content-hash>-1280.webp
```

不要使用：

```text
blog/attachments/IMG_1234.jpg
```

作为长期结构。

同一处理后内容的 hash 相同，应尽量复用已有对象，而不是重复上传。

### R2 环境变量

第一版建议统一：

```text
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_BLOG_PREFIX=blog
R2_PUBLIC_BASE_URL=
BLOG_WEBP_QUALITY=80
BLOG_IMAGE_MAX_WIDTH=1280
```

`.env.example` 只能写变量名和安全默认值，不得提交真实凭据。

### 公共访问安全

如果 `R2_BUCKET` 同时存有 Remotely Save / 私人 Obsidian 数据：

- 不允许因为博客图片需要公网访问，就把整个 bucket 直接公开；
- 优先使用只允许 `blog/` 前缀的 Worker/网关；
- 或改成独立的公开 blog media bucket；
- 若当前公开域名会暴露整个 bucket，必须停止真实发布并提示用户修正。

这是一条发布阻断条件。

### dry-run

`--dry-run` 至少显示：

- 输入文件；
- 原尺寸；
- 输出尺寸；
- 预计/实际输出字节数；
- MIME；
- object key；
- 最终公开 URL；
- 但不上传。

### 验收

验证：

- 横图；
- 竖图；
- 带 orientation 的手机照片；
- 小于 1280 宽图片不被放大；
- PNG/透明图片转 WebP 不出现明显错误；
- 不包含 GPS/EXIF 隐私数据；
- hash/key 稳定；
- dry-run 不触发网络写入；
- 缺少凭据时明确失败。

动画 GIF、RAW、超特殊图像可以第一版明确不支持并报错，不要静默生成错误文件。

---

## 8. Phase 5：Obsidian 图片引用解析

### 目标

在 draft 阶段，图片仍然适合在 Obsidian 本地阅读；只有跨越发布边界后，公开副本才使用 R2 `blog/` URL。

推荐支持至少两类源引用：

```md
![[attachments/IMG_1234.jpg]]
```

以及：

```md
![名古屋街景](../attachments/IMG_1234.jpg)
```

如果 Obsidian wikilink 带 alias：

```md
![[attachments/IMG_1234.jpg|名古屋街景]]
```

可把 alias 作为 alt/caption 候选。

### 推荐行为

不要在 AI 编辑 draft 时就强制把私人路径替换成公网 URL。

发布阶段：

```text
Obsidian local image reference
      ↓ resolve local file
1280 WebP processing
      ↓
R2 blog/ upload/reuse
      ↓
public URL
      ↓
site copy replaces reference
```

Obsidian source 可以继续保留原来的本地图片引用。

### 为什么这样做

- draft 不会因为插图就提前公开私人照片；
- Remotely Save 路径不成为永久公网协议；
- 换 R2/CDN 不需要重写源稿；
- Obsidian 本地预览仍然自然。

### 失败行为

以下情况必须阻止该文章发布：

- 本地图片找不到；
- 转码失败；
- R2 上传失败；
- public URL 不可构造；
- 同 bucket 私人数据公开边界不安全；
- 生成后的 Markdown 引用仍指向本地绝对路径。

---

## 9. Phase 6：发布前衔接

用户说“发布”以后，本地 AI 应按规范执行，而不是靠一个黑盒脚本直接 push。

建议实际步骤：

### 9.1 目标确认

确定用户指的是哪篇 draft。

### 9.2 扫描未完成任务

检查：

- 可见 `@AI`
- unresolved AI task
- TODO/TBD/placeholder

发现问题先报告，不移动到 story。

### 9.3 媒体 preflight

- 找出所有本地图片引用；
- 验证源文件存在；
- dry-run 图片处理；
- 检查 R2 配置；
- 用户已经明确发布后，才允许把批准公开的图片上传到 R2 `blog/`；
- 获得稳定 public URL。

### 9.4 draft -> story

只有内容和媒体 preflight 都通过，才移动：

```text
draft/article.md -> story/article.md
```

### 9.5 生成公开副本

执行：

```bash
npm run import:obsidian
npm run tag
npm run validate:ai
npm run validate
npm run build -- --force
```

### 9.6 检查 diff

至少检查：

```bash
git status
git diff --check
git diff
```

确认：

- 没有私人本地绝对路径；
- 没有 `@AI`；
- 没有 `AI_TASK` marker；
- 图片 URL 仅指向允许的公开媒体域名；
- 没有 `.env`、凭据、临时文件。

### 9.7 commit / push

只有此前用户已有明确发布授权并且所有检查通过，才 commit/push。

开发这套基础设施本身时，不要拿真实文章来测试发布。

---

## 10. Phase 7：页面加载策略检查

本阶段只做必要改动，不做视觉重构。

因为现在默认只有一个 1280w WebP，所以不再强制 `srcset` 多尺寸方案。

页面至少保证：

- 正文非首屏图片 `loading="lazy"`；
- 图片 `max-width: 100%` / 自适应容器；
- 尽可能提供 width/height 或 aspect ratio；
- 首页/列表不预加载文章全部图片；
- 不自动 preload 正文图；
- 100 张图片的文章不会在首屏立即请求 100 张；
- 图集可以按需要折叠/延迟加载，但第一版无需为了该功能重构整个站点。

如果框架默认行为已经满足，不要重复造轮子。

---

## 11. 推荐 package scripts

实际命名可以结合代码调整，但目标能力至少应类似：

```json
{
  "validate:ai": "node scripts/validate-ai-directives.mjs",
  "media:publish": "node scripts/publish-media.mjs",
  "test": "node --test"
}
```

现有 `publish:local` 建议最终包含 `validate:ai`。

不要添加一个会在没有明确用户授权时自动 `git push` 的 npm script。

---

## 12. 测试要求

至少建立自动测试覆盖：

### AI directives

- 全角/半角 `@AI`
- resolved/unresolved
- marker strip
- 不误删正文

### Import

- source 保留 AI_TASK
- site copy 剥离 AI_TASK
- unresolved story 被阻止

### Media

- 1280 max width
- no upscale
- WebP output
- metadata removal
- deterministic key
- dry-run
- missing credential error

### Security

- `.env` 不进入 Git
- public output 不出现 `/Users/...`
- public output 不出现 `attachments/` 私人同步路径作为公网 URL
- public output 不出现 AI_TASK

可以使用临时目录和 fixture，不要使用用户真实私人照片作为公开测试数据。

---

## 13. 完整验收场景

最后至少做一次不真正发布到公网的模拟。

### Case A：文本型 `@AI`

输入：

```md
今天去了姬路。

@AI：姬路城的来历是什么？大概100字。
```

模拟 AI 写回 resolved 内容和 AI_TASK marker。

验收：

- draft 中保留追踪 marker；
- story preflight 不再检测到 visible @AI；
- imported public copy 没有 AI_TASK marker。

### Case B：照片型 `@AI`

输入意图：

```text
@AI：插入几张昨天在名古屋玩的照片
```

模拟 AI 选择本地 fixture 图片，并在 draft 插入本地 Obsidian 图片引用。

验收：

- draft 不出现公网 URL 也能正常保留本地引用；
- media dry-run 生成最大宽度 1280 的 WebP；
- 只产生一个图片规格；
- object key 位于 `blog/`；
- public site copy 使用公开 URL；
- source 仍保留本地引用。

### Case C：发布阻断

story 中保留：

```md
@AI：这里再补一下
```

验收：

```bash
npm run validate:ai
```

必须非 0 退出，并指出文件和行号。

---

## 14. 完成定义

只有满足以下条件才算本轮实现完成：

- [ ] 不改变 Obsidian source-of-truth 原则
- [ ] 不构建多余的自主 AI Agent
- [ ] `@AI` 扫描稳定
- [ ] AI_TASK source 保留、public 剥离
- [ ] unresolved task 能阻止发布
- [ ] `validate:ai` 接入发布准备链
- [ ] 图片只生成一个 1280w WebP
- [ ] 图片默认不依赖 Cloudflare Images
- [ ] R2 key 在 `blog/` 前缀
- [ ] 不公开私人 bucket 内容
- [ ] 不提交任何秘密
- [ ] 本地图片引用可转换为公开 URL
- [ ] 页面图片默认 lazy load
- [ ] 自动测试通过
- [ ] 现有 `npm run validate` / build 不被破坏
- [ ] 输出清晰的人工配置项与遗留问题

如果其中某项因为外部 Cloudflare/R2 配置无法验证，应明确标记“代码完成，外部验收待做”，不能假装已经验证。
