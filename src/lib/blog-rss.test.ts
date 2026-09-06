import { describe, expect, it } from "vitest";
import { buildBlogRssXml } from "./blog-rss";

describe("blog RSS", () => {
  it("uses CMS timestamps and escapes XML/CDATAs without a clock-dependent build date", () => {
    const xml = buildBlogRssXml({
      siteUrl: "https://example.test?a=1&b=2",
      siteName: "Мастерок & партнёры",
      posts: [
        {
          slug: "staryy",
          title: "Старый < заголовок",
          description: "Описание ]]> без разрыва",
          content: "<p>Контент & разметка</p>",
          date: "2026-08-01",
          publishedAtIso: "2026-08-01T09:10:11.000Z",
          category: "Ремонт & отделка",
          heroImage: "https://cdn.example.test/a.jpg?x=1&y=2",
        },
        {
          slug: "novyy",
          title: "Новая статья",
          description: "Описание",
          content: "<p>Новый материал</p>",
          date: "2026-08-02",
          publishedAtIso: "2026-08-02T08:00:00.000Z",
          updatedAtIso: "2026-08-03T07:06:05.000Z",
          category: "Строительство",
          heroImage: "",
        },
      ],
    });

    expect(xml).toContain("<lastBuildDate>Mon, 03 Aug 2026 07:06:05 GMT</lastBuildDate>");
    expect(xml).toContain("<pubDate>Sat, 01 Aug 2026 09:10:11 GMT</pubDate>");
    expect(xml.indexOf("/blog/novyy/")).toBeLessThan(xml.indexOf("/blog/staryy/"));
    expect(xml).toContain("https://example.test?a=1&amp;b=2/blog/novyy/");
    expect(xml).toContain("<![CDATA[Описание ]]]]><![CDATA[> без разрыва]]>");
    expect(xml).toContain('url="https://cdn.example.test/a.jpg?x=1&amp;y=2"');
    expect(xml).not.toContain("undefined");
  });

  it("omits lastBuildDate for an empty, but valid, feed", () => {
    const xml = buildBlogRssXml({ posts: [], siteUrl: "https://example.test", siteName: "Тест" });

    expect(xml).not.toContain("<lastBuildDate>");
  });
});
