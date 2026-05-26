import type { MetadataRoute } from "next";
import { ALL_CALCULATORS_META as ALL_CALCULATORS } from "@/lib/calculators/meta.generated";
import { CATEGORIES } from "@/lib/calculators/categories";
import { ALL_CHECKLISTS } from "@/lib/checklists";
import { getAllPosts, getAllTags, getPostsByTag, tagToSlug } from "@/lib/blog";
import { ALL_TOOLS } from "@/lib/tools";
import { generateSitemapIds, type SitemapChunkId } from "@/lib/sitemap/chunks";
import { BLOG_TAG_MIN_POSTS_FOR_INDEX, SITE_LAST_REVIEWED, SITE_URL } from "@/lib/site";

const BASE_URL = SITE_URL;

export const dynamic = "force-static";

/**
 * Разделённый sitemap для всех типов контента.
 *
 * Next.js 15 + generateSitemaps:
 *  /sitemap.xml         — sitemap-index (app/sitemap.xml/route.ts, Next сам не строит)
 *  /sitemap/0.xml       — статичные/служебные страницы (главная, /blog/, etc.)
 *  /sitemap/1.xml       — категории калькуляторов
 *  /sitemap/2.xml       — индивидуальные калькуляторы
 *  /sitemap/3.xml       — инструменты + чек-листы
 *  /sitemap/4.xml       — посты блога + теги
 *
 * Без route handler на /sitemap.xml при generateSitemaps() корневой URL даёт 404.
 *
 * Зачем разделять (на 2026-05-26 это главная SEO-проблема):
 *
 *  1. **Независимые lastModified.** Google видит, что «обновился sitemap калькуляторов»
 *     и не трогает остальные. До этого был один sitemap.xml на 130 URL — изменение
 *     одного блог-поста заставляло Google переоценивать ВЕСЬ файл.
 *
 *  2. **Crawl budget по группам.** Google назначает квоту обхода на каждый sitemap
 *     отдельно. У нас 72 страницы «Discovered, not indexed» — это значит общий
 *     бюджет закончился. Разделение даёт каждой группе свой бюджет.
 *
 *  3. **Sitemap-index можно отправить в GSC по частям.** При проблемах с
 *     индексацией одной группы — переотправляем только её, не трогая остальные.
 *
 * ВАЖНО для crawl budget Googlebot/Yandexbot:
 * lastModified должен быть **стабильным** между деплоями. Если мы ставим
 * `new Date()` (build timestamp), бот видит «обновились ВСЕ 200+ URL» и
 * переиндексирует с нуля. Менять руками когда контент действительно изменился.
 */

// ── Стабильные даты последних обновлений по группам страниц ──────────────────
// Менять руками при значимых изменениях.

/** Структура главной/основных навигационных страниц. Меняется редко. */
const STATIC_PAGES_LAST_MODIFIED = "2026-05-09";

/** Реестр калькуляторов (добавление/удаление калькуляторов, формулы). */
const CALCULATORS_LAST_MODIFIED = SITE_LAST_REVIEWED;

/** Категории калькуляторов (структура категорий). */
const CATEGORIES_LAST_MODIFIED = SITE_LAST_REVIEWED;

/** Инструменты (страницы /instrumenty/*). */
const TOOLS_LAST_MODIFIED = "2026-04-19";

/** Чек-листы. */
const CHECKLISTS_LAST_MODIFIED = "2026-04-19";

/** Юридические/служебные страницы. Меняются ещё реже. */
const LEGAL_LAST_MODIFIED = "2026-01-01";

/** Методология расчётов (E-E-A-T, GEO). */
const METHODOLOGY_LAST_MODIFIED = SITE_LAST_REVIEWED;

// ── Sitemap chunks (id → /sitemap/{id}.xml) — см. src/lib/sitemap/chunks.ts ─

export async function generateSitemaps(): Promise<Array<{ id: SitemapChunkId }>> {
  return generateSitemapIds();
}

// ── Builders для каждой части ───────────────────────────────────────────────

async function buildStaticSitemap(): Promise<MetadataRoute.Sitemap> {
  const allPosts = await getAllPosts();
  const latestPostDate = allPosts.length > 0
    ? allPosts.reduce((latest, p) => (p.date > latest ? p.date : latest), allPosts[0].date)
    : STATIC_PAGES_LAST_MODIFIED;

  return [
    {
      url: `${BASE_URL}/`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/kalkulyatory/`,
      lastModified: CALCULATORS_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/o-proekte/`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/metodologiya/`,
      lastModified: METHODOLOGY_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/politika-konfidencialnosti/`,
      lastModified: LEGAL_LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/mikhalych/`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/prilozhenie/`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/proekty/`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: `${BASE_URL}/instrumenty/`,
      lastModified: TOOLS_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog/`,
      lastModified: latestPostDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/ai/`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}

function buildCategoriesSitemap(): MetadataRoute.Sitemap {
  return CATEGORIES.map((cat) => ({
    url: `${BASE_URL}/kalkulyatory/${cat.slug}/`,
    lastModified: CATEGORIES_LAST_MODIFIED,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
}

function buildCalculatorsSitemap(): MetadataRoute.Sitemap {
  return ALL_CALCULATORS.map((calc) => ({
    url: `${BASE_URL}/kalkulyatory/${calc.categorySlug}/${calc.slug}/`,
    lastModified: CALCULATORS_LAST_MODIFIED,
    changeFrequency: "weekly" as const,
    priority: calc.popularity >= 75 ? 0.9 : 0.7,
  }));
}

function buildToolsSitemap(): MetadataRoute.Sitemap {
  const toolPages = ALL_TOOLS
    .filter((tool) => tool.slug)
    .map((tool) => ({
      url: `${BASE_URL}/instrumenty/${tool.slug}/`,
      lastModified: TOOLS_LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: tool.priority,
    }));

  const checklistPages: MetadataRoute.Sitemap = ALL_CHECKLISTS.map((cl) => ({
    url: `${BASE_URL}/instrumenty/chek-listy/${cl.slug}/`,
    lastModified: CHECKLISTS_LAST_MODIFIED,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...toolPages, ...checklistPages];
}

async function buildBlogSitemap(): Promise<MetadataRoute.Sitemap> {
  const allPosts = await getAllPosts();
  const allTags = await getAllTags();

  const latestPostDate = allPosts.length > 0
    ? allPosts.reduce((latest, p) => (p.date > latest ? p.date : latest), allPosts[0].date)
    : STATIC_PAGES_LAST_MODIFIED;

  // Посты блога с lastModified из Ghost (updatedAt или date).
  // Image extension добавляется через ...(post.heroImage ? {images: [...]} : {})
  // для попадания обложек в Google Image Search.
  const blogPages: MetadataRoute.Sitemap = allPosts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}/`,
    lastModified: post.updatedAt ?? post.date,
    changeFrequency: "monthly" as const,
    priority: 0.7,
    ...(post.heroImage ? { images: [post.heroImage] } : {}),
  }));

  // Теги блога — только индексируемые (≥ BLOG_TAG_MIN_POSTS_FOR_INDEX статей).
  const tagPages: MetadataRoute.Sitemap = (
    await Promise.all(
      allTags.map(async (tag) => {
        const posts = await getPostsByTag(tag);
        if (posts.length < BLOG_TAG_MIN_POSTS_FOR_INDEX) return null;
        return {
          url: `${BASE_URL}/blog/tag/${tagToSlug(tag)}/`,
          lastModified: latestPostDate,
          changeFrequency: "weekly" as const,
          priority: 0.5,
        };
      }),
    )
  ).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return [...blogPages, ...tagPages];
}

// ── Main sitemap router ─────────────────────────────────────────────────────

export default async function sitemap({
  id,
}: {
  id: SitemapChunkId;
}): Promise<MetadataRoute.Sitemap> {
  switch (id) {
    case 0:
      return buildStaticSitemap();
    case 1:
      return buildCategoriesSitemap();
    case 2:
      return buildCalculatorsSitemap();
    case 3:
      return buildToolsSitemap();
    case 4:
      return buildBlogSitemap();
    default:
      return [];
  }
}
