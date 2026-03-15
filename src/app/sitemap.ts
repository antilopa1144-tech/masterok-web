import type { MetadataRoute } from "next";
import { ALL_CALCULATORS } from "@/lib/calculators";
import { CATEGORIES } from "@/lib/calculators/categories";
import { ALL_CHECKLISTS } from "@/lib/checklists";
import { ALL_POSTS } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

const BASE_URL = SITE_URL;

// Required for output: "export"
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  // Главная и статические страницы
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/mikhalych/`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/prilozhenie/`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/kalkulyatory/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  // Страницы категорий
  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `${BASE_URL}/kalkulyatory/${cat.slug}/`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Страницы калькуляторов
  const calculatorPages: MetadataRoute.Sitemap = ALL_CALCULATORS.map((calc) => ({
    url: `${BASE_URL}/kalkulyatory/${calc.categorySlug}/${calc.slug}/`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  // Страницы инструментов
  const toolPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/instrumenty/`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${BASE_URL}/instrumenty/konverter/`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${BASE_URL}/instrumenty/ploshchad-komnaty/`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${BASE_URL}/instrumenty/kalkulyator/`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE_URL}/instrumenty/chek-listy/`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
  ];

  // Страницы чек-листов
  const checklistPages: MetadataRoute.Sitemap = ALL_CHECKLISTS.map((cl) => ({
    url: `${BASE_URL}/instrumenty/chek-listy/${cl.slug}/`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Страницы блога
  const blogPages: MetadataRoute.Sitemap = ALL_POSTS.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}/`,
    lastModified: post.date,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...toolPages, ...categoryPages, ...calculatorPages, ...checklistPages, ...blogPages];
}

