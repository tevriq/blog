import fs from "node:fs/promises";
import path from "node:path";
import { scanDirectives, scanTasks } from "./ai-directives.mjs";
import { findObsidianImageReferences } from "./obsidian-images.mjs";
import { resolveImagePath } from "./resolve-obsidian-images.mjs";

const file = process.argv[2];
if (!file) { console.error("Usage: node scripts/preflight-publish.mjs <story-markdown>"); process.exit(2); }
const source = await fs.readFile(file, "utf8");
const errors = [];
for (const item of scanDirectives(source, file)) errors.push(`${file}:${item.line} unresolved @AI directive`);
for (const task of scanTasks(source, file)) if (task.status !== "resolved") errors.push(`${file} AI_TASK ${task.id || "(missing id)"} status=${task.status}`);
for (const match of source.matchAll(/\b(?:TODO|TBD|placeholder)\b/giu)) errors.push(`${file} contains ${match[0]}`);
const vaultRoot = process.env.OBSIDIAN_BLOG_DIR ?? path.dirname(file);
for (const ref of findObsidianImageReferences(source)) {
  const resolved = resolveImagePath(ref.source, file, vaultRoot);
  if (!resolved || !(await fs.stat(resolved).catch(() => null))) errors.push(`${file} missing local image ${ref.source}`);
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`Preflight passed for ${file}; no story move, upload, commit, or push was performed.`);
