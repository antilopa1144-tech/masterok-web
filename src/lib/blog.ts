import { fetchAllPosts, fetchPostBySlug } from "./ghost";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  category: string;
  icon: string;
  tags: string[];
  /** Slug калькулятора для CTA-ссылки */
  relatedCalculator?: { slug: string; categorySlug: string };
  /** Hero image URL */
  heroImage: string;
  /** Alt text for hero image */
  heroImageAlt: string;
  /** HTML-контент статьи (из Ghost) */
  content: string;
}

/** Cache posts in memory during build to avoid duplicate API calls. */
let _postsCache: BlogPost[] | null = null;

export async function getAllPosts(): Promise<BlogPost[]> {
  if (_postsCache) return _postsCache;
  _postsCache = await fetchAllPosts();
  return _postsCache;
}

export async function getPostBySlug(slug: string): Promise<BlogPost | undefined> {
  if (_postsCache) {
    return _postsCache.find((p) => p.slug === slug);
  }
  return fetchPostBySlug(slug);
}

export async function getAllTags(): Promise<string[]> {
  const posts = await getAllPosts();
  const set = new Set<string>();
  for (const post of posts) {
    for (const tag of post.tags) set.add(tag);
  }
  return Array.from(set).sort();
}

export async function getPostsByTag(tag: string): Promise<BlogPost[]> {
  const posts = await getAllPosts();
  return posts.filter((p) => p.tags.includes(tag));
}

export function tagToSlug(tag: string): string {
  return encodeURIComponent(tag.toLowerCase().replace(/\s+/g, "-"));
}

export function slugToTag(slug: string): string {
  try {
    return decodeURIComponent(slug).replace(/-/g, " ");
  } catch {
    return slug.replace(/-/g, " ");
  }
}
