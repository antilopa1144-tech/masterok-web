import { describe, expect, it } from "vitest";
import { CATEGORY_FAQ } from "../category-faq";

describe("FAQ категорий про полы и инженерные системы", () => {
  it("не выдаёт универсальные толщины стяжки и проценты подрезки за готовое решение", () => {
    const answers = CATEGORY_FAQ.flooring.map((item) => item.answer).join(" ");

    expect(answers).toContain("проект");
    expect(answers).toMatch(/фактическ\S* раскладк/i);
    expect(answers).not.toMatch(/не менее 45 мм|максимальная без армирования|15-20%/i);
  });

  it("не подменяет инженерный расчёт типовыми ваттами, сечениями и обещанием экономии", () => {
    const answers = CATEGORY_FAQ.engineering.map((item) => item.answer).join(" ");

    expect(answers).toMatch(/расч\S* теплопотерь/i);
    expect(answers).toContain("установленная мощность");
    expect(answers).not.toMatch(/100 Вт|150-200 Вт|1,5 кв\.мм|экономия до 70%/i);
    expect(answers).not.toContain("требуемая мощность, число терморегуляторов");
  });
});
