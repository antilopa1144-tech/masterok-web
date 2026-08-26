import { describe, expect, it } from "vitest";
import wallpaperFixture from "../../../../tests/fixtures/wallpaper-canonical-parity.json";
import { wallpaperDef } from "../formulas/wallpaper";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(wallpaperDef.calculate.bind(wallpaperDef));

describe("Калькулятор обоев", () => {
  it("декларирует formulaVersion для canonical wallpaper", () => {
    expect(wallpaperDef.formulaVersion).toBe("wallpaper-canonical-v3");
  });

  it("web-дефолты длины рулона и запаса совпадают с canonical и Flutter", () => {
    const rollLengthField = wallpaperDef.fields.find((field) => field.key === "rollLength");
    const reserveRollsField = wallpaperDef.fields.find((field) => field.key === "reserveRolls");

    expect(rollLengthField?.defaultValue).toBe(10.05);
    expect(rollLengthField?.step).toBe(0.05);
    expect(reserveRollsField?.defaultValue).toBe(0);
  });

  it("не добавляет скрытый запасной рулон, если поле запаса не передано", () => {
    const withoutReserve = calc({
      perimeter: 14,
      height: 2.7,
      rollLength: 10.05,
      rollWidth: 530,
      rapport: 0,
      doors: 1,
      windows: 1,
    });
    const explicitZeroReserve = calc({
      perimeter: 14,
      height: 2.7,
      rollLength: 10.05,
      rollWidth: 530,
      rapport: 0,
      doors: 1,
      windows: 1,
      reserveRolls: 0,
    });

    expect(withoutReserve.totals.reserveRolls).toBe(0);
    expect(withoutReserve.totals.recPurchaseRolls).toBe(9);
    expect(withoutReserve.totals.recPurchaseRolls).toBe(explicitZeroReserve.totals.recPurchaseRolls);
  });

  it("не занижает MIN и применяет явный запас к чистой потребности только один раз", () => {
    const result = calc({
      perimeter: 14,
      height: 2.7,
      rollLength: 10.05,
      rollWidth: 530,
      rapport: 0,
      doors: 0,
      windows: 0,
      reservePercent: 15,
      reserveRolls: 0,
    });

    expect(result.totals.baseExactRolls).toBe(9);
    expect(result.scenarios?.MIN.exact_need).toBe(9);
    expect(result.scenarios?.REC.exact_need).toBeCloseTo(10.35, 6);
    expect(result.scenarios?.REC.purchase_quantity).toBe(11);
    expect(result.scenarios?.MAX.exact_need).toBeCloseTo(11.35, 6);
    expect(result.scenarios?.MAX.purchase_quantity).toBe(12);
  });

  it("разделяет чистую потребность, рабочий запас и покупку упаковок", () => {
    const result = calc({
      perimeter: 14,
      height: 2.7,
      rollLength: 10.05,
      rollWidth: 530,
      rapport: 0,
      doors: 0,
      windows: 0,
      reservePercent: 0,
      reserveRolls: 0,
    });

    const wallpaper = findMaterial(result, "Обои");
    const paste = findMaterial(result, "Клей");
    const primer = findMaterial(result, "Грунтовка");

    expect(wallpaper?.quantity).toBe(9);
    expect(wallpaper?.withReserve).toBe(9);
    expect(wallpaper?.purchaseQty).toBe(9);

    expect(paste?.quantity).toBeCloseTo(0.189, 6);
    expect(paste?.withReserve).toBeCloseTo(0.2079, 6);
    expect(paste?.purchaseQty).toBe(0.25);

    expect(primer?.quantity).toBeCloseTo(5.67, 6);
    expect(primer?.withReserve).toBeCloseTo(6.237, 6);
    expect(primer?.purchaseQty).toBe(10);
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

  it("добавляет припуск 10 см к однотонной полосе", () => {
    const result = calc({
      perimeter: 14,
      height: 2.7,
      rollLength: 10.05,
      rollWidth: 530,
      rapport: 0,
      reserveRolls: 0,
    });

    expect(result.totals.stripLength).toBeCloseTo(2.8, 3);
    expect(result.totals.stripsPerRoll).toBe(3);
  });

  it("округляет высоту с припуском вверх до целого раппорта", () => {
    const result = calc({
      perimeter: 14,
      height: 2.7,
      rollLength: 10.05,
      rollWidth: 530,
      rapport: 64,
      reserveRolls: 0,
    });

    expect(result.totals.stripLength).toBeCloseTo(3.2, 3);
    expect((result.totals.stripLength * 100) % 64).toBeCloseTo(0, 6);
  });
});
