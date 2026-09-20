import { describe, expect, it } from "vitest";
import { resolveTagFromSlug, tagToSlug } from "./blog";
import { dedupeBlogTags, isSameBlogTag } from "./blog-tag-slug";

describe("blog tag slugs", () => {
  it("builds stable ASCII slugs for Cyrillic tags", () => {
    expect(tagToSlug("ГКЛ")).toBe("gkl");
    expect(tagToSlug("Тёплый пол")).toBe("teplyy-pol");
    expect(tagToSlug("Воздухообмен")).toBe("vozduhoobmen");
    expect(tagToSlug("Технониколь")).toBe("tehnonikol");
    expect(tagToSlug("Дом 10x10")).toBe("dom-10x10");
  });

  it("resolves generated slugs back to the original tag names", () => {
    const tags = ["ГКЛ", "Тёплый пол", "Воздухообмен", "Технониколь", "Ceresit"];

    expect(resolveTagFromSlug("gkl", tags)).toBe("ГКЛ");
    expect(resolveTagFromSlug("teplyy-pol", tags)).toBe("Тёплый пол");
    expect(resolveTagFromSlug("ceresit", tags)).toBe("Ceresit");
    expect(resolveTagFromSlug("vozdukhoobmen", tags)).toBe("Воздухообмен");
    expect(resolveTagFromSlug("tyoplyy-pol", tags)).toBe("Тёплый пол");
    expect(resolveTagFromSlug("tekhnonikol", tags)).toBe("Технониколь");
  });

  it("merges case variants into one canonical tag collection", () => {
    expect(dedupeBlogTags(["Раскладка", "раскладка", "ГКЛ", "ГКЛ"])).toEqual([
      "ГКЛ",
      "раскладка",
    ]);
    expect(isSameBlogTag("Раскладка", "раскладка")).toBe(true);
  });
});
