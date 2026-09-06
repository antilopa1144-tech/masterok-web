import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve("src/app/blog/[slug]/page.tsx"), "utf8");

describe("BlogPosting image metadata contract", () => {
  it("does not invent dimensions for a Ghost hero while preserving known publisher logo dimensions", () => {
    const articleImage = source.match(/image: post\.heroImage \? \{([\s\S]*?)\} : undefined,/);

    expect(articleImage?.[1]).toContain('url: post.heroImage');
    expect(articleImage?.[1]).not.toMatch(/\b(width|height):/);
    expect(source).toMatch(/logo: \{[\s\S]*?url: SITE_OG_IMAGE_URL,[\s\S]*?width: 1200,[\s\S]*?height: 630,/);
  });
});
