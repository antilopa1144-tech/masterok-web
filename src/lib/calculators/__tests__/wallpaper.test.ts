import { describe, expect, it } from "vitest";
import wallpaperFixture from "../../../../tests/fixtures/wallpaper-canonical-parity.json";
import { wallpaperDef } from "../formulas/wallpaper";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(wallpaperDef.calculate.bind(wallpaperDef));

describe("Калькулятор обоев", () => {
  it("декларирует formulaVersion для canonical wallpaper", () => {
    expect(wallpaperDef.formulaVersion).toBe("wallpaper-canonical-v1");
  });

  describe("Canonical wallpaper fixture parity", () => {
    for (const fixtureCase of wallpaperFixture.cases) {
      it(fixtureCase.id, () => {
        const result = calc(fixtureCase.inputs as unknown as Record<string, number>);
        const expected = fixtureCase.expected;

        expect(result.formulaVersion).toBe(expected.formulaVersion);
        expect(result.totals.wallArea).toBeCloseTo(expected.wallArea, 1);
        expect(result.totals.netArea).toBeCloseTo(expected.netArea, 1);
        expect(result.warnings).toHaveLength(expected.warningsCount);

        const recScenario = result.scenarios!.REC;
        expect(recScenario.buy_plan.package_size).toBe(expected.recScenario.packageSize);
        expect(recScenario.exact_need).toBeCloseTo(expected.recScenario.exactNeed, 5);
        expect(recScenario.purchase_quantity).toBeCloseTo(expected.recScenario.purchaseQuantity, 5);

        expect(findMaterial(result, "Обои")?.purchaseQty).toBe(expected.materials.rolls);
        expect(findMaterial(result, "Клей")?.purchaseQty).toBe(expected.materials.pastePacks);
        const _wpm = findMaterial(result, "Грунтовка");
        expect(_wpm).toBeTruthy();
        expect(_wpm!.unit).toBe("л");
        expect(_wpm!.purchaseQty).toBeGreaterThan(0);

        checkInvariants(result);
      });
    }
  });

  it("добавляет предупреждение для большого раппорта", () => {
    const result = calc({
      perimeter: 14,
      height: 2.7,
      rollLength: 10,
      rollWidth: 530,
      rapport: 40,
      doors: 1,
      windows: 1,
    });

    expect(result.warnings.some((warning) => warning.includes("раппорт"))).toBe(true);
  });

  it("добавляет предупреждение для широких рулонов", () => {
    const result = calc({
      perimeter: 14,
      height: 2.7,
      rollLength: 10,
      rollWidth: 1060,
      rapport: 0,
      doors: 1,
      windows: 1,
    });

    expect(result.warnings.some((warning) => warning.includes("Широкие") || warning.includes("метровых"))).toBe(true);
  });
});
