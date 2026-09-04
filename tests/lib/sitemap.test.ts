import { describe, expect, it } from "vitest";
import {
  SITEMAP_CHUNKS,
  buildSitemapIndexXml,
  buildSitemapUrlsetXml,
  generateSitemapIds,
  getSitemapChunkUrl,
  parseSitemapChunkId,
} from "@/lib/sitemap/chunks";
import { buildSitemapChunk } from "@/lib/sitemap/build";
import { GET as getSitemapChunk } from "@/app/sitemap/[id]/route";
import { GET as getSitemapIndex } from "@/app/sitemap.xml/route";
import { TOOL_CONFIGS, toolHref } from "@/lib/tools/config";
import { SITE_URL } from "@/lib/site";

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

  it("корневой route отдаёт sitemapindex, а не пустой urlset", async () => {
    const response = await getSitemapIndex();
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/xml");
    expect(xml).toContain("<sitemapindex");
    expect(xml).not.toContain("<urlset");
    expect((xml.match(/<loc>/g) ?? [])).toHaveLength(SITEMAP_CHUNKS.length);
  });

  it("buildSitemapUrlsetXml экранирует URL и сохраняет image sitemap", () => {
    const xml = buildSitemapUrlsetXml([
      {
        url: "https://example.test/page/?a=1&b=2",
        lastModified: "2026-09-04",
        changeFrequency: "monthly",
        priority: 0.7,
        images: ["https://example.test/image.jpg?x=1&y=2"],
      },
    ]);

    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">');
    expect(xml).toContain("https://example.test/page/?a=1&amp;b=2");
    expect(xml).toContain("<lastmod>2026-09-04</lastmod>");
    expect(xml).toContain("<changefreq>monthly</changefreq>");
    expect(xml).toContain("<priority>0.7</priority>");
    expect(xml).toContain("<image:image>");
    expect(xml).toContain("https://example.test/image.jpg?x=1&amp;y=2");
  });

  it("route части сохраняет `/sitemap/{id}.xml` и отклоняет неизвестный id", async () => {
    const valid = await getSitemapChunk(new Request("https://example.test/sitemap/2.xml"), {
      params: Promise.resolve({ id: "2.xml" }),
    });
    const validXml = await valid.text();
    const invalid = await getSitemapChunk(new Request("https://example.test/sitemap/99.xml"), {
      params: Promise.resolve({ id: "99.xml" }),
    });

    expect(valid.status).toBe(200);
    expect(valid.headers.get("content-type")).toContain("application/xml");
    expect(validXml).toContain("<urlset");
    expect(validXml).toContain("/kalkulyatory/fundament/beton/");
    expect(invalid.status).toBe(404);
  });

  it("sitemap инструментов не включает страницы с noindex", async () => {
    const entries = await buildSitemapChunk(3);
    const urls = new Set(entries.map((entry) => entry.url));
    const noindexTools = TOOL_CONFIGS.filter((tool) => tool.noindex);

    expect(noindexTools.length).toBeGreaterThan(0);
    for (const tool of noindexTools) {
      expect(urls).not.toContain(`${SITE_URL}${toolHref(tool.slug)}`);
    }
  });
});
