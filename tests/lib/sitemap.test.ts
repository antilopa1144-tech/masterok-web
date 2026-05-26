import { describe, expect, it } from "vitest";
import {
  SITEMAP_CHUNKS,
  buildSitemapIndexXml,
  generateSitemapIds,
  getSitemapChunkUrl,
  parseSitemapChunkId,
} from "@/lib/sitemap/chunks";

describe("sitemap chunks", () => {
  it("parseSitemapChunkId принимает число и строку из Next.js", () => {
    expect(parseSitemapChunkId(0)).toBe(0);
    expect(parseSitemapChunkId("0")).toBe(0);
    expect(parseSitemapChunkId("2")).toBe(2);
    expect(parseSitemapChunkId("4")).toBe(4);
    expect(parseSitemapChunkId(99)).toBeNull();
    expect(parseSitemapChunkId("")).toBeNull();
  });

  it("generateSitemapIds возвращает id для каждого чанка", () => {
    const ids = generateSitemapIds();
    expect(ids).toHaveLength(SITEMAP_CHUNKS.length);
    expect(ids.map((entry) => entry.id)).toEqual([0, 1, 2, 3, 4]);
  });

  it("buildSitemapIndexXml — валидный sitemapindex со ссылками на все части", () => {
    const xml = buildSitemapIndexXml({
      siteUrl: "https://example.test",
      lastmod: "2026-05-25",
    });

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    expect(xml).not.toContain("<urlset");

    for (let id = 0; id < SITEMAP_CHUNKS.length; id++) {
      expect(xml).toContain(getSitemapChunkUrl(id, "https://example.test"));
      expect(xml).toContain("<lastmod>2026-05-25</lastmod>");
    }

    const locCount = (xml.match(/<loc>/g) ?? []).length;
    expect(locCount).toBe(SITEMAP_CHUNKS.length);
  });
});
