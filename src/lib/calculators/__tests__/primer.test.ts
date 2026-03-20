import { describe, expect, it } from "vitest";
import { primerDef } from "../formulas/primer";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";
import parityFixture from "../../../../tests/fixtures/primer-canonical-parity.json";

const calc = withBasicAccuracy(primerDef.calculate.bind(primerDef));

describe("Грунтовка", () => {
  it("декларирует formulaVersion для canonical primer", () => {
    expect(primerDef.formulaVersion).toBe("primer-canonical-v1");
  });

  it("считает глубокое проникновение по впитывающей поверхности", () => {
    const result = calc({ area: 50, surfaceType: 0, primerType: 0, coats: 1, canSize: 5 });
    checkInvariants(result);

    expect(result.formulaVersion).toBe("primer-canonical-v1");
    expect(result.totals.lPerSqm).toBeCloseTo(0.15, 3);
    expect(findMaterial(result, "Грунтовка")?.purchaseQty).toBe(10);
    expect(result.warnings.some((warning) => warning.includes("2 слоя"))).toBe(true);
  });

  it("считает бетон-контакт с упаковкой по 10 л", () => {
    const result = calc({ area: 50, surfaceType: 0, primerType: 1, coats: 1, canSize: 10 });

    expect(result.totals.lPerSqm).toBeCloseTo(0.525, 3);
    expect(findMaterial(result, "контакт")?.purchaseQty).toBe(30);
    expect(result.warnings).toHaveLength(3);
  });

  it("поддерживает room-dimensions вход в canonical engine", () => {
    const result = calc({ inputMode: 0, roomWidth: 4, roomLength: 5, roomHeight: 2.7, surfaceType: 1, primerType: 2, coats: 2, canSize: 15 });

    expect(result.totals.area).toBeCloseTo(48.6, 2);
    expect(findMaterial(result, "ГКЛ")?.purchaseQty).toBe(15);
  });
});

describe("Canonical primer fixture parity", () => {
  const cases = parityFixture.cases as unknown as Array<{
    id: string;
    inputs: Record<string, number>;
    expected: {
      area: number;
      formulaVersion: string;
      materials: {
        primerCans: number;
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
      expect(findMaterial(result, "Валик")?.purchaseQty).toBe(fixtureCase.expected.materials.rollers);
      expect(findMaterial(result, "Кисть")?.purchaseQty).toBe(fixtureCase.expected.materials.brushes);
      expect(findMaterial(result, "Кювета")?.purchaseQty).toBe(fixtureCase.expected.materials.trays);
      const _pm = result.materials.find((m) => m.category === 'Основное'); expect(_pm).toBeTruthy(); expect(_pm!.purchaseQty).toBeGreaterThan(0);
    });
  }
});

