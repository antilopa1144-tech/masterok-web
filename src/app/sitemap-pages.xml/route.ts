import { buildSitemapChunk } from "@/lib/sitemap/build";
import {
  SITEMAP_URLSET_RESPONSE_HEADERS,
  buildSitemapUrlsetXml,
  generateSitemapIds,
} from "@/lib/sitemap/chunks";

export const dynamic = "force-static";
export const revalidate = 60;

/**
 * Плоская карта всех публичных URL.
 *
 * Основной `/sitemap.xml` указывает сюда. Краулер получает весь небольшой
 * каталог одним ответом без зависимости от чтения старых `/sitemap/*`.
 */
export async function GET(): Promise<Response> {
  const chunks = await Promise.all(
    generateSitemapIds().map(({ id }) => buildSitemapChunk(id)),
  );
  const entries = chunks.flat();

  return new Response(buildSitemapUrlsetXml(entries), {
    headers: SITEMAP_URLSET_RESPONSE_HEADERS,
  });
}
