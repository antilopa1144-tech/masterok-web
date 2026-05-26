import {
  SITEMAP_INDEX_RESPONSE_HEADERS,
  buildSitemapIndexXml,
} from "@/lib/sitemap/chunks";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * Корневой sitemap-index (`robots.txt` → `/sitemap.xml`).
 *
 * Подсайтмапы `/sitemap/0.xml` … `/4.xml` — `app/sitemap.ts` + `generateSitemaps()`.
 * Next.js 15 не создаёт индекс автоматически при нескольких sitemap-файлах.
 */
export async function GET(): Promise<Response> {
  return new Response(buildSitemapIndexXml(), {
    headers: SITEMAP_INDEX_RESPONSE_HEADERS,
  });
}
