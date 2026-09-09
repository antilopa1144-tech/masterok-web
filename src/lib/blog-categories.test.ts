import { describe, expect, it } from "vitest";
import { blogCategoryLabel, getBlogCategories } from "./blog-categories";

describe("blog category presentation", () => {
  it("merges only known aliases and formatting differences", () => {
    expect(blogCategoryLabel("  инженерия ")).toBe("Инженерные системы");
    expect(blogCategoryLabel("ИНЖЕНЕРНЫЕ   СИСТЕМЫ")).toBe("Инженерные системы");
    expect(blogCategoryLabel("полы и стены")).toBe("Полы и стены");
    expect(blogCategoryLabel("тротуарная плитка")).not.toBe(blogCategoryLabel("плитка"));
  });
  it("counts every post without changing its category or slug", () => {
    const posts = [{ slug: "one", category: "Инженерия" }, { slug: "two", category: "инженерные системы" }, { slug: "three", category: "Плитка" }];
    expect(getBlogCategories(posts)).toEqual([{ label: "Инженерные системы", count: 2 }, { label: "Плитка", count: 1 }]);
    expect(posts[0]).toEqual({ slug: "one", category: "Инженерия" });
  });
  it("handles an empty catalogue and a missing category", () => {
    expect(getBlogCategories([])).toEqual([]);
    expect(blogCategoryLabel("  ")).toBe("Без категории");
  });
});
