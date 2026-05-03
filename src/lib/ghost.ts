/**
 * Ghost Content API client for build-time data fetching.
 *
 * Used only during `next build` — the site is statically exported,
 * so there is no runtime API access.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { BlogPost } from "./blog";

// GHOST_API_URL: задайте в .env.local или CI secrets.
// Fallback для локальных билдов (внутренний сервер Ghost).
const GHOST_API_URL = process.env.GHOST_API_URL ?? "http://5.129.248.119";
const GHOST_CONTENT_API_KEY = process.env.GHOST_CONTENT_API_KEY ?? "";
const BLOG_IMAGE_MANIFEST_PATH = path.join(process.cwd(), "public", "blog-images", "manifest.json");

// ── Ghost API types ─────────────────────────────────────────────────────────

interface GhostPost {
  id: string;
  slug: string;
  title: string;
  html: string;
  plaintext?: string;
  custom_excerpt?: string;
  excerpt?: string;
  feature_image?: string;
  feature_image_alt?: string;
  published_at: string;
  updated_at?: string;
  reading_time?: number;
  tags?: GhostTag[];
  primary_tag?: GhostTag;
  meta_title?: string;
  meta_description?: string;
  og_image?: string;
  og_title?: string;
  custom_template?: string;
}

interface GhostTag {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface GhostResponse<T> {
  posts?: T[];
  tags?: T[];
  meta?: {
    pagination: {
      page: number;
      limit: number;
      pages: number;
      total: number;
    };
  };
}

interface BlogImageManifest {
  posts?: Array<{
    replacements?: Array<{
      from: string;
      to: string;
    }>;
  }>;
}

let _blogImageUrlMap: Map<string, string> | null | undefined;

function getBlogImageUrlMap(): Map<string, string> | null {
  if (_blogImageUrlMap !== undefined) return _blogImageUrlMap;

  if (!existsSync(BLOG_IMAGE_MANIFEST_PATH)) {
    _blogImageUrlMap = null;
    return _blogImageUrlMap;
  }

  try {
    const manifest = JSON.parse(readFileSync(BLOG_IMAGE_MANIFEST_PATH, "utf8")) as BlogImageManifest;
    const map = new Map<string, string>();
    for (const post of manifest.posts ?? []) {
      for (const replacement of post.replacements ?? []) {
        if (replacement.from && replacement.to) {
          map.set(replacement.from, replacement.to);
        }
      }
    }
    _blogImageUrlMap = map.size > 0 ? map : null;
  } catch {
    _blogImageUrlMap = null;
  }

  return _blogImageUrlMap;
}

function applyBlogImageManifest(value: string): string {
  const map = getBlogImageUrlMap();
  if (!map || !value) return value;

  let next = value;
  for (const [from, to] of map) {
    next = next.split(from).join(to);
    next = next.split(escapeHtmlAttribute(from)).join(to);
  }
  return next;
}

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// ── API helper ──────────────────────────────────────────────────────────────

async function ghostFetch<T>(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<T> {
  if (!GHOST_API_URL) {
    throw new Error("GHOST_API_URL не задан. Укажите в .env.local или CI secrets.");
  }
  const url = new URL(`/ghost/api/content${endpoint}`, GHOST_API_URL);
  url.searchParams.set("key", GHOST_CONTENT_API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url.toString());

      if (!res.ok) {
        throw new Error(`Ghost API error: ${res.status} ${res.statusText} for ${endpoint}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error(`Ghost API failed after 3 retries for ${endpoint}`);
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Ghost stores tags as objects. We use the primary_tag name as "category"
 * and all other tags as regular tags. Convention:
 * - Tags starting with "#" are internal tags (hidden) — used for metadata
 * - primary_tag = category equivalent
 * - remaining tags = regular tags
 */
function transformPost(post: GhostPost): BlogPost {
  const category = post.primary_tag?.name ?? "";
  const tags = post.tags
    ?.filter((t) => !t.name.startsWith("#") && t.id !== post.primary_tag?.id)
    .map((t) => t.name) ?? [];

  // Extract relatedCalculator from internal tags: #calc:slug:category
  let relatedCalculator: { slug: string; categorySlug: string } | undefined;
  const calcTag = post.tags?.find((t) => t.name.startsWith("#calc:"));
  if (calcTag) {
    const parts = calcTag.name.split(":");
    if (parts.length >= 3) {
      relatedCalculator = { slug: parts[1], categorySlug: parts[2] };
    }
  }

  // Extract icon from internal tags: #icon:🧱
  const iconTag = post.tags?.find((t) => t.name.startsWith("#icon:"));
  const icon = iconTag ? iconTag.name.replace("#icon:", "") : "";

  return {
    slug: post.slug,
    title: post.title,
    description: post.custom_excerpt ?? post.meta_description ?? post.excerpt ?? "",
    date: post.published_at?.split("T")[0] ?? "",
    readTime: post.reading_time ? `${post.reading_time} мин` : "",
    category,
    icon,
    tags,
    relatedCalculator,
    heroImage: applyBlogImageManifest(post.feature_image ?? ""),
    heroImageAlt: post.feature_image_alt ?? "",
    content: applyBlogImageManifest(post.html ?? ""),
  };
}

export async function fetchAllPosts(): Promise<BlogPost[]> {
  if (!GHOST_API_URL || !GHOST_CONTENT_API_KEY) {
    console.warn("[Ghost] GHOST_API_URL или GHOST_CONTENT_API_KEY не заданы — блог будет пустым.");
    return [];
  }
  try {
    const res = await ghostFetch<GhostResponse<GhostPost>>("/posts/", {
      include: "tags",
      limit: "all",
      order: "published_at desc",
    });
    return (res.posts ?? []).map(transformPost);
  } catch (err) {
    console.error("[Ghost] Failed to fetch posts:", err);
    return [];
  }
}

export async function fetchPostBySlug(slug: string): Promise<BlogPost | undefined> {
  if (!GHOST_API_URL || !GHOST_CONTENT_API_KEY) return undefined;
  try {
    const res = await ghostFetch<GhostResponse<GhostPost>>(`/posts/slug/${slug}/`, {
      include: "tags",
    });

    if (!res.posts || res.posts.length === 0) return undefined;
    return transformPost(res.posts[0]);
  } catch {
    return undefined;
  }
}

