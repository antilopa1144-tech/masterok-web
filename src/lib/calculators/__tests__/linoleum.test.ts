import { describe, expect, it } from "vitest";
import linoleumFixture from "../../../../tests/fixtures/linoleum-canonical-parity.json";
import { linoleumDef } from "../formulas/linoleum";
import { runCanonicalParitySuite } from "./canonical-parity";
import { checkInvariants, findMaterial, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(linoleumDef.calculate.bind(linoleumDef));

describe("Калькулятор линолеума", () => {
  it("декларирует formulaVersion для canonical linoleum", () => {
    expect(linoleumDef.formulaVersion).toBe("linoleum-canonical-v1");
  });

  it("добавляет предупреждение при узком рулоне и нескольких полосах", () => {
    const result = calc({ roomLength: 5, roomWidth: 4, rollWidth: 2, hasPattern: 0 });
    expect(result.warnings.some((warning) => warning.includes("полос"))).toBe(true);
  });
});

runCanonicalParitySuite({
  suiteName: "Canonical linoleum fixture parity",
  cases: linoleumFixture.cases as any,
  calculate: calc,
  assertCase(result, expected: {
    formulaVersion: string; area: number; linearMeters: number; wastePercent: number; warningsCount: number;
    materials: { linearMeters: number; primerLiters: number; glueKg?: number; plinthPieces: number; tapeMeters: number; coldWeldingTubes?: number };
    recScenario: { packageSize: number; exactNeed: number; purchaseQuantity: number };
  }) {
    expect(result.formulaVersion).toBe(expected.formulaVersion);
    expect(result.totals.area).toBeCloseTo(expected.area, 1);
    expect(result.totals.linearMeters).toBeCloseTo(expected.linearMeters, 5);
    expect(result.totals.wastePercent).toBeCloseTo(expected.wastePercent, 1);
    expect(result.warnings).toHaveLength(expected.warningsCount);

    const recScenario = result.scenarios!.REC;
    expect(recScenario.buy_plan.package_size).toBe(expected.recScenario.packageSize);
    expect(recScenario.exact_need).toBeCloseTo(expected.recScenario.exactNeed, 5);
    expect(recScenario.purchase_quantity).toBeCloseTo(expected.recScenario.purchaseQuantity, 5);

    expect(findMaterial(result, 'Линолеум')?.purchaseQty).toBe(expected.materials.linearMeters);
    const _lpm = findMaterial(result, 'Грунтовка');
    expect(_lpm).toBeTruthy();
    expect(_lpm!.unit).toBe("л");
    expect(_lpm!.purchaseQty).toBeGreaterThan(0);
    if (expected.materials.glueKg !== undefined) {
      expect(findMaterial(result, 'Клей')?.purchaseQty).toBe(expected.materials.glueKg);
    }
    expect(findMaterial(result, 'Плинтус')?.purchaseQty).toBe(expected.materials.plinthPieces);
    expect(findMaterial(result, 'скотч')?.purchaseQty ?? findMaterial(result, 'Скотч')?.purchaseQty).toBe(expected.materials.tapeMeters);
    if (expected.materials.coldWeldingTubes !== undefined) {
      expect(findMaterial(result, 'Холодная сварка')?.purchaseQty).toBe(expected.materials.coldWeldingTubes);
    }

    checkInvariants(result);
  },
});
