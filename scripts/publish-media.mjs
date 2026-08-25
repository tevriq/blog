import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function setting(name, fallback) { return process.env[name] ?? fallback; }
function safeSlug(value) { return String(value).normalize("NFKC").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "entry"; }

export async function prepareMedia(file, article) {
  const input = await sharp(file).rotate();
  const metadata = await input.metadata();
  const output = await input.resize({ width: Number(setting("BLOG_IMAGE_MAX_WIDTH", 1280)), withoutEnlargement: true }).webp({ quality: Number(setting("BLOG_WEBP_QUALITY", 80)) }).toBuffer();
  const outputMetadata = await sharp(output).metadata();
  const hash = crypto.createHash("sha256").update(output).digest("hex").slice(0, 16);
  const prefix = String(setting("R2_BLOG_PREFIX", "blog")).replace(/^\/+|\/+$/g, "");
  if (prefix !== "blog" && !prefix.startsWith("blog/")) throw new Error("R2_BLOG_PREFIX must be blog or a blog/ sub-prefix");
  const key = `${prefix}/${new Date().getUTCFullYear()}/${safeSlug(article)}/${hash}-1280.webp`;
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  return { input: file, original: { width: metadata.width, height: metadata.height }, output: { width: outputMetadata.width, height: outputMetadata.height, bytes: output.length, mime: "image/webp" }, key, url: base ? `${base}/${key}` : null, body: output };
}

export async function publishMedia(file, article, { dryRun = false } = {}) {
  const prepared = await prepareMedia(file, article);
  const result = { ...prepared, body: undefined, dryRun };
  if (dryRun) return result;
  const required = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE_URL"];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing R2 configuration: ${missing.join(", ")}`);
  if (process.env.R2_PUBLIC_SCOPE_CONFIRMED !== "1") throw new Error("Refusing upload: set R2_PUBLIC_SCOPE_CONFIRMED=1 only after confirming public access is limited to blog/");
  const client = new S3Client({ endpoint: process.env.R2_ENDPOINT, region: "auto", credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
  await client.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: prepared.key, Body: prepared.body, ContentType: "image/webp", CacheControl: "public, max-age=31536000, immutable" }));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const index = (name) => process.argv.indexOf(`--${name}`);
  const file = index("file") >= 0 ? process.argv[index("file") + 1] : undefined;
  const article = index("article") >= 0 ? process.argv[index("article") + 1] : undefined;
  const dryRun = process.argv.includes("--dry-run");
  if (!file || !article) { console.error("Usage: node scripts/publish-media.mjs --file <path> --article <slug> [--dry-run]"); process.exit(2); }
  try { console.log(JSON.stringify(await publishMedia(file, article, { dryRun }), null, 2)); }
  catch (error) { console.error(error.message); process.exit(1); }
}
