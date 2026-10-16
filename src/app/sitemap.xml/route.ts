import {
  SITEMAP_INDEX_RESPONSE_HEADERS,
  buildSitemapIndexXml,
} from "@/lib/sitemap/chunks";

export const dynamic = "force-static";
export const revalidate = 60;

/**
 * Корневой sitemap-index (`robots.txt` → `/sitemap.xml`).
 *
 * Ссылается на общую `/sitemap-pages.xml`. Старые `/sitemap/0.xml` … `/4.xml`
 * остаются доступны для совместимости, но больше не объявляются в индексе.
 */
export async function GET(): Promise<Response> {
  return new Response(buildSitemapIndexXml(), {
    headers: SITEMAP_INDEX_RESPONSE_HEADERS,
  });
}
