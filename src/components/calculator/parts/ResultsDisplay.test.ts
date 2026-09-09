import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { CalculatorResult, CalculatorScenario } from "@/lib/calculators/types";
import { ScenarioBlock } from "./ResultsDisplay";

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
