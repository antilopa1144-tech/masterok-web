import { describe, expect, it } from "vitest";
import { paintDef } from "../formulas/paint";
import { checkInvariants, findMaterial } from "./_helpers";
import parityFixture from "../../../../tests/fixtures/paint-canonical-parity.json";

const calc = paintDef.calculate.bind(paintDef);

describe("Калькулятор краски", () => {
  it("декларирует formulaVersion для canonical paint", () => {
    expect(paintDef.formulaVersion).toBe("paint-canonical-v1");
  });

  it("переводит legacy web inputs в canonical engine", () => {
    const result = calc({ area: 40, coats: 2, surfaceType: 0, consumption: 10 });
    checkInvariants(result);

    expect(result.formulaVersion).toBe("paint-canonical-v1");
    expect(result.totals.area).toBeCloseTo(40, 2);
    expect(result.totals.lPerSqm).toBeCloseTo(0.2, 3);
    expect(result.scenarios?.REC.buy_plan.package_size).toBe(3);
    expect(result.materials.find((material) => material.category === "Основное")?.purchaseQty).toBe(3);
  });

  it("учитывает подготовку основания и насыщенность цвета", () => {
    const base = calc({ area: 40, coats: 2, surfaceType: 0, consumption: 10 });
    const adjusted = calc({ area: 40, coats: 2, surfaceType: 0, consumption: 10, surfacePrep: 1, colorIntensity: 2 });

    expect(adjusted.scenarios?.REC.exact_need ?? 0).toBeGreaterThan(base.scenarios?.REC.exact_need ?? 0);
    expect(adjusted.warnings).toHaveLength(0);
  });

  it("считает split wall/ceiling путь без потери ceiling premium", () => {
    const result = calc({
      wallArea: 50,
      ceilingArea: 20,
      doorsWindows: 10,
      coats: 2,
      coverage: 10,
      surfacePrep: 1,
      colorIntensity: 2,
    });

    expect(result.totals.wallArea).toBeCloseTo(40, 2);
    expect(result.totals.ceilingArea).toBeCloseTo(20, 2);
    expect(result.totals.area).toBeCloseTo(60, 2);
    expect(result.totals.ceilingBaseExactNeedL).toBeGreaterThan(result.totals.wallBaseExactNeedL / 3);
    expect(result.scenarios?.REC.exact_need ?? 0).toBeGreaterThan(result.totals.baseExactNeedL ?? 0);
  });

  it("поддерживает canonical facade room-dimensions путь", () => {
    const result = calc({
      inputMode: 0,
      roomWidth: 4,
      roomLength: 5,
      roomHeight: 2.7,
      openingsArea: 4,
      paintType: 1,
      surfaceType: 8,
      surfacePrep: 1,
      colorIntensity: 2,
      coats: 2,
      coverage: 7,
      canSize: 10,
    });

    expect(result.totals.area).toBeCloseTo(44.6, 2);
    expect(result.totals.ceilingArea).toBeCloseTo(0, 2);
    expect(result.scenarios?.REC.exact_need ?? 0).toBeCloseTo(30.391131, 2);
    expect(result.scenarios?.REC.buy_plan.package_size).toBe(10);
    expect(findMaterial(result, "Малярная лента")?.purchaseQty).toBe(1);
    expect(result.warnings).toHaveLength(2);
  });
});

describe("Canonical paint fixture parity", () => {
  const cases = parityFixture.cases as unknown as Array<{
    id: string;
    inputs: Record<string, number>;
    expected: {
      area: number;
      formulaVersion: string;
      materials: {
        paintCans: number;
        primerCans: number;
        tapeRolls: number;
        rollers: number;
        brushes: number;
        trays: number;
      };
      warningsCount: number;
      recScenario: {
        packageSize: number;
        exactNeed: number;
        purchaseQuantity: number;
      };
    };
  }>;

  for (const fixtureCase of cases) {
    it(fixtureCase.id, () => {
      const result = calc(fixtureCase.inputs);
      expect(result.formulaVersion).toBe(fixtureCase.expected.formulaVersion);
      expect(result.totals.area).toBeCloseTo(fixtureCase.expected.area, 2);
      expect(result.warnings).toHaveLength(fixtureCase.expected.warningsCount);
      expect(result.scenarios?.REC.buy_plan.package_size).toBe(fixtureCase.expected.recScenario.packageSize);
      expect(result.scenarios?.REC.exact_need ?? 0).toBeCloseTo(fixtureCase.expected.recScenario.exactNeed, 2);
      expect(result.scenarios?.REC.purchase_quantity ?? 0).toBeCloseTo(fixtureCase.expected.recScenario.purchaseQuantity, 3);
      expect(result.materials.find((material) => material.category === "Основное")?.purchaseQty).toBe(fixtureCase.expected.materials.paintCans);
      expect(findMaterial(result, "Грунтовка")?.purchaseQty).toBe(fixtureCase.expected.materials.primerCans);
      expect(findMaterial(result, "Малярная лента")?.purchaseQty).toBe(fixtureCase.expected.materials.tapeRolls);
      expect(findMaterial(result, "Валик")?.purchaseQty).toBe(fixtureCase.expected.materials.rollers);
      expect(findMaterial(result, "Кисть")?.purchaseQty).toBe(fixtureCase.expected.materials.brushes);
      expect(findMaterial(result, "Кювета")?.purchaseQty).toBe(fixtureCase.expected.materials.trays);
    });
  }
});




