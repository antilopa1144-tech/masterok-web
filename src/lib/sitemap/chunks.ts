import type { MetadataRoute } from "next";
import { SITE_LAST_REVIEWED, SITE_URL } from "@/lib/site";

/**
 * Части карты сайта. Порядок = id в URL `/sitemap/{id}.xml`.
 *
 * Корневой `/sitemap.xml` отдаёт sitemap-index через явный route handler,
 * а `/sitemap/{id}.xml` — urlset соответствующей группы.
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
 * Принимает числовой id или его точную строковую форму с необязательным `.xml`.
 * Числовой префикс, пробелы и ведущие нули не должны создавать копии карты.
 */
export function parseSitemapChunkId(
  id: SitemapChunkId | string | undefined,
): SitemapChunkId | null {
  if (id === undefined || id === null || id === "") return null;

  const n =
    typeof id === "number"
      ? id
      : Number(id.replace(/\.xml$/, ""));

  if (!Number.isInteger(n) || n < 0 || n >= SITEMAP_CHUNKS.length) return null;
  if (typeof id === "string" && id !== String(n) && id !== `${n}.xml`) return null;
  return n;
}

/** Для `generateStaticParams()` явного route handler частей sitemap. */
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

export const SITEMAP_URLSET_RESPONSE_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
} as const;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatLastModified(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

/** Сериализует MetadataRoute.Sitemap в самостоятельный XML urlset. */
export function buildSitemapUrlsetXml(
  entries: MetadataRoute.Sitemap,
): string {
  const hasImages = entries.some((entry) => (entry.images?.length ?? 0) > 0);
  const imageNamespace = hasImages
    ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
    : "";

  const urls = entries.map((entry) => {
    const lines = ["  <url>", `    <loc>${escapeXml(entry.url)}</loc>`];

    if (entry.lastModified) {
      lines.push(
        `    <lastmod>${escapeXml(formatLastModified(entry.lastModified))}</lastmod>`,
      );
    }
    if (entry.changeFrequency) {
      lines.push(
        `    <changefreq>${escapeXml(entry.changeFrequency)}</changefreq>`,
      );
    }
    if (entry.priority !== undefined) {
      lines.push(`    <priority>${entry.priority}</priority>`);
    }
    for (const image of entry.images ?? []) {
      lines.push(
        "    <image:image>",
        `      <image:loc>${escapeXml(image)}</image:loc>`,
        "    </image:image>",
      );
    }

    lines.push("  </url>");
    return lines.join("\n");
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${imageNamespace}>
${urls}
</urlset>`;
}
