/**
 * One-time migration script: content/blog/*.md → Strapi v5.
 *
 * Usage:
 *   STRAPI_API_URL=http://localhost:1337 STRAPI_API_TOKEN=xxx npx tsx scripts/migrate-to-strapi.ts
 *
 * What it does:
 *   1. Reads all markdown blog posts from content/blog/
 *   2. Creates categories and tags in Strapi
 *   3. Uploads hero images to Strapi Media Library
 *   4. Converts markdown content to Strapi Blocks JSON
 *   5. Creates articles with all relations
 *
 * Safe to re-run: checks for existing slugs before creating.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

const STRAPI_URL = process.env.STRAPI_API_URL ?? "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN ?? "";
const CONTENT_DIR = path.join(process.cwd(), "content/blog");
const IMAGES_DIR = path.join(process.cwd(), "public/blog-images");

// ── Strapi API helpers ──────────────────────────────────────────────────────

async function strapiRequest(
  method: string,
  endpoint: string,
  body?: unknown,
): Promise<unknown> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (STRAPI_TOKEN) {
    headers["Authorization"] = `Bearer ${STRAPI_TOKEN}`;
  }

  const res = await fetch(`${STRAPI_URL}/api${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strapi ${method} ${endpoint}: ${res.status} — ${text}`);
  }

  return res.json();
}

async function uploadFile(filePath: string, fileName: string): Promise<number> {
  const form = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer]);
  form.append("files", blob, fileName);

  const headers: Record<string, string> = {};
  if (STRAPI_TOKEN) {
    headers["Authorization"] = `Bearer ${STRAPI_TOKEN}`;
  }

  const res = await fetch(`${STRAPI_URL}/api/upload`, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed for ${fileName}: ${res.status} — ${text}`);
  }

  const data = (await res.json()) as { id: number }[];
  return data[0].id;
}

async function downloadAndUpload(url: string, fileName: string): Promise<number> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const tmpPath = path.join(IMAGES_DIR, `_tmp_${fileName}`);
  fs.writeFileSync(tmpPath, buffer);

  try {
    return await uploadFile(tmpPath, fileName);
  } finally {
    fs.unlinkSync(tmpPath);
  }
}

// ── Markdown → Strapi Blocks converter ──────────────────────────────────────

interface TextNode {
  type: "text";
  text: string;
  bold?: boolean;
  italic?: boolean;
}

interface LinkNode {
  type: "link";
  url: string;
  children: TextNode[];
}

type InlineNode = TextNode | LinkNode;

interface Block {
  type: string;
  [key: string]: unknown;
}

function parseInlineFormatting(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  // Simple regex for **bold** and *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**")) {
      nodes.push({ type: "text", text: part.slice(2, -2), bold: true });
    } else if (part.startsWith("*") && part.endsWith("*")) {
      nodes.push({ type: "text", text: part.slice(1, -1), italic: true });
    } else {
      nodes.push({ type: "text", text: part });
    }
  }

  return nodes.length > 0 ? nodes : [{ type: "text", text }];
}

function markdownToBlocks(content: string): Block[] {
  const lines = content.split("\n");
  const blocks: Block[] = [];
  let currentParagraph: string[] = [];
  let currentList: { items: string[]; ordered: boolean } | null = null;

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(" ").trim();
      if (text) {
        blocks.push({
          type: "paragraph",
          children: parseInlineFormatting(text),
        });
      }
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (currentList && currentList.items.length > 0) {
      blocks.push({
        type: "list",
        format: currentList.ordered ? "ordered" : "unordered",
        children: currentList.items.map((item) => ({
          type: "list-item",
          children: parseInlineFormatting(item),
        })),
      });
      currentList = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Image
    if (trimmed.startsWith("![")) {
      flushParagraph();
      flushList();
      const match = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (match) {
        blocks.push({
          type: "image",
          image: {
            url: match[2],
            alternativeText: match[1] || undefined,
          },
        });
      }
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: 3,
        children: parseInlineFormatting(trimmed.slice(4)),
      });
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: 2,
        children: parseInlineFormatting(trimmed.slice(3)),
      });
      continue;
    }

    // Unordered list
    if (trimmed.startsWith("- ")) {
      flushParagraph();
      if (!currentList || currentList.ordered) {
        flushList();
        currentList = { items: [], ordered: false };
      }
      currentList.items.push(trimmed.slice(2));
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(trimmed)) {
      flushParagraph();
      if (!currentList || !currentList.ordered) {
        flushList();
        currentList = { items: [], ordered: true };
      }
      currentList.items.push(trimmed.replace(/^\d+\.\s/, ""));
      continue;
    }

    // Empty line
    if (trimmed === "") {
      flushParagraph();
      flushList();
      continue;
    }

    // Regular text → accumulate for paragraph
    flushList();
    currentParagraph.push(trimmed);
  }

  flushParagraph();
  flushList();

  return blocks;
}

// ── Main migration ──────────────────────────────────────────────────────────

interface PostData {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  category: string;
  icon: string;
  tags: string[];
  relatedCalculatorSlug?: string;
  relatedCalculatorCategory?: string;
  heroImage: string;
  heroImageAlt: string;
  content: string;
}

function readAllPosts(): PostData[] {
  if (!fs.existsSync(CONTENT_DIR)) {
    throw new Error(`Content directory not found: ${CONTENT_DIR}`);
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));
  return files.map((f) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, f), "utf-8");
    const { data, content } = matter(raw);
    return {
      slug: data.slug,
      title: data.title,
      description: data.description,
      date: data.date,
      readTime: data.readTime,
      category: data.category,
      icon: data.icon ?? "",
      tags: data.tags ?? [],
      relatedCalculatorSlug: data.relatedCalculatorSlug,
      relatedCalculatorCategory: data.relatedCalculatorCategory,
      heroImage: data.heroImage ?? "",
      heroImageAlt: data.heroImageAlt ?? "",
      content: content.trim(),
    };
  });
}

async function ensureCategory(name: string, cache: Map<string, number>): Promise<number> {
  if (cache.has(name)) return cache.get(name)!;

  // Check if exists
  const existing = (await strapiRequest("GET", `/categories?filters[name][$eq]=${encodeURIComponent(name)}`)) as {
    data: { id: number }[];
  };
  if (existing.data.length > 0) {
    cache.set(name, existing.data[0].id);
    return existing.data[0].id;
  }

  // Create
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9а-яё-]/gi, "");
  const created = (await strapiRequest("POST", "/categories", {
    data: { name, slug },
  })) as { data: { id: number } };

  cache.set(name, created.data.id);
  console.log(`  ✓ Category: ${name} (id=${created.data.id})`);
  return created.data.id;
}

async function ensureTag(name: string, cache: Map<string, number>): Promise<number> {
  if (cache.has(name)) return cache.get(name)!;

  const existing = (await strapiRequest("GET", `/tags?filters[name][$eq]=${encodeURIComponent(name)}`)) as {
    data: { id: number }[];
  };
  if (existing.data.length > 0) {
    cache.set(name, existing.data[0].id);
    return existing.data[0].id;
  }

  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9а-яё-]/gi, "");
  const created = (await strapiRequest("POST", "/tags", {
    data: { name, slug },
  })) as { data: { id: number } };

  cache.set(name, created.data.id);
  return created.data.id;
}

async function uploadHeroImage(imageUrl: string, slug: string): Promise<number | null> {
  try {
    // Local image: /blog-images/filename.jpg
    if (imageUrl.startsWith("/blog-images/")) {
      const fileName = imageUrl.replace("/blog-images/", "");
      const filePath = path.join(IMAGES_DIR, fileName);
      if (!fs.existsSync(filePath)) {
        console.warn(`  ⚠ Local image not found: ${filePath}`);
        return null;
      }
      return await uploadFile(filePath, fileName);
    }

    // External URL (Unsplash etc.)
    if (imageUrl.startsWith("http")) {
      const ext = imageUrl.includes(".png") ? "png" : "jpg";
      const fileName = `${slug}-hero.${ext}`;
      return await downloadAndUpload(imageUrl, fileName);
    }

    return null;
  } catch (err) {
    console.warn(`  ⚠ Image upload failed for ${slug}: ${err}`);
    return null;
  }
}

async function main() {
  console.log("🔄 Starting migration to Strapi...\n");
  console.log(`  Strapi URL: ${STRAPI_URL}`);
  console.log(`  Content dir: ${CONTENT_DIR}\n`);

  // Read all posts
  const posts = readAllPosts();
  console.log(`📄 Found ${posts.length} blog posts\n`);

  // Create categories
  console.log("📁 Creating categories...");
  const categoryCache = new Map<string, number>();
  const uniqueCategories = [...new Set(posts.map((p) => p.category))];
  for (const cat of uniqueCategories) {
    await ensureCategory(cat, categoryCache);
  }
  console.log(`  Total: ${categoryCache.size} categories\n`);

  // Create tags
  console.log("🏷️  Creating tags...");
  const tagCache = new Map<string, number>();
  const uniqueTags = [...new Set(posts.flatMap((p) => p.tags))];
  for (const tag of uniqueTags) {
    await ensureTag(tag, tagCache);
  }
  console.log(`  Total: ${tagCache.size} tags\n`);

  // Migrate articles
  console.log("📝 Migrating articles...\n");

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const post of posts) {
    process.stdout.write(`  ${post.slug}... `);

    // Check if article already exists
    const existing = (await strapiRequest(
      "GET",
      `/articles?filters[slug][$eq]=${encodeURIComponent(post.slug)}`,
    )) as { data: { id: number }[] };

    if (existing.data.length > 0) {
      console.log("SKIPPED (already exists)");
      skipped++;
      continue;
    }

    try {
      // Upload hero image
      const heroImageId = post.heroImage
        ? await uploadHeroImage(post.heroImage, post.slug)
        : null;

      // Convert content to Blocks
      const contentBlocks = markdownToBlocks(post.content);

      // Resolve relations
      const categoryId = await ensureCategory(post.category, categoryCache);
      const tagIds = await Promise.all(
        post.tags.map((t) => ensureTag(t, tagCache)),
      );

      // Create article
      await strapiRequest("POST", "/articles", {
        data: {
          title: post.title,
          slug: post.slug,
          description: post.description,
          content: contentBlocks,
          date: post.date,
          readTime: post.readTime,
          icon: post.icon,
          heroImage: heroImageId ?? undefined,
          heroImageAlt: post.heroImageAlt,
          relatedCalculatorSlug: post.relatedCalculatorSlug ?? null,
          relatedCalculatorCategory: post.relatedCalculatorCategory ?? null,
          category: categoryId,
          tags: tagIds,
        },
      });

      console.log("OK");
      created++;
    } catch (err) {
      console.log(`ERROR: ${err}`);
      errors++;
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors:  ${errors}`);

  if (errors > 0) {
    console.log("\n⚠ Some articles failed. Re-run the script to retry (it skips existing ones).");
  }
}

main().catch((err) => {
  console.error(`\n❌ Migration failed: ${err.message}`);
  process.exit(1);
});
