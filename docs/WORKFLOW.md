# Workflow

本文件定义一篇文章从草稿到公开部署的标准生命周期。

## 1. 总体模型

```text
CAPTURE / WRITE
      ↓
Obsidian draft
      ↓
AI ENRICHMENT
      ↓
HUMAN REVIEW
      ↓
explicit "publish"
      ↓
PREFLIGHT
      ↓
Obsidian story
      ↓
import / validate / build
      ↓
Git commit + push
      ↓
deployment layer
      ↓
tsu.wang
```

核心原则：AI 从 draft 阶段就可以深度介入；GitHub 是发布边界之后的系统，不是私人写作工作区。

## 2. 私人编辑平面

私人编辑平面包括但不限于：

- Obsidian draft；
- `@AI` 指令；
- 个人对话、日记、行程、位置、邮件等经授权的数据源；
- 照片与视频原始素材；
- Web 研究；
- AI 与用户的多轮修改。

这些数据可以帮助生成文章，但不得因为被 AI 读取就自动进入公开仓库。

## 3. Draft 阶段

所有尚未公开的文章都应位于 Obsidian `draft/`。

在 draft 阶段：

- 用户可持续修改正文；
- AI 可处理 `@AI`；
- AI 可查询资料、寻找照片、建议结构、润色局部；
- 用户可让 AI 多次重做；
- draft 是否“看起来完成”不产生发布权限。

`draft/` 是唯一的“未发布”状态源，不再叠加多个互相冲突的 `published=true`、`draft=false` 等状态作为发布权威。

## 4. AI enrichment

AI enrichment 是写作流程的一部分，不是构建流程。

标准行为：

1. 读取目标 draft；
2. 找出待处理 `@AI` 指令；
3. 结合指令附近上下文判断意图；
4. 按需访问个人资料、媒体、Web 或当前文档；
5. 生成或插入内容；
6. 写回 Obsidian draft；
7. 等待用户审阅；
8. 根据反馈继续修改。

是否使用本地脚本、工具调用、模型接口属于实现细节，不应要求用户记忆命令。

## 5. Human review

AI 完成任务后，文章仍处于 draft。

用户可以：

- 接受结果；
- 手工修改；
- 要求 AI 重写；
- 替换照片；
- 删除 AI 生成段落；
- 增加新的 `@AI` 指令。

AI 不应把“用户没有继续提出修改”解释为发布同意。

## 6. 发布授权

只有用户明确表达发布意图，才跨越发布边界。

明确授权后进入 `PREFLIGHT`，而不是直接 `git push`。

如果用户只是说：

- “好了”
- “先这样”
- “差不多”
- “完成”

默认仅代表当前编辑阶段结束，不代表公开发布。

## 7. 发布前检查

发布前检查至少确认：

- 无未处理 `@AI`；
- 无明显 TODO、placeholder 或失败的媒体引用；
- 必要 frontmatter 可生成或已存在；
- slug 稳定；
- 图片发布衍生文件已准备；
- 私人信息没有被意外带入；
- 时效性事实在需要时已复核；
- Markdown 可正常导入；
- 站点 validation/build 可通过。

详细规则见 `PUBLISHING_POLICY.md`。

## 8. 从 draft 到 story

只有 preflight 通过后，才把文章从 Obsidian `draft/` 迁移到 `story/`。

这个目录迁移本身就是发布授权的持久审计痕迹。

`story/` 的含义不是“正在写的文章”，而是“已经获准进入公开发布流程的文章”。

## 9. GitHub 发布层

`story/` 进入现有发布链：

```text
story
  ↓
import:obsidian
  ↓
tag / enrichment for site metadata
  ↓
validate
  ↓
build
  ↓
commit + push
```

现有 `publish:local` 只是本地准备命令，不等同于用户层面的“发布授权”。

Git push 后的 CI / Cloudflare Pages / GitHub Actions 属于部署层；具体部署实现可以变化，但不得反向改变“用户明确授权后才发布”的规则。

## 10. 失败与恢复

任何阶段失败时：

- 不应为了让流水线继续而隐瞒错误；
- 不应把未完成 draft 强行迁移到 story；
- 不应删除 canonical 原始媒体；
- 应优先保持原稿与原始媒体可恢复；
- 修复后从最近一个安全阶段继续。
