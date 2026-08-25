import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { findObsidianImageReferences, replaceObsidianImageReferences } from "./obsidian-images.mjs";
import { publishMedia } from "./publish-media.mjs";

export function resolveImagePath(source, markdownFile, vaultRoot) {
  const clean = source.replace(/^\.?\//, "");
  const rooted = /^(?:attachments|附件)(?:[\\/]|$)/u.test(clean);
  const candidates = rooted
    ? [path.resolve(vaultRoot, clean), path.resolve(path.dirname(markdownFile), source), path.resolve(vaultRoot, "attachments", path.basename(clean)), path.resolve(vaultRoot, "附件", path.basename(clean))]
    : [path.resolve(path.dirname(markdownFile), source), path.resolve(vaultRoot, clean), path.resolve(vaultRoot, "attachments", path.basename(clean)), path.resolve(vaultRoot, "附件", path.basename(clean))];
  return candidates.find((candidate) => candidate.startsWith(`${path.resolve(vaultRoot)}${path.sep}`));
}

export async function resolveMarkdownImages(markdown, markdownFile, article, { dryRun = false, vaultRoot = path.dirname(markdownFile) } = {}) {
  const refs = findObsidianImageReferences(markdown);
  const results = new Map();
  for (const ref of refs) {
    const sourceFile = resolveImagePath(ref.source, markdownFile, vaultRoot);
    if (!sourceFile || !(await fs.stat(sourceFile).catch(() => null))) throw new Error(`Image source not found: ${ref.source}`);
    const media = await publishMedia(sourceFile, article, { dryRun });
    if (!media.url) throw new Error(`R2_PUBLIC_BASE_URL is required to resolve ${ref.source}`);
    results.set(ref.source, media.url);
  }
  return { markdown: replaceObsidianImageReferences(markdown, (source) => results.get(source)), media: [...results.entries()] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const index = (name) => process.argv.indexOf(`--${name}`);
  const file = index("file") >= 0 ? process.argv[index("file") + 1] : undefined;
  const article = index("article") >= 0 ? process.argv[index("article") + 1] : undefined;
  const dryRun = process.argv.includes("--dry-run");
  if (!file || !article) { console.error("Usage: node scripts/resolve-obsidian-images.mjs --file <markdown> --article <slug> [--dry-run]"); process.exit(2); }
  try { const source = await fs.readFile(file, "utf8"); console.log(JSON.stringify(await resolveMarkdownImages(source, file, article, { dryRun, vaultRoot: process.env.OBSIDIAN_BLOG_DIR ?? path.dirname(file) }), null, 2)); }
  catch (error) { console.error(error.message); process.exit(1); }
}
