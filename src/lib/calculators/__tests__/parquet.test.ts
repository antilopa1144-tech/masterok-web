import { describe, expect, it } from "vitest";
import parquetFixture from "../../../../tests/fixtures/parquet-canonical-parity.json";
import { parquetDef } from "../formulas/parquet";
import { runCanonicalParitySuite } from "./canonical-parity";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(parquetDef.calculate.bind(parquetDef));

describe("Калькулятор паркетной доски", () => {
  it("декларирует formulaVersion для canonical parquet", () => {
    expect(parquetDef.formulaVersion).toBe("parquet-canonical-v1");
  });

  it("добавляет предупреждение для ёлочки", () => {
    const result = calc({ roomLength: 5, roomWidth: 4, layingMethod: 2, packArea: 1.892 });
    expect(result.warnings.some((warning) => warning.includes("ёлочкой"))).toBe(true);
  });
});

runCanonicalParitySuite({
  suiteName: "Canonical parquet fixture parity",
  cases: parquetFixture.cases as any,
  calculate: calc,
  assertCase(result, expected: {
    formulaVersion: string; area: number; perimeter: number; wastePercent: number; warningsCount: number;
    materials: { packs: number; underlaymentRolls?: number; plinthPieces?: number; glueBuckets?: number; thresholds: number };
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

    expect(findMaterial(result, "Паркетная")?.purchaseQty).toBe(expected.materials.packs);
    if (expected.materials.underlaymentRolls !== undefined) {
      expect(findMaterial(result, "Подложка")?.purchaseQty).toBe(expected.materials.underlaymentRolls);
    }
    if (expected.materials.plinthPieces !== undefined) {
      expect(findMaterial(result, "Плинтус")?.purchaseQty).toBe(expected.materials.plinthPieces);
    }
    if (expected.materials.glueBuckets !== undefined) {
      expect(findMaterial(result, "Клей")?.purchaseQty).toBe(expected.materials.glueBuckets);
    }
    expect(findMaterial(result, "Порожек")?.purchaseQty).toBe(expected.materials.thresholds);

    checkInvariants(result);
  },
});
