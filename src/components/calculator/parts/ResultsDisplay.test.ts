import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { CalculatorResult, CalculatorScenario } from "@/lib/calculators/types";
import { MaterialList, ScenarioBlock } from "./ResultsDisplay";
import { laminateDef } from "@/lib/calculators/formulas/laminate";
import { formatMaterialQty } from "./shared";

vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());

const scenario: CalculatorScenario = {
  exact_need: 3.3, purchase_quantity: 3.5, leftover: 0.2,
  assumptions: [], key_factors: {},
  buy_plan: { package_label: "Система", package_size: 3.5, packages_count: 1, unit: "м³" },
};
const result: CalculatorResult = {
  canonicalSpecId: "sewage", materials: [], totals: {}, warnings: [],
  scenarios: { MIN: scenario, REC: scenario, MAX: scenario },
};

describe("ScenarioBlock presentation", () => {
  it("preserves a seller's quarter-metre increment", () => {
    expect(formatMaterialQty(17.75, "пог. м")).toBe("17,75");
  });
  it("shows cut underlay in linear metres with coverage and leftover", () => {
    const calculated = laminateDef.calculate({ inputMode: 1, area: 20, underlaySaleMode: 1, underlayWidth: 1.2, underlaySaleStep: 1 });
    const materials = calculated.materials.filter((m) => m.category === "Подложка");
    const text = renderToStaticMarkup(React.createElement(MaterialList, { materials })).replace(/<[^>]*>/g, "");
    expect(text).toContain("18 пог. м");
    expect(text).toContain("21,6 м²");
    expect(text).toContain("0,6 м²");
    expect(text).not.toContain("без запаса");
  });
  it("shows underlay purchase in whole rolls and need in square metres, not fractional rolls", () => {
    const calculated = laminateDef.calculate({ inputMode: 1, area: 20, underlaymentRoll: 5 });
    const materials = calculated.materials.filter((m) => m.name === "Подложка под ламинат");
    expect(materials).toHaveLength(1);
    const html = renderToStaticMarkup(React.createElement(MaterialList, { materials }));
    const text = html.replace(/<[^>]*>/g, "").replace(/<!--.*?-->/g, "");
    expect(text).toContain("Потребность с запасом: 21 м²");
    expect(text).toContain("Всего к покупке: 25 м²");
    expect(text).toContain("Остаток сверх потребности: 4 м²");
    expect(text).toContain("5 рулонов");
    expect(text).not.toMatch(/4[,.]2/);
  });
  it("allows a material to name a lower-bound result without calling it a purchase plan", () => {
    const html = renderToStaticMarkup(React.createElement(MaterialList, {
      materials: [{
        name: "Труба",
        quantity: 210,
        purchaseQty: 240,
        unit: "м",
        purchaseLabel: "Минимум по общему метражу",
        subtitle: "Раскрой цельных контуров проверьте отдельно.",
      }],
    }));
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

    expect(text).toContain("Минимум по общему метражу");
    expect(text).toContain("240 м");
    expect(text).not.toContain("К покупке");
  });
  it("does not present septic capacity as purchasable volume and leftover material", () => {
    expect(renderToStaticMarkup(React.createElement(ScenarioBlock, { result }))).toBe("");
  });
  it("preserves the purchase explanation for material calculators", () => {
    const html = renderToStaticMarkup(React.createElement(ScenarioBlock, { result: { ...result, canonicalSpecId: "concrete" } }));
    expect(html).toContain("Потребность и покупка");
    expect(html).toContain("Остаток");
    expect(html).toContain("Сколько покупать");
  });
});

/**
 * buy_plan.unit описывает упаковку («мешков»), а purchase_quantity — единицы
 * материала (кг). Подписывать 125 кг словом «мешков» нельзя: покупатель увидит
 * 125 мешков вместо пяти.
 */
describe("ScenarioBlock — единица покупки соответствует значению", () => {
  const text = (r: CalculatorResult) =>
    renderToStaticMarkup(React.createElement(ScenarioBlock, { result: r }))
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ");

  const scenarioWith = (
    buyPlan: CalculatorScenario["buy_plan"],
    quantity: number,
  ): CalculatorScenario => ({
    exact_need: quantity,
    purchase_quantity: quantity,
    leftover: 0,
    assumptions: [],
    key_factors: {},
    buy_plan: buyPlan,
  });

  it("показывает килограммы клея, а не мешки", () => {
    const glue = scenarioWith(
      { package_label: "adhesive-bag-25kg", package_size: 25, packages_count: 5, unit: "мешков" },
      125,
    );
    const rendered = text({
      canonicalSpecId: "tile-adhesive",
      materials: [
        {
          name: "Плиточный клей",
          unit: "кг",
          quantity: 116.6,
          purchaseQty: 125,
          packageInfo: { count: 5, size: 25, packageUnit: "мешков" },
        },
      ],
      totals: {},
      warnings: [],
      scenarios: { MIN: glue, REC: glue, MAX: glue },
    });
    expect(rendered).toContain("125 кг");
    expect(rendered).toContain("5 мешков × 25 кг");
    expect(rendered).not.toContain("125 мешков");
  });

  it("показывает метры арматуры, а не прутки", () => {
    const rebar = scenarioWith(
      { package_label: "rod-11.7m", package_size: 11.7, packages_count: 153, unit: "прутков" },
      1790.1,
    );
    const rendered = text({
      canonicalSpecId: "rebar",
      materials: [
        {
          name: "Арматура",
          unit: "пог. м",
          quantity: 1779.36,
          purchaseQty: 1790.1,
          packageInfo: { count: 153, size: 11.7, packageUnit: "прутков" },
        },
      ],
      totals: {},
      warnings: [],
      scenarios: { MIN: rebar, REC: rebar, MAX: rebar },
    });
    expect(rendered).toContain("1 790,1 пог. м");
    expect(rendered).toContain("153 прутка × 11,7 пог. м");
    expect(rendered).not.toContain("1 790,1 прутков");
  });

  it("дробное количество требует родительного единственного", () => {
    const packs = scenarioWith(
      { package_label: "mineral-plate-pack", package_size: 1, packages_count: 8, unit: "упаковок" },
      8,
    );
    const rendered = text({
      canonicalSpecId: "ceiling-insulation",
      materials: [
        {
          name: "Утеплитель",
          unit: "упаковок",
          quantity: 7.42,
          purchaseQty: 8,
          packageInfo: { count: 8, size: 1, packageUnit: "упаковок" },
        },
      ],
      totals: {},
      warnings: [],
      scenarios: {
        MIN: { ...packs, exact_need: 7, purchase_quantity: 7 },
        REC: { ...packs, exact_need: 7.42 },
        MAX: { ...packs, exact_need: 10, purchase_quantity: 10 },
      },
    });
    expect(rendered).toContain("Нужно: 7,42 упаковки");
    expect(rendered).not.toContain("7,42 упаковок");
  });
});
