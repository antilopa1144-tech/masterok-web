import { describe, expect, it } from "vitest";
import { getCalculatorMetaBySlug } from "@/lib/calculators/meta.generated";
import { getChecklistBySlug } from "@/lib/checklists";
import {
  buildCalculatorHrefForChecklist,
  buildChecklistHrefForCalculator,
  CHECKLIST_CALCULATOR_LINKS,
  getCalculatorLinkForChecklist,
  getChecklistLinkForCalculator,
} from "./checklist-calculator-links";

describe("связка профильных калькуляторов с чек-листами", () => {
  it("ссылается только на существующие чек-листы и canonical URL калькуляторов", () => {
    for (const link of CHECKLIST_CALCULATOR_LINKS) {
      const checklist = getChecklistBySlug(link.checklistSlug);
      const calculator = getCalculatorMetaBySlug(link.calculatorSlug);

      expect(checklist?.title).toBe(link.checklistTitle);
      expect(calculator?.title).toBe(link.calculatorTitle);
      expect(calculator?.categorySlug).toBe(link.calculatorCategorySlug);
      expect(buildChecklistHrefForCalculator(link.calculatorSlug)).toBe(
        `/instrumenty/chek-listy/${link.checklistSlug}/`,
      );
      expect(buildCalculatorHrefForChecklist(link.checklistSlug)).toBe(
        `/kalkulyatory/${link.calculatorCategorySlug}/${link.calculatorSlug}/`,
      );
    }
  });

  it("сохраняет взаимно-однозначную карту без конкурирующих назначений", () => {
    const checklistSlugs = CHECKLIST_CALCULATOR_LINKS.map((link) => link.checklistSlug);
    const calculatorSlugs = CHECKLIST_CALCULATOR_LINKS.map((link) => link.calculatorSlug);

    expect(new Set(checklistSlugs).size).toBe(checklistSlugs.length);
    expect(new Set(calculatorSlugs).size).toBe(calculatorSlugs.length);
  });

  it("не подменяет общий ремонт одним калькулятором и не строит приблизительные ссылки", () => {
    expect(getCalculatorLinkForChecklist("remont-kvartiry")).toBeNull();
    expect(buildCalculatorHrefForChecklist("remont-kvartiry")).toBeNull();
    expect(getChecklistLinkForCalculator("beton")).toBeNull();
    expect(buildChecklistHrefForCalculator("beton")).toBeNull();
  });

  it("явно ограничивает калькулятор ванной отделочными материалами", () => {
    const link = getChecklistLinkForCalculator("vannaya-komnata");

    expect(link?.checklistSlug).toBe("ustanovka-santehniki");
    expect(link?.calculatorCta).toContain("плитку, клей и гидроизоляцию");
    expect(link?.calculatorCta).not.toMatch(/труб|сантехприбор/i);
  });
});
