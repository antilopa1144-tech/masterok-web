import { unstable_cache } from "next/cache";
import { fetchAllPosts } from "./ghost";
import { BLOG_CACHE_TAG, BLOG_REVALIDATE_SECONDS } from "./blog-cache";

export interface BlogPost {
  ghostId?: string;
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
const getCachedPosts = unstable_cache(fetchAllPosts, ["ghost-published-posts-v2"], {
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

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

export function tagToSlug(tag: string): string {
  const transliterated = tag
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("");

  return transliterated
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "tag";
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

  return tags.find((tag) => tagToSlug(tag) === decodedSlug)
    ?? tags.find((tag) => tag.toLowerCase() === decodedSlug)
    ?? tags.find((tag) => slugToTag(slug).toLowerCase() === tag.toLowerCase());
}
