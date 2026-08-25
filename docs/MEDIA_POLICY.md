# Media Policy

本文件定义博客图片、视频与其他媒体的长期存储、发布、成本控制和供应商解耦策略。

## 1. 核心目标

媒体架构必须同时满足：

1. 原始资产由用户长期掌控；
2. Obsidian/Remotely Save 的同步实现与公开网站解耦；
3. 第三方图库或视频平台可以替换；
4. 公开页面在“单篇可能 100 张图”的情况下仍优先控制流量；
5. 尽量降低不可预测的按流量、按转换次数费用；
6. AI 能在编辑阶段找到素材，并在获准发布时生成公开媒体。

## 2. 三种媒体角色

### Canonical original

原始照片、视频、附件。

要求：

- 由用户控制的存储保存；
- 当前可以在 R2；未来也可以由自有 VPS 的 S3-compatible storage 作为高频同步工作层，并备份到 R2；
- 不因公开衍生文件被删除而删除原始文件；
- 不直接依赖公开图库作为唯一副本。

### Working / sync storage

用于 Obsidian、Remotely Save、AI 检索等高频读写。

未来如果启用自有 VPS S3：

- VPS 可承担高频同步与 AI 读取；
- R2 可作为长期备份或灾备；
- VPS 不默认承担博客高流量公网图片分发。

### Published derivative

真正给博客页面使用的媒体。

当前约定：

- R2 中的 `blog/` 前缀专门用于博客公开发布媒体；
- 这里只放被批准公开的衍生文件；
- 不把整个私人附件目录暴露出去。

## 3. 私人媒体与公开媒体的边界

AI 能找到一张照片，只说明它可以作为候选素材。

从私人存储进入 R2 `blog/` 必须发生在文章发布准备阶段，并符合用户的发布意图。

标准流程：

```text
canonical original
      ↓
AI selects candidate
      ↓
human review / article approval
      ↓
generate web derivative
      ↓
R2 blog/
      ↓
public site
```

## 4. 不直接使用 Remotely Save 路径

以下路径属于同步实现细节：

```text
attachments/...
附件/...
vault-specific/path/...
```

不得把这些路径当成长期公开 API。

原因包括：

- Vault 可能重命名；
- 文件夹可能移动；
- 同步工具可能替换；
- bucket/prefix 可能变化；
- 私人目录结构不应泄露到公开站点。

## 5. 公开 URL 解耦

文章应优先引用用户控制的自定义域名，而不是供应商专属域名。

例如应优先：

```text
https://<user-controlled-media-domain>/...
```

而不是长期写死某图库、CDN 或对象存储商的专属 hostname。

当前已有 `pic.tsu.wang` 的文章可继续兼容；是否统一域名应单独迁移，不要为了规范变更破坏现有 URL。

供应商迁移时的目标是：

```text
same public domain
      ↓
new backend/provider
```

从而避免批量改文章。

## 6. 图片发布格式

### 原始资产

原始格式不限制：

- HEIC
- JPEG
- PNG
- RAW
- 其他

原始资产不是网页直接分发版本。

### 默认博客衍生文件

照片类图片默认：

- WebP；
- 保持合理视觉质量；
- 自动纠正方向后移除不需要公开的 EXIF/精确位置元数据；
- 不直接把手机/相机的大尺寸原始 JPEG 当作网页图片。

JPEG 不是禁止格式。对个别兼容或视觉需求可以使用经过网页优化的 JPEG，但应作为例外而不是默认。

PNG 主要保留给真正需要无损、透明或图形类场景。

## 7. 尺寸策略：默认只保留一个 1280w WebP

第一版标准：

```text
最大宽度 1280px
WebP
```

具体规则：

- 原图宽度超过 1280px 时缩小到 1280px；
- 原图宽度小于 1280px 时不放大；
- 默认不生成 `640w`；
- 默认不生成第二、第三个 responsive width；
- 默认不因为 Retina、高 DPI 或“常见最佳实践”机械增加更多尺寸；
- 个别明确需要大图展示的内容可以作为例外单独处理，但必须有实际需求。

采用单尺寸的原因：

- 衍生文件最少；
- R2 对象数和存储逻辑最简单；
- 不产生动态转换费用；
- 缓存 key 稳定；
- 发布和供应商迁移更容易；
- 成本高度可预测。

这意味着手机也可能下载 1280w 文件，因此必须通过 WebP 压缩、正文宽度限制、lazy loading 和“不要一次请求整篇全部图片”来控制实际流量。

如果未来真实监控数据证明移动端流量明显过大，再通过一次正式规范变更增加第二档；不要预先为假设问题增加复杂度。

## 8. Cloudflare Images 策略

默认采用“发布时预生成静态衍生文件”，不依赖动态 Cloudflare Images transformations。

即：

```text
original
  ↓ publish-time processing
1280.webp
  ↓
R2 blog/
  ↓
Cloudflare cache / public delivery
```

好处：

- transformation 成本默认是 0；
- 不受动态尺寸参数数量影响；
- 费用更可预测；
- 将来更换图片处理服务更容易；
- R2 中的公开版本本身已经足够小。

Cloudflare Images 可作为未来可选优化层，但不应成为文章正确显示的唯一依赖。

如果未来启用动态转换：

- 必须先修改本规范；
- 只允许固定 preset；
- 禁止任意 width query 造成无限 unique transformations；
- 必须保留静态 fallback。

## 9. 页面流量预算

站点设计必须优先降低“实际发出的图片请求和字节数”，而不只是追求最高压缩率。

必须：

- 正文非首屏图片默认 `loading="lazy"`；
- 非关键图片避免 preload/prefetch；
- 图片容器使用响应式 CSS，例如 `max-width: 100%` 和正确的高度处理；
- 首页/列表只展示必要封面，不提前加载文章内全部图片；
- 正文内容宽度应有上限，避免超宽布局；
- 图片 `width` / `height` 或 aspect ratio 应尽量可确定，减少布局抖动；
- 原始大图不得因为点击正文就自动下载；
- 默认没有多尺寸 `srcset` 要求，因为当前只有一个 1280w WebP 发布规格。

对于几十至上百张图片的长文章：

- 所有非首屏图片保持 lazy；
- 图集可考虑分组、折叠或按交互继续加载；
- 不应因为文章包含 100 张图片就默认在首次打开时请求 100 张；
- 首页、相关推荐、RSS 等位置不得偷偷预取整篇图片集合。

## 10. 发布时压缩

发布媒体处理应发生在 AI/本地发布阶段，而不是要求浏览器承担。

目标不是规定一个永远固定的 quality 数字，而是：

- 视觉可接受；
- 文件显著小于原图；
- 对普通照片优先 WebP；
- 以真实页面效果和字节数验证。

自动化实现可以提供一个合理默认 quality，例如 80，并允许环境变量覆盖，但 quality 不是不可调整的产品规则。

若后续建立自动化，可以为文件大小设置软预算并报告异常大图，但不要为了硬性 KB 限制造成明显画质损坏。

## 11. R2 成本原则

R2 的优势之一是公网 egress 不单独收费，但仍有存储和请求操作成本。

因此策略是：

- R2 负责公开媒体的稳定 origin；
- 充分利用 Cloudflare edge cache；
- 发布衍生文件采用 immutable/stable URL；
- 避免 query 参数制造大量 cache miss；
- 不让高频 Obsidian 同步无必要地和公开媒体访问混在同一个逻辑路径；
- 未来高频私人同步可迁往自有 VPS S3，以进一步降低 R2 operation 的不确定性。

### 私人 bucket 安全边界

如果当前 `blog/` 与私人 Obsidian/Remotely Save 对象处于同一个 R2 bucket：

- 不得为了公开 `blog/` 而直接把整个 bucket 公开；
- 应优先通过只允许 `blog/` 前缀的 Worker/网关提供公网访问；
- 或迁移到独立的公开 blog media bucket；
- 在该边界未确认安全前，自动化不得把“能上传”视为“可以公开”。

## 12. 缓存与文件命名

发布媒体应使用稳定、可长期缓存的 key。

推荐：

```text
blog/<year>/<article-or-asset-id>/<content-hash>-1280.webp
```

如果文件内容变化，优先产生新 key，而不是覆盖后依赖频繁 purge。

适合的公开静态衍生文件可使用长期 cache / immutable 策略。

不使用原始 `attachments/IMG_1234.jpg` 路径作为长期公开 key。

## 13. 媒体注册与 asset id

长期目标是为每个发布媒体分配稳定 `asset_id`，记录：

- 公开衍生 key；
- 类型；
- 实际尺寸；
- caption/alt；
- provider / backend。

公开仓库中的 registry 不应包含私人 canonical source 的绝对路径、GPS、账号或秘密。

私人 source -> public asset 的映射如果需要持久保存，应放在私人工作区或安全本地状态中。

文章层不应依赖私人真实路径。

在 registry/resolver 尚未实现前，不要伪造一个不存在的 `asset://` 功能；继续使用稳定的自有域名 URL，并在实现 resolver 后再迁移。

## 14. Draft 中的图片与发布图片

Draft 阶段应优先保留适合 Obsidian 本地阅读的图片引用，例如：

```md
![[attachments/IMG_1234.jpg]]
```

或者普通本地 Markdown 图片引用。

不要求 AI 在 draft 阶段就把私人图片上传到公网。

发布阶段才执行：

```text
Obsidian local reference
      ↓
resolve source file
      ↓
1280w WebP
      ↓
R2 blog/
      ↓
public URL in generated site copy
```

Obsidian 原稿可以继续保留本地引用，公开副本使用公网 URL。

## 15. 视频

### 长视频

优先使用：

- YouTube；
- 或未来可替换的专业视频托管/转码平台。

原则：

- 原始视频仍由用户长期保存；
- 视频平台是发布副本，不是唯一原件；
- 文章尽量通过可替换的 embed abstraction 渲染，而不是把大量平台细节散落在正文。

### 短视频

体积较小、已经压缩的短片可以考虑直接放 R2 `blog/`，但必须评估：

- 文件大小；
- 浏览器兼容；
- 是否需要自适应码率；
- 页面加载影响。

4K、大体积、长时长视频不应直接作为普通静态文件塞进文章页面。

## 16. 供应商退出

如果图库/CDN/视频平台停止服务：

1. canonical originals 保持不动；
2. 从 canonical storage 重新生成或上传发布副本；
3. 切换自有域名 backend / registry；
4. 尽量不修改文章正文；
5. 验证媒体 URL 后重新发布。

“供应商可替换”是媒体系统的设计目标，而不是事故后的临时补救。
