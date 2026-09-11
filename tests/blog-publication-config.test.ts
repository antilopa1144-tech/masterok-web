import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("publication route contract", () => {
  it.each(["src/app/blog/[slug]/page.tsx", "src/app/blog/tag/[tag]/page.tsx"])("%s accepts paths created after build", (path) => {
    expect(source(path)).toContain("export const dynamicParams = true");
    expect(source(path)).toContain('export const dynamic = "force-dynamic"');
    expect(source(path)).toContain("notFound()");
  });
  it.each(["src/app/blog/page.tsx", "src/app/blog/[slug]/page.tsx", "src/app/blog/tag/[tag]/page.tsx", "src/app/rss.xml/route.ts", "src/app/sitemap/[id]/route.ts", "src/app/sitemap.xml/route.ts", "src/app/page.tsx", "src/app/kalkulyatory/[category]/page.tsx"])("%s has a short fallback refresh interval", (path) => {
    expect(source(path)).toContain("export const revalidate = 60");
  });
  it("allows large image previews for general robots and Googlebot", () => {
    // Директивы живут в buildPageMetadata: там единственное место, где robots
    // задаётся для обычных страниц. В корневом layout их быть не должно —
    // иначе not-found получает второй тег robots рядом со своим noindex.
    expect(source("src/lib/metadata.ts").match(/"max-image-preview": "large"/g)).toHaveLength(2);
    expect(source("src/app/layout.tsx")).not.toContain("robots:");
  });
  it("does not stream a root loading shell before blog existence is resolved", () => {
    expect(existsSync("src/app/loading.tsx")).toBe(false);
    expect(existsSync("src/app/blog/loading.tsx")).toBe(false);
    expect(existsSync("src/app/instrumenty/loading.tsx")).toBe(true);
  });
});
