import { describe, expect, it } from "vitest";
import { resolveTagFromSlug, tagToSlug } from "./blog";

describe("blog tag slugs", () => {
  it("builds stable ASCII slugs for Cyrillic tags", () => {
    expect(tagToSlug("ГКЛ")).toBe("gkl");
    expect(tagToSlug("Тёплый пол")).toBe("teplyy-pol");
    expect(tagToSlug("Дом 10x10")).toBe("dom-10x10");
  });

  it("resolves generated slugs back to the original tag names", () => {
    const tags = ["ГКЛ", "Тёплый пол", "Ceresit"];

    expect(resolveTagFromSlug("gkl", tags)).toBe("ГКЛ");
    expect(resolveTagFromSlug("teplyy-pol", tags)).toBe("Тёплый пол");
    expect(resolveTagFromSlug("ceresit", tags)).toBe("Ceresit");
  });
});
