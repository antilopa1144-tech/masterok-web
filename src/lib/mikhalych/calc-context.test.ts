import { describe, expect, it } from "vitest";
import { buildMikhalychCalcContext, hashMikhalychCalcContext } from "./calc-context";
import type { CalculatorField } from "@/lib/calculators/types";

const fields: CalculatorField[] = [
  { key: "area", label: "Площадь", type: "number", unit: "м²", defaultValue: 20 },
];

describe("buildMikhalychCalcContext", () => {
  it("включает все материалы, не только первые четыре", () => {
    const materials = Array.from({ length: 8 }, (_, i) => ({
      name: `Материал ${i + 1}`,
      quantity: i + 1,
      unit: "шт",
      category: i % 2 === 0 ? "Крепёж" : "Основное",
    }));

    const ctx = buildMikhalychCalcContext({
      calculatorTitle: "Тест",
      calculatorSlug: "test",
      fields,
      values: { area: 20 },
      result: { materials, totals: { area: 20 }, warnings: ["Мало запаса"] },
    });

    for (const m of materials) {
      expect(ctx).toContain(m.name);
    }
    expect(ctx).toContain("8 позиций");
    expect(ctx).toContain("Мало запаса");
  });
});

describe("hashMikhalychCalcContext", () => {
  it("стабилен для одного контекста", () => {
    const a = hashMikhalychCalcContext("same");
    const b = hashMikhalychCalcContext("same");
    expect(a).toBe(b);
  });
});
