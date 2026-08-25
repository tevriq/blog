import test from "node:test";
import assert from "node:assert/strict";
import { findObsidianImageReferences, replaceObsidianImageReferences } from "../scripts/obsidian-images.mjs";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { resolveMarkdownImages } from "../scripts/resolve-obsidian-images.mjs";
test("finds and replaces wikilink and relative markdown images", () => {
  const source = "![[attachments/a.jpg|街景]]\n![酒店](../attachments/b.png)\n![远端](https://x.test/a.webp)";
  assert.equal(findObsidianImageReferences(source).length, 2);
  const out = replaceObsidianImageReferences(source, (file) => `https://pic.test/blog/${file.split('/').pop()}.webp`);
  assert.match(out, /!\[街景\]\(https:\/\/pic.test\/blog\/a\.jpg\.webp\)/);
  assert.match(out, /https:\/\/x\.test\/a\.webp/);
});

test("resolves a local image to a public URL in dry-run without uploading", async () => {
  const previousBase = process.env.R2_PUBLIC_BASE_URL;
  process.env.R2_PUBLIC_BASE_URL = "https://pic.test";
  const root = await mkdtemp(path.join(os.tmpdir(), "blog-vault-"));
  const story = path.join(root, "story");
  const attachments = path.join(root, "attachments");
  await import("node:fs/promises").then(({ mkdir }) => Promise.all([mkdir(story), mkdir(attachments)]));
  await sharp({ create: { width: 40, height: 20, channels: 3, background: "red" } }).jpeg().toFile(path.join(attachments, "a.jpg"));
  const result = await resolveMarkdownImages("![[attachments/a.jpg|街景]]", path.join(story, "note.md"), "note", { dryRun: true, vaultRoot: root });
  assert.match(result.markdown, /https:\/\/pic\.test/);
  if (previousBase === undefined) delete process.env.R2_PUBLIC_BASE_URL; else process.env.R2_PUBLIC_BASE_URL = previousBase;
});
