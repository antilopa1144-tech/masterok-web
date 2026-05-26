import { SITE_LAST_REVIEWED, SITE_URL } from "@/lib/site";

/**
 * Части карты сайта. Порядок = id в URL `/sitemap/{id}.xml`.
 *
 * Next.js 15 с `generateSitemaps()` создаёт только подсайтмапы.
 * Корневой `/sitemap.xml` (sitemapindex) — через `app/sitemap.xml/route.ts`.
 * См. https://github.com/vercel/next.js/discussions/61257
 */
export const SITEMAP_CHUNKS = [
  "static",
  "categories",
  "calculators",
  "tools",
  "blog",
] as const;

export type SitemapChunkName = (typeof SITEMAP_CHUNKS)[number];
export type SitemapChunkId = number;

/**
 * Next.js передаёт `id` из URL `/sitemap/{id}.xml` как строку (`"0"`, не `0`).
 * `switch (id) { case 0: }` при строке всегда уходит в default → пустой sitemap.
 */
export function parseSitemapChunkId(
  id: SitemapChunkId | string | undefined,
): SitemapChunkId | null {
  if (id === undefined || id === null || id === "") return null;

  const n =
    typeof id === "number"
      ? id
      : Number.parseInt(String(id).replace(/\.xml$/i, ""), 10);

  if (!Number.isInteger(n) || n < 0 || n >= SITEMAP_CHUNKS.length) return null;
  return n;
}

/** Для `generateSitemaps()` в `app/sitemap.ts`. */
export function generateSitemapIds(): Array<{ id: SitemapChunkId }> {
  return SITEMAP_CHUNKS.map((_, id) => ({ id }));
}

export function getSitemapChunkPath(id: SitemapChunkId): string {
  return `/sitemap/${id}.xml`;
}

export function getSitemapChunkUrl(
  id: SitemapChunkId,
  siteUrl: string = SITE_URL,
): string {
  return `${siteUrl}${getSitemapChunkPath(id)}`;
}

/**
 * XML sitemap-index для `/sitemap.xml` (robots.txt, GSC, Яндекс.Вебмастер).
 */
export function buildSitemapIndexXml(options?: {
  siteUrl?: string;
  lastmod?: string;
}): string {
  const siteUrl = options?.siteUrl ?? SITE_URL;
  const lastmod = options?.lastmod ?? SITE_LAST_REVIEWED;

  const entries = SITEMAP_CHUNKS.map((_, id) => {
    return `  <sitemap>
    <loc>${getSitemapChunkUrl(id, siteUrl)}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
}

export const SITEMAP_INDEX_RESPONSE_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
} as const;
