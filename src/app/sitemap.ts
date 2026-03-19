import type { MetadataRoute } from "next";
import { ALL_CALCULATORS } from "@/lib/calculators";
import { CATEGORIES } from "@/lib/calculators/categories";
import { ALL_CHECKLISTS } from "@/lib/checklists";
import { ALL_POSTS } from "@/lib/blog";
import { ALL_TOOLS } from "@/lib/tools";
import { SITE_URL } from "@/lib/site";

const BASE_URL = SITE_URL;

// Required for output: "export"
export const dynamic = "force-static";

/**
 * Dynamic sitemap covering ALL content types:
 *  1. Static pages (home, about, app download)
 *  2. Calculator hub + 8 category pages + 61 individual calculators
 *  3. Blog listing + individual blog posts
 *  4. Tools pages + individual checklists
 *
 * Priorities:
 *  1.0  — homepage
 *  0.9  — calculator hub, top calculators (popularity ≥ 75)
 *  0.8  — category pages, popular calculators, core static pages
 *  0.7  — regular calculators, blog posts, tools hub
 *  0.6  — checklists, tool sub-pages
 *  0.5  — low-priority utilities
 *
 * lastModified: build timestamp for static pages, post.date for blog,
 * build timestamp for calculators (formulas update with each deploy).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const buildDate = new Date().toISOString();

  // Derive latest blog date for blog listing page
  const latestPostDate = ALL_POSTS.length > 0
    ? ALL_POSTS.reduce((latest, p) => (p.date > latest ? p.date : latest), ALL_POSTS[0].date)
    : buildDate;

  // ── 1. Static pages ────────────────────────────────────────────────────────

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: buildDate,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/kalkulyatory/`,
      lastModified: buildDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/mikhalych/`,
      lastModified: buildDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/prilozhenie/`,
      lastModified: buildDate,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog/`,
      lastModified: latestPostDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // ── 2. Calculator category pages ───────────────────────────────────────────

  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `${BASE_URL}/kalkulyatory/${cat.slug}/`,
    lastModified: buildDate,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // ── 3. Individual calculator pages ─────────────────────────────────────────
  //    Priority scales with popularity: top calculators get 0.9, rest 0.7

  const calculatorPages: MetadataRoute.Sitemap = ALL_CALCULATORS.map((calc) => ({
    url: `${BASE_URL}/kalkulyatory/${calc.categorySlug}/${calc.slug}/`,
    lastModified: buildDate,
    changeFrequency: "weekly" as const,
    priority: calc.popularity >= 75 ? 0.9 : 0.7,
  }));

  // ── 4. Tools pages (dynamic from registry) ──────────────────────────────────

  const toolPages: MetadataRoute.Sitemap = ALL_TOOLS.map((tool) => ({
    url: `${BASE_URL}/instrumenty/${tool.slug ? tool.slug + "/" : ""}`,
    lastModified: buildDate,
    changeFrequency: "monthly" as const,
    priority: tool.priority,
  }));

  // ── 5. Individual checklist pages ──────────────────────────────────────────

  const checklistPages: MetadataRoute.Sitemap = ALL_CHECKLISTS.map((cl) => ({
    url: `${BASE_URL}/instrumenty/chek-listy/${cl.slug}/`,
    lastModified: buildDate,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // ── 6. Blog post pages ─────────────────────────────────────────────────────
  //    lastModified from post.date, priority 0.7 for SEO content value

  const blogPages: MetadataRoute.Sitemap = ALL_POSTS.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}/`,
    lastModified: post.date,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // ── Merge all sections ─────────────────────────────────────────────────────

  return [
    ...staticPages,
    ...categoryPages,
    ...calculatorPages,
    ...toolPages,
    ...checklistPages,
    ...blogPages,
  ];
}
