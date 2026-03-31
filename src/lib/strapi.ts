/**
 * Strapi REST API client for build-time data fetching.
 *
 * Used only during `next build` — the site is statically exported,
 * so there is no runtime API access.
 */

const STRAPI_API_URL = process.env.STRAPI_API_URL ?? "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN ?? "";

// ── Strapi Blocks types ─────────────────────────────────────────────────────

export interface StrapiTextNode {
  type: "text";
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
}

export interface StrapiLinkNode {
  type: "link";
  url: string;
  children: StrapiTextNode[];
}

export type StrapiInlineNode = StrapiTextNode | StrapiLinkNode;

export interface StrapiHeadingBlock {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: StrapiInlineNode[];
}

export interface StrapiParagraphBlock {
  type: "paragraph";
  children: StrapiInlineNode[];
}

export interface StrapiListBlock {
  type: "list";
  format: "ordered" | "unordered";
  children: StrapiListItemBlock[];
}

export interface StrapiListItemBlock {
  type: "list-item";
  children: StrapiInlineNode[];
}

export interface StrapiImageBlock {
  type: "image";
  image: {
    url: string;
    alternativeText?: string;
    width?: number;
    height?: number;
  };
}

export interface StrapiQuoteBlock {
  type: "quote";
  children: StrapiInlineNode[];
}

export interface StrapiCodeBlock {
  type: "code";
  children: StrapiTextNode[];
}

export type StrapiBlock =
  | StrapiHeadingBlock
  | StrapiParagraphBlock
  | StrapiListBlock
  | StrapiImageBlock
  | StrapiQuoteBlock
  | StrapiCodeBlock;

// ── Strapi response types ───────────────────────────────────────────────────

interface StrapiMedia {
  url: string;
  alternativeText?: string;
  width?: number;
  height?: number;
}

interface StrapiArticle {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  description: string;
  content: StrapiBlock[];
  date: string;
  readTime: string;
  icon: string;
  heroImage?: StrapiMedia;
  heroImageAlt: string;
  relatedCalculatorSlug?: string;
  relatedCalculatorCategory?: string;
  category?: { name: string; slug: string };
  tags?: { name: string; slug: string }[];
}

interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// ── API helpers ─────────────────────────────────────────────────────────────

async function fetchAPI<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`/api${path}`, STRAPI_API_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const headers: Record<string, string> = {};
      if (STRAPI_API_TOKEN) {
        headers["Authorization"] = `Bearer ${STRAPI_API_TOKEN}`;
      }

      const res = await fetch(url.toString(), { headers });

      if (!res.ok) {
        throw new Error(`Strapi API error: ${res.status} ${res.statusText} for ${path}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error(`Strapi API failed after 3 retries for ${path}`);
}

// ── Media URL helper ────────────────────────────────────────────────────────

function mediaUrl(media: StrapiMedia | undefined): string {
  if (!media?.url) return "";
  // Strapi may return relative URLs — prepend base if needed
  if (media.url.startsWith("http")) return media.url;
  return `${STRAPI_API_URL}${media.url}`;
}

// ── Public API ──────────────────────────────────────────────────────────────

import type { BlogPost } from "./blog";

function transformArticle(article: StrapiArticle): BlogPost {
  return {
    slug: article.slug,
    title: article.title,
    description: article.description,
    date: article.date,
    readTime: article.readTime,
    category: article.category?.name ?? "",
    icon: article.icon ?? "",
    tags: article.tags?.map((t) => t.name) ?? [],
    relatedCalculator:
      article.relatedCalculatorSlug && article.relatedCalculatorCategory
        ? {
            slug: article.relatedCalculatorSlug,
            categorySlug: article.relatedCalculatorCategory,
          }
        : undefined,
    heroImage: mediaUrl(article.heroImage),
    heroImageAlt: article.heroImageAlt ?? "",
    content: article.content,
  };
}

export async function fetchAllPosts(): Promise<BlogPost[]> {
  const res = await fetchAPI<StrapiResponse<StrapiArticle[]>>("/articles", {
    "populate[category]": "true",
    "populate[tags]": "true",
    "populate[heroImage]": "true",
    "sort": "date:desc",
    "pagination[pageSize]": "200",
    "status": "published",
  });

  return res.data.map(transformArticle);
}

export async function fetchPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const res = await fetchAPI<StrapiResponse<StrapiArticle[]>>("/articles", {
    "filters[slug][$eq]": slug,
    "populate[category]": "true",
    "populate[tags]": "true",
    "populate[heroImage]": "true",
    "status": "published",
  });

  if (!res.data || res.data.length === 0) return undefined;
  return transformArticle(res.data[0]);
}

export async function fetchAllCategories(): Promise<{ name: string; slug: string }[]> {
  const res = await fetchAPI<StrapiResponse<{ name: string; slug: string }[]>>("/categories", {
    "sort": "name:asc",
    "pagination[pageSize]": "100",
  });

  return res.data;
}

export async function fetchAllTags(): Promise<{ name: string; slug: string }[]> {
  const res = await fetchAPI<StrapiResponse<{ name: string; slug: string }[]>>("/tags", {
    "sort": "name:asc",
    "pagination[pageSize]": "200",
  });

  return res.data;
}

// ── Blocks utilities ────────────────────────────────────────────────────────

/** Extract plain text from Strapi Blocks (for word count, RSS, etc.) */
export function blocksToPlainText(blocks: StrapiBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    if ("children" in block) {
      for (const child of block.children) {
        if (child.type === "text") {
          parts.push(child.text);
        } else if (child.type === "link") {
          for (const linkChild of child.children) {
            parts.push(linkChild.text);
          }
        } else if (child.type === "list-item" && "children" in child) {
          for (const itemChild of (child as StrapiListItemBlock).children) {
            if (itemChild.type === "text") parts.push(itemChild.text);
          }
        }
      }
    }
  }

  return parts.join(" ");
}
