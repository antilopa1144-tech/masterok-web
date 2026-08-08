import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { SITE_URL } from "@/lib/site";

describe("robots.txt", () => {
  it("не блокирует ресурсы Next.js, необходимые поисковому рендереру", () => {
    const config = robots();
    const rules = Array.isArray(config.rules) ? config.rules : [config.rules];

    for (const rule of rules) {
      const disallow = Array.isArray(rule.disallow)
        ? rule.disallow
        : rule.disallow
          ? [rule.disallow]
          : [];

      expect(disallow).not.toContain("/_next/");
      expect(disallow).toContain("/api/");
    }
  });

  it("публикует основной sitemap", () => {
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});
