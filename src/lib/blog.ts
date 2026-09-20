import { unstable_cache } from "next/cache";
import { fetchAllPosts } from "./ghost";
import { BLOG_CACHE_TAG, BLOG_REVALIDATE_SECONDS } from "./blog-cache";
import { canonicalBlogTagSlug, dedupeBlogTags, isSameBlogTag, tagToSlug } from "./blog-tag-slug";

export { tagToSlug } from "./blog-tag-slug";

export interface BlogPost {
  ghostId?: string;
  /** Digest of the exact CMS input rendered on this page, not a search signal. */
  sourceRevision?: string;
  slug: string;
  title: string;
  /**
   * Короткий SEO-title из Ghost (поле meta_title). Используется в <title>,
   * og:title, schema.headline. Если не задан — fallback на title.
   */
  metaTitle?: string;
  description: string;
  /** Дата публикации (YYYY-MM-DD). */
  date: string;
  /** Дата последнего редактирования в CMS (YYYY-MM-DD). Используется для dateModified и sitemap lastmod. */
  updatedAt?: string;
  /** Full CMS timestamps; display dates above remain backwards compatible. */
  publishedAtIso?: string;
  updatedAtIso?: string;
  readTime: string;
  category: string;
  icon: string;
  tags: string[];
  /**
   * Внутренние теги Ghost (#tag) — флаги, которые редактор использует
   * для управления рендерингом статьи (например, #howto разрешает HowTo
   * schema). Не показываются пользователю.
   */
  internalTags: string[];
  /** Slug калькулятора для CTA-ссылки */
  relatedCalculator?: { slug: string; categorySlug: string };
  /** Hero image URL */
  heroImage: string;
  /** Alt text for hero image */
  heroImageAlt: string;
  /** HTML-контент статьи (из Ghost) */
  content: string;
}

// Next owns the lifetime: no process-global snapshot that survives revalidation.
const getCachedPosts = unstable_cache(fetchAllPosts, ["ghost-published-posts-v3"], {
  tags: [BLOG_CACHE_TAG],
  revalidate: BLOG_REVALIDATE_SECONDS,
});

export async function getAllPosts(): Promise<BlogPost[]> {
  return getCachedPosts();
}

export async function getPostBySlug(slug: string): Promise<BlogPost | undefined> {
  // Same published snapshot as the catalogue, feeds, tags and related links.
  // Ghost failures propagate instead of turning into a false not-found.
  return (await getAllPosts()).find((post) => post.slug === slug);
}

export async function getAllTags(): Promise<string[]> {
  const posts = await getAllPosts();
  return dedupeBlogTags(posts.flatMap((post) => post.tags));
}

export async function getPostsByTag(tag: string): Promise<BlogPost[]> {
  const posts = await getAllPosts();
  return posts.filter((post) => post.tags.some((postTag) => isSameBlogTag(postTag, tag)));
}

export function slugToTag(slug: string): string {
  try {
    return decodeURIComponent(slug).replace(/-/g, " ");
  } catch {
    return slug.replace(/-/g, " ");
  }
}

export function resolveTagFromSlug(slug: string, tags: string[]): string | undefined {
  const decodedSlug = (() => {
    try {
      return decodeURIComponent(slug);
    } catch {
      return slug;
    }
  })().toLowerCase();
  const canonicalSlug = canonicalBlogTagSlug(decodedSlug);

  return tags.find((tag) => tagToSlug(tag) === canonicalSlug)
    ?? tags.find((tag) => tag.toLowerCase() === decodedSlug)
    ?? tags.find((tag) => slugToTag(slug).toLowerCase() === tag.toLowerCase());
}
