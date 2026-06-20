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

describe("buildMikhalychCalcContext — режимы ввода", () => {
  const twoModeFields: CalculatorField[] = [
    {
      key: "inputMode",
      label: "Как задать объём",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Знаю объём" },
        { value: 1, label: "По площади и толщине" },
      ],
    },
    { key: "concreteVolume", label: "Объём бетона", type: "slider", unit: "м³", defaultValue: 5, group: "bySize" },
    { key: "area", label: "Площадь заливки", type: "slider", unit: "м²", defaultValue: 20, group: "byArea" },
    { key: "thickness", label: "Толщина слоя", type: "slider", unit: "мм", defaultValue: 200, group: "byArea" },
  ];

  const result = { materials: [{ name: "Бетон", quantity: 5, unit: "м³" }], totals: {}, warnings: [] };

  it("в режиме «Знаю объём» показывает только объём, скрывает поля площади/толщины", () => {
    const ctx = buildMikhalychCalcContext({
      calculatorTitle: "Бетон",
      calculatorSlug: "beton",
      fields: twoModeFields,
      values: { inputMode: 0, concreteVolume: 5, area: 20, thickness: 200 },
      result,
    });
    expect(ctx).toContain("Объём бетона");
    expect(ctx).not.toContain("Площадь заливки");
    expect(ctx).not.toContain("Толщина слоя");
    expect(ctx).toContain("«Знаю объём»");
    expect(ctx).toContain("НЕ выбирал");
  });

  it("в режиме «По площади» показывает площадь/толщину, скрывает объём", () => {
    const ctx = buildMikhalychCalcContext({
      calculatorTitle: "Бетон",
      calculatorSlug: "beton",
      fields: twoModeFields,
      values: { inputMode: 1, concreteVolume: 5, area: 20, thickness: 200 },
      result,
    });
    expect(ctx).toContain("Площадь заливки");
    expect(ctx).toContain("Толщина слоя");
    expect(ctx).not.toContain("Объём бетона");
    expect(ctx).toContain("«По площади и толщине»");
  });
});

describe("hashMikhalychCalcContext", () => {
  it("стабилен для одного контекста", () => {
    const a = hashMikhalychCalcContext("same");
    const b = hashMikhalychCalcContext("same");
    expect(a).toBe(b);
  });
});
