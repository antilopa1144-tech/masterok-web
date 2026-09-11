import { describe, expect, it } from "vitest";
import { getTagCalculatorLinks } from "./blog-tag-links";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";

const post = (slug: string, categorySlug = "poly") => ({
  relatedCalculator: { slug, categorySlug },
});

describe("ссылки на калькуляторы со страницы тега", () => {
  it("ведёт на существующие калькуляторы с их реальными заголовками", () => {
    const links = getTagCalculatorLinks([post("plitka"), post("laminat")]);
    expect(links.map((item) => item.slug)).toEqual(["plitka", "laminat"]);
    for (const link of links) {
      const meta = ALL_CALCULATORS_META.find((item) => item.slug === link.slug);
      expect(meta, `нет калькулятора ${link.slug}`).toBeDefined();
      expect(link.title).toBe(meta!.title);
      expect(link.categorySlug).toBe(meta!.categorySlug);
    }
  });

  it("отбрасывает slug, которого нет в каталоге", () => {
    const links = getTagCalculatorLinks([post("nesushchestvuyushchiy"), post("plitka")]);
    expect(links.map((item) => item.slug)).toEqual(["plitka"]);
  });

  it("не повторяет один калькулятор из разных статей", () => {
    const links = getTagCalculatorLinks([post("plitka"), post("plitka"), post("laminat")]);
    expect(links.map((item) => item.slug)).toEqual(["plitka", "laminat"]);
  });

  it("пропускает статьи без привязанного калькулятора", () => {
    expect(getTagCalculatorLinks([{ relatedCalculator: undefined }, post("kraska")]))
      .toHaveLength(1);
  });

  it("ограничивает список по лимиту", () => {
    const links = getTagCalculatorLinks(
      [post("plitka"), post("laminat"), post("kraska"), post("oboi"), post("styazhka"), post("kirpich")],
      3,
    );
    expect(links).toHaveLength(3);
  });

  it("возвращает пустой список, если привязок нет", () => {
    expect(getTagCalculatorLinks([])).toEqual([]);
  });
});
