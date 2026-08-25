import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { scanDirectives, scanTasks } from "./ai-directives.mjs";

const storyRoot = process.env.OBSIDIAN_STORY_DIR ?? process.env.OBSIDIAN_BLOG_DIR ?? "/Users/donmen/obsidian/blog/story";
const publicRoot = fileURLToPath(new URL("../src/content/entries", import.meta.url));
const errors = [];

async function files(root) {
  const out = [];
  for (const entry of await fs.readdir(root, { withFileTypes: true }).catch(() => [])) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...await files(full));
    else if (entry.isFile() && /\.mdx?$/u.test(entry.name)) out.push(full);
  }
  return out;
}

for (const file of await files(storyRoot)) {
  const text = await fs.readFile(file, "utf8");
  for (const item of scanDirectives(text, path.relative(storyRoot, file))) errors.push(`ERROR story/${item.file}:${item.line} unresolved @AI directive`);
  for (const task of scanTasks(text, path.relative(storyRoot, file))) if (task.status !== "resolved") errors.push(`ERROR story/${task.file} AI_TASK ${task.id || "(missing id)"} status=${task.status}`);
}
for (const file of await files(publicRoot)) {
  const text = await fs.readFile(file, "utf8");
  for (const item of scanDirectives(text, path.relative(publicRoot, file))) errors.push(`ERROR ${item.file}:${item.line} visible @AI directive in public copy`);
  if (/<!--\s*\n?AI_TASK:/u.test(text)) errors.push(`ERROR ${path.relative(publicRoot, file)} internal AI_TASK marker leaked into public copy`);
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("AI directive validation passed.");
