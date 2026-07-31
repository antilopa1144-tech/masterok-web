import { describe, expect, it } from "vitest";
import { ALL_CALCULATORS_META } from "../meta.generated";
import { CATEGORY_INTRO } from "../category-intro";

describe("Быстрые ссылки категорий", () => {
  it("ведут только на существующие калькуляторы", () => {
    const calculatorUrls = new Set(
      ALL_CALCULATORS_META.map(
        (calculator) =>
          `/kalkulyatory/${calculator.categorySlug}/${calculator.slug}/`,
      ),
    );

    for (const [categoryId, intro] of Object.entries(CATEGORY_INTRO)) {
      for (const link of intro.quickLinks ?? []) {
        expect(link.label.trim(), `пустой текст ссылки у ${categoryId}`).not.toBe("");
        expect(
          calculatorUrls.has(link.href),
          `быстрая ссылка ${link.href} у ${categoryId} не ведёт на калькулятор`,
        ).toBe(true);
      }
    }
  });
});
