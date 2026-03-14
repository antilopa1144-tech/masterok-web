import { describe, expect, it } from "vitest";
import linoleumFixture from "../../../../tests/fixtures/linoleum-canonical-parity.json";
import { linoleumDef } from "../formulas/linoleum";
import { runCanonicalParitySuite } from "./canonical-parity";
import { checkInvariants, findMaterial } from "./_helpers";

const calc = linoleumDef.calculate.bind(linoleumDef);

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
  cases: linoleumFixture.cases,
  calculate: calc,
  assertCase(result, expected) {
    expect(result.formulaVersion).toBe(expected.formulaVersion);
    expect(result.totals.area).toBeCloseTo(expected.area, 1);
    expect(result.totals.linearMeters).toBeCloseTo(expected.linearMeters, 5);
    expect(result.totals.wastePercent).toBeCloseTo(expected.wastePercent, 1);
    expect(result.warnings).toHaveLength(expected.warningsCount);

    const recScenario = result.scenarios.REC;
    expect(recScenario.buy_plan.package_size).toBe(expected.recScenario.packageSize);
    expect(recScenario.exact_need).toBeCloseTo(expected.recScenario.exactNeed, 5);
    expect(recScenario.purchase_quantity).toBeCloseTo(expected.recScenario.purchaseQuantity, 5);

    expect(findMaterial(result, 'Линолеум')?.purchaseQty).toBe(expected.materials.linearMetersX10);
    expect(findMaterial(result, 'Грунтовка')?.purchaseQty).toBe(expected.materials.primerCans);
    if (expected.materials.glueBuckets !== undefined) {
      expect(findMaterial(result, 'Клей')?.purchaseQty).toBe(expected.materials.glueBuckets);
    }
    expect(findMaterial(result, 'Плинтус')?.purchaseQty).toBe(expected.materials.plinthPieces);
    expect(findMaterial(result, 'скотч')?.purchaseQty ?? findMaterial(result, 'Скотч')?.purchaseQty).toBe(expected.materials.tapeMeters);
    if (expected.materials.coldWeldingTubes !== undefined) {
      expect(findMaterial(result, 'Холодная сварка')?.purchaseQty).toBe(expected.materials.coldWeldingTubes);
    }

    checkInvariants(result);
  },
});
