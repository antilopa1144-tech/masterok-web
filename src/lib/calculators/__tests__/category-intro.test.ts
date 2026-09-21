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

  it("выводит плитный фундамент в быстрый выбор и не ограничивает проектную проверку многоэтажными домами", () => {
    const foundation = CATEGORY_INTRO.foundation;

    expect(foundation.quickLinks).toContainEqual({
      label: "Рассчитать материалы плитного фундамента",
      href: "/kalkulyatory/fundament/plitnyj-fundament/",
    });
    expect(foundation.lead).toContain("определяют по проекту");
    expect(foundation.pitfalls?.join(" ")).toContain("для каждого здания");
    expect(foundation.pitfalls?.join(" ")).not.toMatch(/многоэтаж/i);
  });
});
