import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const BASE_URL = SITE_URL;

export const dynamic = "force-static";

/**
 * robots.txt для краулеров.
 *
 * Что НЕ ставим (актуально на 2026):
 *  - `Crawl-delay` — Yandex её игнорирует с 22 февраля 2018 (используется
 *    настройка скорости в Yandex Webmaster Console). Googlebot никогда не
 *    поддерживал эту директиву. Bing уважает, но мы не указываем целенаправленно.
 *  - `Host:` — Yandex отменил её в 2018 году, теперь полагается на 301-редиректы
 *    и canonical. Googlebot никогда не поддерживал. Чистая помеха в robots.txt
 *    (генерирует warnings в GSC).
 *
 * Что включаем:
 *  - Явные правила для Yandex/YandexBot/YandexMobileBot/YandexImages —
 *    нужны для тонкой настройки сканирования по типам ботов Yandex.
 *  - Правила для AI-краулеров (GPTBot, OAI-SearchBot, ClaudeBot, anthropic-ai,
 *    PerplexityBot, Google-Extended) — для попадания в ChatGPT/Claude/Perplexity/
 *    Gemini. Дополнительно есть llms.txt с инструкцией для AI.
 *  - Sitemap — главный сигнал для Googlebot, замещает deprecated ping endpoint.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      // Yandex — явные правила для основных краулеров (поиск, мобильный, картинки).
      // Yandex Нейро и Алиса используют тот же индекс Yandex Поиска.
      {
        userAgent: "Yandex",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "YandexBot",
        allow: "/",
        disallow: ["/api/", "/_next/"],
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
  };
}
