import { describe, expect, it } from "vitest";
import laminateFixture from "../../../../tests/fixtures/laminate-canonical-parity.json";
import { laminateDef } from "../formulas/laminate";
import { runCanonicalParitySuite } from "./canonical-parity";
import { checkInvariants, findMaterial } from "./_helpers";

const calc = laminateDef.calculate.bind(laminateDef);

describe("Калькулятор ламината", () => {
  it("декларирует formulaVersion для canonical laminate", () => {
    expect(laminateDef.formulaVersion).toBe("laminate-canonical-v1");
  });

  it("добавляет предупреждение для диагональной укладки", () => {
    const result = calc({
      inputMode: 1,
      area: 24,
      packArea: 2,
      layingMethod: 1,
      reservePercent: 5,
      hasUnderlayment: 0,
    });

    expect(result.warnings.some((warning) => warning.includes("Диагональная"))).toBe(true);
  });

  it("добавляет предупреждение для смещения 1/2", () => {
    const result = calc({
      inputMode: 1,
      area: 24,
      packArea: 2,
      layingMethod: 0,
      offsetMode: 2,
      reservePercent: 5,
      hasUnderlayment: 0,
    });

    expect(result.warnings.some((warning) => warning.includes("1/2"))).toBe(true);
  });
});

runCanonicalParitySuite({
  suiteName: "Canonical laminate fixture parity",
  cases: laminateFixture.cases as any,
  calculate: calc,
  assertCase(result, expected: {
    formulaVersion: string; area: number; perimeter: number; wastePercent: number; warningsCount: number;
    materials: { packs: number; underlaymentRolls?: number; plinthPieces: number; thresholds: number };
    recScenario: { packageSize: number; exactNeed: number; purchaseQuantity: number };
  }) {
    expect(result.formulaVersion).toBe(expected.formulaVersion);
    expect(result.totals.area).toBeCloseTo(expected.area, 1);
    expect(result.totals.perimeter).toBeCloseTo(expected.perimeter, 1);
    expect(result.totals.wastePercent).toBeCloseTo(expected.wastePercent, 5);
    expect(result.warnings).toHaveLength(expected.warningsCount);

    const recScenario = result.scenarios!.REC;
    expect(recScenario.buy_plan.package_size).toBe(expected.recScenario.packageSize);
    expect(recScenario.exact_need).toBeCloseTo(expected.recScenario.exactNeed, 5);
    expect(recScenario.purchase_quantity).toBeCloseTo(expected.recScenario.purchaseQuantity, 5);

    expect(findMaterial(result, "Ламинат")?.purchaseQty).toBe(expected.materials.packs);
    if (expected.materials.underlaymentRolls !== undefined) {
      expect(findMaterial(result, "Подложка")?.purchaseQty).toBe(expected.materials.underlaymentRolls);
    }
    expect(findMaterial(result, "Плинтус")?.purchaseQty).toBe(expected.materials.plinthPieces);
    expect(findMaterial(result, "Порожек")?.purchaseQty).toBe(expected.materials.thresholds);

    checkInvariants(result);
  },
});
