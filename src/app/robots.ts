import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const BASE_URL = SITE_URL;

// Required for output: "export"
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      // Яндекс — явные правила для основных краулеров (поиск, мобильный, картинки).
      // Yandex Нейро и Алиса используют тот же индекс Яндекс Поиска.
      {
        userAgent: "Yandex",
        allow: "/",
        disallow: ["/api/", "/_next/"],
        crawlDelay: 0.5,
      },
      {
        userAgent: "YandexBot",
        allow: "/",
        disallow: ["/api/", "/_next/"],
        crawlDelay: 0.5,
      },
      {
        userAgent: "YandexMobileBot",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "YandexImages",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      // Явные правила для основных AI-краулеров — видимость в ChatGPT, Claude,
      // Perplexity, Gemini. Разрешаем всё кроме API — см. также llms.txt.
      { userAgent: "GPTBot", allow: "/", disallow: ["/api/"] },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: ["/api/"] },
      { userAgent: "ClaudeBot", allow: "/", disallow: ["/api/"] },
      { userAgent: "anthropic-ai", allow: "/", disallow: ["/api/"] },
      { userAgent: "PerplexityBot", allow: "/", disallow: ["/api/"] },
      { userAgent: "Google-Extended", allow: "/", disallow: ["/api/"] },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}

