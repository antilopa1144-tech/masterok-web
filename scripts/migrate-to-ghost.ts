/**
 * One-time migration script: content/blog/*.md → Ghost CMS.
 *
 * Usage:
 *   GHOST_API_URL=http://5.129.248.119 GHOST_ADMIN_API_KEY=xxx npx tsx scripts/migrate-to-ghost.ts
 *
 * What it does:
 *   1. Reads all markdown blog posts from content/blog/
 *   2. Converts markdown to HTML using `marked`
 *   3. Creates posts in Ghost via Admin API with tags, images, metadata
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";
import crypto from "crypto";

const GHOST_URL = process.env.GHOST_API_URL ?? "http://localhost:2368";
const ADMIN_API_KEY = process.env.GHOST_ADMIN_API_KEY ?? "";
const CONTENT_DIR = path.join(process.cwd(), "content/blog");

// ── Ghost Admin API JWT ─────────────────────────────────────────────────────

function createGhostToken(): string {
  const [id, secret] = ADMIN_API_KEY.split(":");
  if (!id || !secret) throw new Error("GHOST_ADMIN_API_KEY must be in format id:secret");

  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iat: now,
    exp: now + 300,
    aud: "/admin/",
  })).toString("base64url");

  const hmac = crypto.createHmac("sha256", Buffer.from(secret, "hex"));
  hmac.update(`${header}.${payload}`);
  const signature = hmac.digest("base64url");

  return `${header}.${payload}.${signature}`;
}

// ── Ghost Admin API helpers ─────────────────────────────────────────────────

async function ghostAdminRequest(method: string, endpoint: string, body?: unknown): Promise<unknown> {
  const token = createGhostToken();
  const res = await fetch(`${GHOST_URL}/ghost/api/admin${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Ghost ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ghost ${method} ${endpoint}: ${res.status} — ${text.slice(0, 200)}`);
  }

  return res.json();
}

// ── Read posts ──────────────────────────────────────────────────────────────

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

// ── Main migration ──────────────────────────────────────────────────────────

async function main() {
  console.log("🔄 Starting migration to Ghost...\n");
  console.log(`  Ghost URL: ${GHOST_URL}`);
  console.log(`  Content dir: ${CONTENT_DIR}\n`);

  const posts = readAllPosts();
  console.log(`📄 Found ${posts.length} blog posts\n`);

  // Check existing posts in Ghost
  const existingRes = (await ghostAdminRequest("GET", "/posts/?limit=all&fields=slug")) as {
    posts: { slug: string }[];
  };
  const existingSlugs = new Set(existingRes.posts.map((p) => p.slug));

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const post of posts) {
    process.stdout.write(`  ${post.slug}... `);

    if (existingSlugs.has(post.slug)) {
      console.log("SKIPPED (exists)");
      skipped++;
      continue;
    }

    try {
      // Convert markdown to HTML
      const html = await marked(post.content);

      // Build tags array for Ghost
      // primary_tag = category, then regular tags, then internal tags for metadata
      const ghostTags: { name: string }[] = [
        { name: post.category }, // primary tag = category
        ...post.tags.map((t) => ({ name: t })),
      ];

      // Add internal tags for icon and related calculator
      if (post.icon) {
        ghostTags.push({ name: `#icon:${post.icon}` });
      }
      if (post.relatedCalculatorSlug && post.relatedCalculatorCategory) {
        ghostTags.push({ name: `#calc:${post.relatedCalculatorSlug}:${post.relatedCalculatorCategory}` });
      }

      // Create post — source:"html" is required for Ghost v5+ to accept html field
      await ghostAdminRequest("POST", "/posts/?source=html", {
        posts: [{
          title: post.title,
          slug: post.slug,
          html,
          status: "published",
          published_at: new Date(post.date).toISOString(),
          custom_excerpt: post.description,
          meta_description: post.description,
          feature_image: post.heroImage || undefined,
          feature_image_alt: post.heroImageAlt || undefined,
          tags: ghostTags,
        }],
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
}

main().catch((err) => {
  console.error(`\n❌ Migration failed: ${err.message}`);
  process.exit(1);
});
