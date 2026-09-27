import { describe, expect, it } from "vitest";
import { ghostCoverSrcSet } from "./blog-images";

describe("responsive Ghost covers", () => {
  it("uses native Ghost sizes while keeping the original URL unchanged", () => {
    const src = "https://cms.getmasterok.ru/content/images/2026/09/feature.webp";
    expect(ghostCoverSrcSet(src)).toBe([
      "https://cms.getmasterok.ru/content/images/size/w600/2026/09/feature.webp 600w",
      "https://cms.getmasterok.ru/content/images/size/w1000/2026/09/feature.webp 1000w",
      "https://cms.getmasterok.ru/content/images/size/w1200/2026/09/feature.webp 1200w",
    ].join(", "));
    expect(src).toBe("https://cms.getmasterok.ru/content/images/2026/09/feature.webp");
  });

  it.each([
    "/blog-images/local.webp",
    "https://getmasterok.ru/blog-images/local.webp",
    "https://other.test/content/images/2026/09/image.webp",
    "https://cms.getmasterok.ru/content/images/size/w600/2026/09/image.webp",
    "https://cms.getmasterok.ru/content/images/2026/09/animation.gif",
  ])("preserves unsupported sources: %s", (src) => {
    expect(ghostCoverSrcSet(src)).toBeUndefined();
  });
});
