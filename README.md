# 東嬉遊記

An Astro site for an Obsidian-first, AI-assisted travel publishing workflow.

## Architecture

The project has a deliberate publishing boundary:

```text
Obsidian draft
   ↓
AI-assisted editing (`@AI`)
   ↓
human review
   ↓
explicit publish approval
   ↓
Obsidian story
   ↓
import / tag / validate / build
   ↓
Git commit + push
   ↓
deployment
   ↓
tsu.wang
```

Obsidian is the source of truth. `src/content/entries` is a generated publishing copy.

Before working on publishing, AI directives, or media, read:

- `AGENTS.md`
- `docs/WORKFLOW.md`
- `docs/AI_DIRECTIVES.md`
- `docs/EDITORIAL_POLICY.md`
- `docs/PUBLISHING_POLICY.md`
- `docs/MEDIA_POLICY.md`

## Obsidian Workflow

Current local source root:

```text
/Users/donmen/obsidian/blog
```

Current content directories:

- `draft/`: private work in progress; AI may edit here.
- `story/`: explicitly approved for publication.
- attachment directories: source media, not automatically public.

The importer reads publishable Markdown from `story/`, writes missing metadata back to the Obsidian source when needed, and creates normalized site copies in `src/content/entries`.

Use a different source folder when needed:

```bash
OBSIDIAN_STORY_DIR=/path/to/other/story npm run import:obsidian
```

## AI-assisted Drafting

Drafts may contain natural-language directives such as:

```md
@AI：帮我回忆下近期去京都的感悟，最多100来字就行
```

```md
@AI：插入几张昨天在名古屋玩的照片
```

```md
@AI：姬路城的来历是什么？大概100字
```

AI resolves these during the draft/editing phase and writes results back to the Obsidian source. AI work is not itself permission to publish.

See `docs/AI_DIRECTIVES.md`.

## Local Build

```bash
npm install
npm run import:obsidian
npm run tag
npm run validate
npm run build -- --force
npm run dev
```

Or:

```bash
npm run publish:local
```

`publish:local` prepares the current `story/` content locally. It does **not** grant publishing permission, create a Git commit, or push changes. Publishing permission comes only from an explicit user instruction as defined in `docs/PUBLISHING_POLICY.md`.

The current tagger uses local heuristics and may later be replaced or supplemented by an AI-powered metadata layer.

## Media

Original/source media remains under user control.

For public blog media, an R2 `blog/` prefix has been created specifically for publishing derivatives.

Default image policy:

- generate WebP at publish time;
- default to two widths: `640w` and `1280w`;
- serve responsive images with lazy loading;
- do not expose Remotely Save internal paths as permanent public URLs;
- prefer a user-controlled media domain over provider-specific URLs;
- do not depend on Cloudflare Images dynamic transformations by default.

Long-form video should normally use YouTube or another replaceable video platform while originals remain under user control.

See `docs/MEDIA_POLICY.md`.

## Share Cards

Generate image cards from one imported Markdown entry:

```bash
npm run share:cards -- --entry=test
```

The generator writes SVG image files into `public/share-cards`:

- `xhs`: vertical cards for 小红书.
- `x`: horizontal cards for X.

Use `--platform=xhs` or `--platform=x` to export one format, and `--handle=@yourname` to change the footer watermark. Add `--png` to render upload-ready PNG files with local Chrome:

```bash
npm run share:cards -- --entry=test --platform=xhs --png
```

## Deployment

Current target:

- Content source: Obsidian Markdown
- Site: Astro
- Repository: GitHub
- Hosting/deployment: Cloudflare Pages or the configured Git-based deployment layer
- Published images: R2 `blog/` derivatives
- Canonical/private media: user-controlled storage

The deployment implementation may change over time. The publishing boundary must not: no public release before explicit user approval.
