import { describe, expect, it } from "vitest";
import tileFixture from "../../../../tests/fixtures/tile-canonical-parity.json";
import { tileDef } from "../formulas/tile";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = tileDef.calculate.bind(tileDef);

describe("Калькулятор плитки", () => {
  it("декларирует formulaVersion для canonical tile", () => {
    expect(tileDef.formulaVersion).toBe("tile-canonical-v1");
  });

  describe("Canonical tile fixture parity", () => {
    for (const fixtureCase of tileFixture.cases) {
      it(fixtureCase.id, () => {
        const result = calc(fixtureCase.inputs as unknown as Record<string, number>);
        const expected = fixtureCase.expected;

        expect(result.formulaVersion).toBe(expected.formulaVersion);
        expect(result.totals.area).toBeCloseTo(expected.area, 2);
        expect(result.totals.wastePercent).toBeCloseTo(expected.wastePercent, 2);
        expect(result.warnings).toHaveLength(expected.warningsCount);

        const recScenario = result.scenarios!.REC;
        expect(recScenario.buy_plan.package_size).toBe(expected.recScenario.packageSize);
        expect(recScenario.exact_need).toBeCloseTo(expected.recScenario.exactNeed, 5);
        expect(recScenario.purchase_quantity).toBeCloseTo(expected.recScenario.purchaseQuantity, 5);

        expect(findMaterial(result, "Плитка")?.purchaseQty).toBe(expected.materials.tiles);
        expect(findMaterial(result, "Плиточный клей")?.purchaseQty).toBe(expected.materials.glueBags);
        expect(findMaterial(result, "Затирка")?.purchaseQty).toBe(expected.materials.groutBags);
        expect(findMaterial(result, "Грунтовка")?.purchaseQty).toBe(expected.materials.primerCans);

        if (expected.materials.crosses !== undefined) {
          expect(findMaterial(result, "Крестики")?.purchaseQty).toBe(expected.materials.crosses);
        }
        if (expected.materials.svpPackages !== undefined) {
          expect(findMaterial(result, "СВП")?.purchaseQty).toBe(expected.materials.svpPackages);
        }

        checkInvariants(result);
      });
    }
  });

  it("добавляет предупреждение для диагональной укладки", () => {
    const result = calc({
      inputMode: 1,
      area: 12,
      tileWidth: 300,
      tileHeight: 300,
      layingMethod: 1,
      jointWidth: 3,
    });

    expect(result.warnings.some((warning) => warning.includes("Диагональная"))).toBe(true);
  });

  it("добавляет предупреждение для крупного формата", () => {
    const result = calc({
      inputMode: 1,
      area: 20,
      tileWidth: 800,
      tileHeight: 800,
      layingMethod: 0,
      jointWidth: 3,
    });

    expect(result.warnings.some((warning) => warning.includes("Крупный формат"))).toBe(true);
  });
});
