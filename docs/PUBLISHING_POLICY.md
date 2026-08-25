# Publishing Policy

本文件定义用户说“发布”之后 AI 与自动化可以做什么。

## 1. 发布必须显式授权

公开发布是不可由 AI 自主推断的高影响操作。

可视为明确发布授权的表达包括：

- “发布”
- “可以发布”
- “发出去”
- “push 并发布”
- 其他语义同等明确的命令

以下表达默认不构成发布授权：

- “好了”
- “先这样”
- “差不多了”
- “完成”
- “没问题”

如果上下文存在明显歧义，应确认，而不是默认发布。

## 2. 发布前检查清单

收到发布授权后，先执行 preflight。

### 内容

- [ ] 文章位于 Obsidian `draft/`
- [ ] 无可见 `@AI:` / `@AI：`
- [ ] 无 unresolved AI task
- [ ] 无明显 TODO、TBD、placeholder
- [ ] 用户最近一次要求的修改已经写回
- [ ] 时效性事实在必要时已复核
- [ ] 无明显不应公开的私人信息

### 元数据

- [ ] title 可确定
- [ ] slug 稳定或可安全生成
- [ ] date 等必要字段可生成
- [ ] frontmatter 与当前 schema 兼容
- [ ] 不因目录改名意外改变既有公开 URL

### 媒体

- [ ] 所有计划公开的图片均有发布衍生文件
- [ ] 媒体位于 R2 `blog/` 发布前缀或其他明确的公开媒体层
- [ ] 原始 Remotely Save 路径未被直接当成长期公开 URL
- [ ] 照片类图片默认只有一个最大宽度 `1280w` 的 WebP 发布衍生文件，原图不足 1280px 时不放大，或有明确例外
- [ ] 默认未额外生成 `640w`/其他多尺寸版本
- [ ] 图片引用可解析
- [ ] 失败上传、404、临时链接不得发布
- [ ] 若 `blog/` 与私人 Obsidian/Remotely Save 数据处于同一 R2 bucket，公开访问不得暴露整个 bucket
- [ ] 长视频使用稳定的外部视频发布层或明确批准的自托管方案

### 构建

- [ ] `validate:ai` 能成功（实现后为强制项）
- [ ] import 能成功
- [ ] validation 能成功
- [ ] Astro build 能成功

任一关键项失败时，停止发布并报告问题。

## 3. 发布状态转换

preflight 通过后：

```text
Obsidian draft/article.md
        ↓
Obsidian story/article.md
```

这个移动是文章获得公开发布资格的权威状态变化。

不要同时引入另一个互相竞争的 `published=true` 作为第二套发布真相。

## 4. 导入和构建

文章进入 `story/` 后执行现有发布准备流程：

```text
import:obsidian
  ↓
tag
  ↓
validate:ai
  ↓
validate
  ↓
build
```

在 `validate:ai` 尚未实现前，发布者必须人工完成等价检查；实现后应纳入标准发布准备链。

`src/content/entries/` 是派生物。

如果导入结果有问题，应修 Obsidian 源稿或导入逻辑，而不是长期只修派生 Markdown。

## 5. Commit 与 Push

只有：

- 用户已经明确授权发布；
- preflight 通过；
- 构建通过；

才允许为该文章创建发布 commit 并 push。

commit 应能让未来维护者看出这是一次文章发布或发布修订。

## 6. 部署层

Git push 之后的部署实现可以是：

- Cloudflare Pages 的 Git 集成；
- GitHub Actions；
- 其他未来 CI/CD。

部署实现不是发布授权来源。

即使 CI 能自动部署，也必须保持：

`用户明确授权 -> 发布 commit/push -> 自动部署`

而不是：

`AI 认为写完 -> 自动公开`

## 7. 发布后的修改

已发布文章的修改仍应回到 Obsidian source of truth。

标准流程：

1. 修改 Obsidian 对应 story 原稿，或按需要先回到 draft 工作；
2. AI/用户审阅；
3. 再次明确发布该修订；
4. import / validate / build / commit / push。

不得只改 `src/content/entries/` 后忘记同步回原稿。

## 8. 紧急回滚

发现严重错误时应优先：

- 保留 Git 历史；
- 回滚公开版本或修正后重新发布；
- 不删除 canonical 原始内容来“消除痕迹”；
- 媒体撤回时只处理公开衍生文件，不误删私人原始资产。
