#!/usr/bin/env node

import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "public", "blog-images");
const DEFAULT_MAX_WIDTH = 1200;
const DEFAULT_QUALITY = 78;

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run") || (!args.has("--write-files") && !args.has("--write-ghost"));
const writeFiles = args.has("--write-files") || args.has("--write-ghost");
const writeGhost = args.has("--write-ghost");
const force = args.has("--force");
const maxWidth = readNumberArg("--max-width", DEFAULT_MAX_WIDTH);
const quality = readNumberArg("--quality", DEFAULT_QUALITY);

loadDotEnv(".env.local");

const GHOST_API_URL = trimTrailingSlash(process.env.GHOST_API_URL ?? "http://5.129.248.119");
const GHOST_CONTENT_API_KEY = process.env.GHOST_CONTENT_API_KEY ?? "";
const GHOST_ADMIN_API_KEY = process.env.GHOST_ADMIN_API_KEY ?? "";
const PUBLIC_SITE_URL = trimTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmasterok.ru");

if (!GHOST_CONTENT_API_KEY) {
  fail("GHOST_CONTENT_API_KEY не задан. Скрипт читает посты через Ghost Content API.");
}

if (writeGhost && !GHOST_ADMIN_API_KEY) {
  fail("Для --write-ghost нужен GHOST_ADMIN_API_KEY. Без него можно выполнить только --write-files.");
}

const sharp = await importSharp();

const posts = await fetchAllPosts();
if (posts.length === 0) {
  console.log("Ghost вернул 0 постов. Нечего оптимизировать.");
  process.exit(0);
}

if (writeFiles) {
  await mkdir(OUTPUT_DIR, { recursive: true });
}

let scannedImages = 0;
let convertedImages = 0;
let totalOriginalBytes = 0;
let totalWebpBytes = 0;
const updates = [];

for (const post of posts) {
  const images = collectImages(post);
  if (images.length === 0) continue;

  let nextHtml = post.html ?? "";
  let nextFeatureImage = post.feature_image ?? "";
  const replacements = [];

  for (const image of images) {
    scannedImages++;

    if (!force && isWebpUrl(image.url)) continue;
    if (!isHttpUrl(image.url)) continue;

    const original = await downloadImage(image.url);
    if (!original) continue;

    const originalBytes = original.byteLength;
    const webp = await sharp(original, { animated: true })
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality, effort: 6 })
      .toBuffer();

    const webpBytes = webp.byteLength;
    totalOriginalBytes += originalBytes;
    totalWebpBytes += webpBytes;
    convertedImages++;

    const fileName = buildFileName(post.slug, image.kind, image.index, image.url, webp);
    const publicUrl = `${PUBLIC_SITE_URL}/blog-images/${fileName}`;

    if (writeFiles) {
      await writeFile(path.join(OUTPUT_DIR, fileName), webp);
    }

    if (image.kind === "feature") {
      nextFeatureImage = publicUrl;
    } else {
      nextHtml = replaceAll(nextHtml, image.url, publicUrl);
    }

    replacements.push({
      from: image.url,
      to: publicUrl,
      originalBytes,
      webpBytes,
      savedBytes: originalBytes - webpBytes,
    });
  }

  if (replacements.length > 0) {
    updates.push({
      id: post.id,
      slug: post.slug,
      title: post.title,
      updated_at: post.updated_at,
      html: nextHtml,
      feature_image: nextFeatureImage,
      replacements,
    });
  }
}

printSummary({ posts, updates, scannedImages, convertedImages, totalOriginalBytes, totalWebpBytes });

if (dryRun) {
  console.log("Dry run: файлы не записаны, Ghost не обновлён.");
  console.log("Для записи файлов: npm run blog:images:webp -- --write-files");
  console.log("Для записи файлов и обновления Ghost: npm run blog:images:webp -- --write-ghost");
  process.exit(0);
}

if (writeFiles) {
  const manifest = updates.map((update) => ({
    slug: update.slug,
    replacements: update.replacements.map(({ from, to, originalBytes, webpBytes, savedBytes }) => ({
      from,
      to,
      originalBytes,
      webpBytes,
      savedBytes,
    })),
  }));
  await writeFile(
    path.join(OUTPUT_DIR, "manifest.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), posts: manifest }, null, 2)}\n`,
  );
  console.log(`Файлы WebP записаны в ${path.relative(ROOT, OUTPUT_DIR)}.`);
  console.log("Манифест замен: public/blog-images/manifest.json");
}

if (writeGhost) {
  for (const update of updates) {
    await updateGhostPost(update);
    console.log(`Ghost обновлён: ${update.slug} (${update.replacements.length} img)`);
  }
}

function collectImages(post) {
  const images = [];

  if (post.feature_image) {
    images.push({ kind: "feature", index: 0, url: post.feature_image });
  }

  const html = post.html ?? "";
  const imgRe = /<img\b[^>]*?\bsrc=(["'])(.*?)\1[^>]*>/gi;
  let match;
  let index = 0;
  while ((match = imgRe.exec(html)) !== null) {
    images.push({ kind: "inline", index: index++, url: decodeHtmlAttribute(match[2]) });
  }

  const seen = new Set();
  return images.filter((image) => {
    const key = `${image.kind}:${image.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchAllPosts() {
  const posts = [];
  let page = 1;
  let pages = 1;

  do {
    const url = new URL("/ghost/api/content/posts/", GHOST_API_URL);
    url.searchParams.set("key", GHOST_CONTENT_API_KEY);
    url.searchParams.set("limit", "100");
    url.searchParams.set("page", String(page));
    url.searchParams.set("formats", "html");
    url.searchParams.set("fields", "id,slug,title,html,feature_image,updated_at");

    let res;
    try {
      res = await fetch(url);
    } catch (err) {
      fail(`Ghost Content API недоступен: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!res.ok) {
      fail(`Ghost Content API error: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    posts.push(...(json.posts ?? []));
    pages = json.meta?.pagination?.pages ?? 1;
    page++;
  } while (page <= pages);

  return posts;
}

async function downloadImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Пропуск: ${url} (${res.status})`);
      return null;
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      console.warn(`Пропуск: ${url} (${contentType || "unknown content-type"})`);
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.warn(`Пропуск: ${url} (${err instanceof Error ? err.message : String(err)})`);
    return null;
  }
}

async function updateGhostPost(update) {
  const token = createGhostAdminToken(GHOST_ADMIN_API_KEY);
  const url = new URL(`/ghost/api/admin/posts/${update.id}/`, GHOST_API_URL);
  url.searchParams.set("source", "html");

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Ghost ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      posts: [
        {
          updated_at: update.updated_at,
          html: update.html,
          feature_image: update.feature_image || null,
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    fail(`Ghost Admin API error for ${update.slug}: ${res.status} ${res.statusText}\n${text}`);
  }
}

function createGhostAdminToken(adminKey) {
  const [id, secret] = adminKey.split(":");
  if (!id || !secret) fail("GHOST_ADMIN_API_KEY должен быть в формате id:secret.");

  const header = { alg: "HS256", typ: "JWT", kid: id };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now,
    exp: now + 5 * 60,
    aud: "/admin/",
  };

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", Buffer.from(secret, "hex"))
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function importSharp() {
  try {
    const mod = await import("sharp");
    return mod.default;
  } catch {
    fail("Не найден sharp. Установите его: npm i -D sharp");
  }
}

function buildFileName(slug, kind, index, sourceUrl, webpBuffer) {
  const sourceHash = createHash("sha1").update(sourceUrl).update(webpBuffer).digest("hex").slice(0, 10);
  const cleanSlug = slug.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "") || "post";
  return `${cleanSlug}-${kind}-${index + 1}-${sourceHash}.webp`;
}

function printSummary({ posts, updates, scannedImages, convertedImages, totalOriginalBytes, totalWebpBytes }) {
  const saved = totalOriginalBytes - totalWebpBytes;
  console.log(`Постов просканировано: ${posts.length}`);
  console.log(`Картинок найдено: ${scannedImages}`);
  console.log(`Картинок к WebP: ${convertedImages}`);
  console.log(`Исходный размер: ${formatBytes(totalOriginalBytes)}`);
  console.log(`WebP размер: ${formatBytes(totalWebpBytes)}`);
  console.log(`Экономия: ${formatBytes(saved)} (${percent(saved, totalOriginalBytes)})`);

  for (const update of updates) {
    const original = update.replacements.reduce((sum, item) => sum + item.originalBytes, 0);
    const webp = update.replacements.reduce((sum, item) => sum + item.webpBytes, 0);
    console.log(`- ${update.slug}: ${update.replacements.length} img, ${formatBytes(original)} -> ${formatBytes(webp)}`);
  }
}

function loadDotEnv(fileName) {
  const filePath = path.join(ROOT, fileName);
  let content = "";
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return;
  }

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (process.env[key]) continue;
    process.env[key] = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
  }
}

function readNumberArg(name, fallback) {
  const raw = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (!raw) return fallback;
  const value = Number(raw.slice(name.length + 1));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function isHttpUrl(url) {
  return /^https?:\/\//i.test(url);
}

function isWebpUrl(url) {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".webp");
  } catch {
    return url.toLowerCase().split("?")[0].endsWith(".webp");
  }
}

function replaceAll(input, from, to) {
  return input.split(from).join(to);
}

function decodeHtmlAttribute(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function percent(value, total) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
