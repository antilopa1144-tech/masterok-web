import { describe, expect, it } from "vitest";
import { calculateProject } from "./core";
import { createScenarioWorkspace } from "./scenarios";
import { purchaseText } from "./purchase-text";

describe("text purchase list", () => {
  it("preserves all final purchase quantities, formats and room names without rounding again", () => {
    const { project } = createScenarioWorkspace("bathroom");
    const result = calculateProject(project);
    result.purchases[0].quantity = 1.23456;
    const text = purchaseText(project, result);
    expect(text).toContain("1,23456 упак.");
    for (const line of result.purchases) {
      expect(text).toContain(line.name);
      expect(text).toContain(line.detail);
    }
    expect(text).toContain(`Помещения: ${project.rooms[0].name}`);
    expect(text).toContain("Цены не заданы");
    expect(text).not.toContain("0 ₽");
  });

  it("labels partial prices and preserves price disagreement notes", () => {
    const { project } = createScenarioWorkspace("bathroom");
    const result = calculateProject(project);
    Object.assign(result.purchases[0], { unitPriceRub: 1000, totalPriceRub: 28000, priceNote: "Взята максимальная цена" });
    result.totalCostRub = 28000;
    const text = purchaseText(project, result);
    expect(text).toContain("Сумма позиций с заданной ценой");
    expect(text).toContain("Позиций без цены: 1. Стоимость проекта неполная.");
    expect(text).toContain("Взята максимальная цена");
  });

  it("warns when enabled mixtures have no consumption rate", () => {
    const { project } = createScenarioWorkspace("bathroom");
    project.rooms[0].tileSupplies = { adhesive: { materialKey: "Клей", consumptionKgM2: 0, reservePercent: 5, packageKg: 25, packagePriceRub: 0 } };
    const text = purchaseText(project, calculateProject(project));
    expect(text).toContain("Смесей без заданного расхода: 1.");
    expect(text).toContain("не полная смета ремонта");
  });
});
