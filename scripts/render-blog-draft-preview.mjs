import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const articleArg = process.argv[2];
if (!articleArg) {
  console.error("Usage: node scripts/render-blog-draft-preview.mjs <article.md> [output.html]");
  process.exit(1);
}

const repoRoot = process.cwd();
const articlePath = path.resolve(repoRoot, articleArg);
const articleDir = path.dirname(articlePath);
const source = await fs.readFile(articlePath, "utf8");
const frontMatterMatch = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
if (!frontMatterMatch) {
  throw new Error(`Front matter not found in ${articlePath}`);
}

const frontMatter = frontMatterMatch[1];
const markdown = source.slice(frontMatterMatch[0].length).trim();

function scalar(key) {
  const match = frontMatter.match(new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|(.+))$`, "m"));
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugify(value) {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/[^а-яёa-z0-9]+/giu, "-")
    .replace(/^-+|-+$/g, "");
}

function childText(children) {
  return React.Children.toArray(children)
    .map((child) => (typeof child === "string" || typeof child === "number" ? String(child) : ""))
    .join("");
}

function repoUrl(relativeToArticle) {
  const absolute = path.resolve(articleDir, relativeToArticle);
  const relative = path.relative(repoRoot, absolute).split(path.sep).join("/");
  if (relative.startsWith("..")) {
    throw new Error(`Preview asset escapes repository: ${relativeToArticle}`);
  }
  return `/${relative}`;
}

function linkUrl(href = "") {
  return href.startsWith("/") ? `https://getmasterok.ru${href}` : href;
}

const title = scalar("title");
const metaTitle = scalar("meta_title") || title;
const description = scalar("description");
const featureImage = scalar("feature_image");
const featureAlt = scalar("feature_image_alt") || title;
const previewKicker = scalar("preview_kicker") || "Плитка · раскладка · практическое руководство";
const wordCount = (markdown.match(/[\p{L}\p{N}][\p{L}\p{N}–—-]*/gu) ?? []).length;
const readingTime = Math.max(1, Math.ceil(wordCount / 190));
const toc = [...markdown.matchAll(/^##\s+(.+)$/gm)].map((match) => ({
  title: match[1].replace(/[*_`]/g, ""),
  id: slugify(match[1]),
}));

const components = {
  h2: ({ children, ...props }) => React.createElement("h2", { ...props, id: slugify(childText(children)) }, children),
  h3: ({ children, ...props }) => React.createElement("h3", props, children),
  a: ({ href, children, ...props }) => {
    const resolved = linkUrl(href);
    const external = resolved.startsWith("http");
    return React.createElement("a", {
      ...props,
      href: resolved,
      target: external ? "_blank" : undefined,
      rel: external ? "noreferrer" : undefined,
    }, children);
  },
  img: ({ src = "", alt = "", ...props }) => React.createElement("img", {
    ...props,
    src: src.startsWith("./") ? repoUrl(src) : src,
    alt,
    loading: "lazy",
  }),
  table: ({ children, ...props }) => React.createElement(
    "div",
    { className: "table-wrap" },
    React.createElement("table", props, children),
  ),
};

const articleHtml = renderToStaticMarkup(
  React.createElement(ReactMarkdown, { remarkPlugins: [remarkGfm], components }, markdown),
);

const tocHtml = toc.map((item) => (
  `<li><a href="#${escapeHtml(item.id)}">${escapeHtml(item.title)}</a></li>`
)).join("");

const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(metaTitle)} — предпросмотр</title>
  <meta name="description" content="${escapeHtml(description)}">
  <style>
    :root { color-scheme: light; --ink:#171717; --muted:#6b665f; --line:#e8e0d6; --paper:#fffdf9; --accent:#c64f22; --soft:#f6f0e8; }
    * { box-sizing:border-box; }
    html { scroll-behavior:smooth; background:#efe9e1; }
    body { margin:0; color:var(--ink); background:radial-gradient(circle at 50% 0,#fffaf2 0,#efe9e1 52rem); font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; line-height:1.72; }
    .topbar { position:sticky; top:0; z-index:10; display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.8rem max(1rem,calc((100vw - 1160px)/2)); border-bottom:1px solid rgba(120,103,83,.18); background:rgba(255,253,249,.92); backdrop-filter:blur(14px); }
    .brand { font-weight:800; letter-spacing:-.02em; }
    .brand span { color:var(--accent); }
    .draft { padding:.32rem .65rem; border:1px solid #efb49d; border-radius:999px; color:#9b3513; background:#fff2ec; font-size:.78rem; font-weight:750; }
    main { width:min(1160px,calc(100% - 2rem)); margin:2rem auto 5rem; display:grid; grid-template-columns:minmax(0,790px) 280px; gap:2rem; align-items:start; }
    article { overflow:hidden; border:1px solid rgba(123,102,77,.16); border-radius:28px; background:var(--paper); box-shadow:0 24px 70px rgba(77,59,39,.12); }
    .hero { width:100%; aspect-ratio:1200/630; object-fit:cover; display:block; background:var(--soft); }
    .intro { padding:clamp(1.35rem,4vw,3rem) clamp(1.25rem,5vw,4.4rem) 1rem; }
    .eyebrow { color:var(--accent); font-size:.76rem; font-weight:850; letter-spacing:.12em; text-transform:uppercase; }
    h1 { margin:.55rem 0 .8rem; font-size:clamp(2rem,5vw,3.55rem); line-height:1.06; letter-spacing:-.045em; }
    .lead { margin:0; color:var(--muted); font-size:1.08rem; }
    .meta { display:flex; flex-wrap:wrap; gap:.55rem 1rem; margin-top:1.15rem; color:#7d7469; font-size:.86rem; }
    .content { padding:0 clamp(1.25rem,5vw,4.4rem) 4rem; }
    .content > p:first-child { font-size:1.16rem; color:#39352f; }
    h2 { margin:3.1rem 0 1rem; padding-top:.6rem; font-size:clamp(1.55rem,3vw,2.15rem); line-height:1.18; letter-spacing:-.03em; }
    h3 { margin:2rem 0 .65rem; font-size:1.22rem; line-height:1.3; }
    p { margin:.85rem 0 1.15rem; }
    strong { color:#111; }
    a { color:#a53b18; text-decoration-thickness:.08em; text-underline-offset:.18em; }
    ul,ol { padding-left:1.35rem; }
    li { margin:.35rem 0; }
    .content img { width:calc(100% + clamp(0rem,3vw,2.2rem)); max-width:none; margin:1.6rem 0 1rem calc(clamp(0rem,3vw,2.2rem)/-2); border-radius:18px; border:1px solid var(--line); box-shadow:0 14px 36px rgba(72,56,38,.11); }
    .content p:has(> img) { margin:2rem 0 .5rem; }
    .content p:has(> img) + p > em { display:block; color:var(--muted); font-size:.9rem; line-height:1.5; }
    .table-wrap { overflow-x:auto; margin:1.4rem 0; border:1px solid var(--line); border-radius:16px; }
    table { width:100%; min-width:620px; border-collapse:collapse; font-size:.93rem; }
    th,td { padding:.85rem 1rem; text-align:left; vertical-align:top; border-bottom:1px solid var(--line); }
    th { background:var(--soft); font-weight:800; }
    tr:last-child td { border-bottom:0; }
    aside { position:sticky; top:5.2rem; padding:1.25rem; border:1px solid rgba(123,102,77,.16); border-radius:20px; background:rgba(255,253,249,.9); box-shadow:0 18px 45px rgba(77,59,39,.08); }
    aside strong { display:block; margin-bottom:.65rem; }
    aside ol { margin:0; padding-left:1.15rem; font-size:.88rem; line-height:1.4; }
    aside li { margin:.58rem 0; color:var(--muted); }
    aside a { color:inherit; text-decoration:none; }
    aside a:hover { color:var(--accent); }
    .notice { margin-top:1rem; padding:.8rem .9rem; border-radius:14px; background:#fff2ec; color:#863111; font-size:.8rem; line-height:1.45; }
    @media (max-width:920px) { main { grid-template-columns:1fr; width:min(790px,calc(100% - 1rem)); margin-top:.5rem; } aside { display:none; } article { border-radius:20px; } }
    @media (max-width:560px) { .topbar { padding:.72rem 1rem; } h1 { font-size:2.05rem; } .intro { padding-top:1.4rem; } .content { padding-bottom:2.5rem; } .content img { width:100%; margin-left:0; border-radius:14px; } }
  </style>
</head>
<body>
  <header class="topbar"><div class="brand"><span>М</span>астерок · редакция</div><div class="draft">Черновик · не опубликовано</div></header>
  <main>
    <article>
      ${featureImage ? `<img class="hero" src="${escapeHtml(repoUrl(featureImage))}" alt="${escapeHtml(featureAlt)}">` : ""}
      <div class="intro">
        <div class="eyebrow">${escapeHtml(previewKicker)}</div>
        <h1>${escapeHtml(title)}</h1>
        <p class="lead">${escapeHtml(description)}</p>
        <div class="meta"><span>${wordCount.toLocaleString("ru-RU")} слов</span><span>≈ ${readingTime} мин чтения</span><span>${toc.length} разделов</span></div>
      </div>
      <div class="content">${articleHtml}</div>
    </article>
    <aside><strong>Содержание</strong><ol>${tocHtml}</ol><div class="notice">Это локальный предпросмотр. В Ghost типографика может немного отличаться.</div></aside>
  </main>
</body>
</html>`;

const outputArg = process.argv[3] || `output/blog-preview/${scalar("slug") || path.basename(articleDir)}.html`;
const outputPath = path.resolve(repoRoot, outputArg);
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, html, "utf8");
console.log(path.relative(repoRoot, outputPath).split(path.sep).join("/"));
