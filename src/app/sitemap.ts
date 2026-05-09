import type { MetadataRoute } from "next";
import { ALL_CALCULATORS_META as ALL_CALCULATORS } from "@/lib/calculators/meta.generated";
import { CATEGORIES } from "@/lib/calculators/categories";
import { ALL_CHECKLISTS } from "@/lib/checklists";
import { getAllPosts, getAllTags, tagToSlug } from "@/lib/blog";
import { ALL_TOOLS } from "@/lib/tools";
import { SITE_URL } from "@/lib/site";

const BASE_URL = SITE_URL;

export const dynamic = "force-static";

/**
 * Sitemap для всех типов контента.
 *
 * ВАЖНО для crawl budget Googlebot/Yandexbot:
 * lastModified должен быть **стабильным** между деплоями. Если мы ставим
 * `new Date()` (build timestamp), бот видит «обновились ВСЕ 200+ URL» и
 * переиндексирует с нуля, расходуя crawl budget впустую. Реально мы могли
 * поправить опечатку или добавить один калькулятор, остальные не менялись.
 *
 * Стратегия:
 * - Группы страниц получают свою фиксированную дату последнего значимого
 *   обновления (`*_LAST_MODIFIED` ниже). Менять руками когда меняется
 *   соответствующий контент.
 * - Блог-посты используют `post.date` из Ghost — там есть реальное обновление.
 * - Если калькулятор был добавлен/изменён, обновляем CALCULATORS_LAST_MODIFIED.
 *
 * Приоритеты:
 *  1.0 — главная
 *  0.9 — реестр калькуляторов, топ-калькуляторы (popularity ≥ 75)
 *  0.8 — категории, популярные калькуляторы, ключевые статичные страницы
 *  0.7 — обычные калькуляторы, посты блога, инструменты
 *  0.6 — чек-листы, утилиты
 *  0.3-0.5 — низкоприоритетные служебные
 */

// ── Стабильные даты последних обновлений по группам страниц ──────────────────
// Менять руками при значимых изменениях.

/** Структура главной/основных навигационных страниц. Меняется редко. */
const STATIC_PAGES_LAST_MODIFIED = "2026-05-09";

/** Реестр калькуляторов (добавление/удаление калькуляторов, формулы). */
const CALCULATORS_LAST_MODIFIED = "2026-04-28";

/** Категории калькуляторов (структура категорий). */
const CATEGORIES_LAST_MODIFIED = "2026-04-19";

/** Инструменты (страницы /instrumenty/*). */
const TOOLS_LAST_MODIFIED = "2026-04-19";

/** Чек-листы. */
const CHECKLISTS_LAST_MODIFIED = "2026-04-19";

/** Юридические/служебные страницы. Меняются ещё реже. */
const LEGAL_LAST_MODIFIED = "2026-01-01";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allPosts = await getAllPosts();
  const allTags = await getAllTags();

  // Дата последнего поста — для агрегационных страниц блога (/blog/, /blog/tag/*)
  const latestPostDate = allPosts.length > 0
    ? allPosts.reduce((latest, p) => (p.date > latest ? p.date : latest), allPosts[0].date)
    : STATIC_PAGES_LAST_MODIFIED;

  // ── 1. Static pages ────────────────────────────────────────────────────────

  const staticPages: MetadataRoute.Sitemap = [
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

  // ── 2. Calculator category pages ───────────────────────────────────────────

  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `${BASE_URL}/kalkulyatory/${cat.slug}/`,
    lastModified: CATEGORIES_LAST_MODIFIED,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // ── 3. Individual calculator pages ─────────────────────────────────────────

  const calculatorPages: MetadataRoute.Sitemap = ALL_CALCULATORS.map((calc) => ({
    url: `${BASE_URL}/kalkulyatory/${calc.categorySlug}/${calc.slug}/`,
    lastModified: CALCULATORS_LAST_MODIFIED,
    changeFrequency: "weekly" as const,
    priority: calc.popularity >= 75 ? 0.9 : 0.7,
  }));

  // ── 4. Tools pages ─────────────────────────────────────────────────────────

  const toolPages: MetadataRoute.Sitemap = ALL_TOOLS
    .filter((tool) => tool.slug)
    .map((tool) => ({
      url: `${BASE_URL}/instrumenty/${tool.slug}/`,
      lastModified: TOOLS_LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: tool.priority,
    }));

  // ── 5. Individual checklist pages ──────────────────────────────────────────

  const checklistPages: MetadataRoute.Sitemap = ALL_CHECKLISTS.map((cl) => ({
    url: `${BASE_URL}/instrumenty/chek-listy/${cl.slug}/`,
    lastModified: CHECKLISTS_LAST_MODIFIED,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // ── 6. Blog post pages ─────────────────────────────────────────────────────
  //    lastModified от post.updatedAt (фактическая дата редактирования в Ghost),
  //    fallback на post.date (дата публикации) если updatedAt не пришёл.
  //    images добавляются как Image-extension к sitemap для попадания
  //    обложек статей в Google Image Search.

  const blogPages: MetadataRoute.Sitemap = allPosts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}/`,
    lastModified: post.updatedAt ?? post.date,
    changeFrequency: "monthly" as const,
    priority: 0.7,
    ...(post.heroImage ? { images: [post.heroImage] } : {}),
  }));

  // ── 7. Blog tag pages ───────────────────────────────────────────────────────

  const tagPages: MetadataRoute.Sitemap = allTags.map((tag) => ({
    url: `${BASE_URL}/blog/tag/${tagToSlug(tag)}/`,
    lastModified: latestPostDate,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [
    ...staticPages,
    ...categoryPages,
    ...calculatorPages,
    ...toolPages,
    ...checklistPages,
    ...blogPages,
    ...tagPages,
  ];
}
