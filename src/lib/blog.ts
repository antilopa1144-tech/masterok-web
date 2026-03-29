import fs from "fs";
import path from "path";
import matter from "gray-matter";

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
  /** Полный текст статьи в markdown */
  content: string;
}

const CONTENT_DIR = path.join(process.cwd(), "content/blog");

function readPost(filePath: string): BlogPost {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return {
    slug: data.slug,
    title: data.title,
    description: data.description,
    date: data.date,
    readTime: data.readTime,
    category: data.category,
    icon: data.icon,
    tags: data.tags ?? [],
    relatedCalculator:
      data.relatedCalculatorSlug && data.relatedCalculatorCategory
        ? {
            slug: data.relatedCalculatorSlug,
            categorySlug: data.relatedCalculatorCategory,
          }
        : undefined,
    heroImage: data.heroImage,
    heroImageAlt: data.heroImageAlt,
    content: content.trim(),
  };
}

function loadAllPosts(): BlogPost[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();
  return files
    .map((f) => readPost(path.join(CONTENT_DIR, f)))
    .sort((a, b) => (a.date > b.date ? -1 : 1));
}

export const ALL_POSTS: BlogPost[] = loadAllPosts();

export function getPostBySlug(slug: string): BlogPost | undefined {
  return ALL_POSTS.find((p) => p.slug === slug);
}

export function getAllTags(): string[] {
  const set = new Set<string>();
  for (const post of ALL_POSTS) {
    for (const tag of post.tags) set.add(tag);
  }
  return Array.from(set).sort();
}

export function getPostsByTag(tag: string): BlogPost[] {
  return ALL_POSTS.filter((p) => p.tags.includes(tag));
}

export function tagToSlug(tag: string): string {
  return encodeURIComponent(tag.toLowerCase().replace(/\s+/g, "-"));
}

export function slugToTag(slug: string): string {
  try {
    return decodeURIComponent(decodeURIComponent(slug)).replace(/-/g, " ");
  } catch {
    return slug.replace(/-/g, " ");
  }
}
