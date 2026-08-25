const WIKILINK_IMAGE = /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/gu;
const MARKDOWN_IMAGE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu;

export function findObsidianImageReferences(markdown) {
  const refs = [];
  for (const match of markdown.matchAll(WIKILINK_IMAGE)) refs.push({ raw: match[0], source: match[1], alt: match[2] ?? "" });
  for (const match of markdown.matchAll(MARKDOWN_IMAGE)) if (!/^https?:\/\//u.test(match[2])) refs.push({ raw: match[0], source: match[2], alt: match[1] });
  return refs;
}

export function replaceObsidianImageReferences(markdown, resolver) {
  return markdown.replace(WIKILINK_IMAGE, (raw, source, alt = "") => `![${alt}](${resolver(source)})`).replace(MARKDOWN_IMAGE, (raw, alt, source) => /^https?:\/\//u.test(source) ? raw : `![${alt}](${resolver(source)})`);
}
