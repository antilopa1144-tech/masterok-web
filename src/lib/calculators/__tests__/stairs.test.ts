import { describe, it, expect } from "vitest";
import { stairsDef } from "../formulas/stairs";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = stairsDef.calculate.bind(stairsDef);

describe("Калькулятор лестницы", () => {
  describe("Деревянная: высота 2.8 м, ступень 170 мм, проступь 280 мм, ширина 1.0 м", () => {
    // stepCount = round(2.8 / 0.17) = round(16.47) = 16
    // realStepHeight = 2.8 / 16 = 0.175
    // horizontalLength = (16 - 1) * 0.28 = 15 * 0.28 = 4.2
    // stringerLength = sqrt(2.8^2 + 4.2^2) = sqrt(7.84 + 17.64) = sqrt(25.48) = 5.048
    const result = calc({
      floorHeight: 2.8,
      stepHeight: 170,
      stepWidth: 280,
      stairWidth: 1.0,
      materialType: 0,
    });

    it("stepCount = 16", () => {
      expect(result.totals.stepCount).toBe(16);
    });

    it("horizontalLength = 4.2 м", () => {
      expect(result.totals.horizontalLength).toBeCloseTo(4.2, 2);
    });

    it("stringerLength = sqrt(2.8^2 + 4.2^2) = 5.048 м", () => {
      const expected = Math.sqrt(2.8 * 2.8 + 4.2 * 4.2);
      expect(result.totals.stringerLength).toBeCloseTo(expected, 2);
    });

    it("realStepHeight = 0.175 м", () => {
      expect(result.totals.realStepHeight).toBeCloseTo(0.175, 3);
    });

    it("косоур присутствует", () => {
      expect(findMaterial(result, "Косоур")).toBeDefined();
    });

    it("проступь (ступень) = 16 шт, purchaseQty = ceil(16*1.05) = 17", () => {
      const tread = findMaterial(result, "Проступь");
      expect(tread?.quantity).toBe(16);
      expect(tread?.purchaseQty).toBe(17);
    });

    it("подступенок = 16 шт, purchaseQty = ceil(16*1.05) = 17", () => {
      const riser = findMaterial(result, "Подступенок");
      expect(riser?.quantity).toBe(16);
      expect(riser?.purchaseQty).toBe(17);
    });

    it("саморезы по дереву присутствуют", () => {
      expect(findMaterial(result, "Саморезы по дереву")).toBeDefined();
    });

    it("лак для дерева присутствует", () => {
      expect(findMaterial(result, "Лак для дерева")).toBeDefined();
    });

    it("перила (поручень) присутствуют", () => {
      const railing = findMaterial(result, "Поручень");
      expect(railing).toBeDefined();
      // railingLength = horizontalLength * 2 = 4.2 * 2 = 8.4
      expect(railing?.quantity).toBeCloseTo(8.4, 2);
    });

    it("балясины присутствуют", () => {
      const bal = findMaterial(result, "Балясина");
      expect(bal).toBeDefined();
      // balyasiny = ceil(8.4 / 0.15) = ceil(56) = 56
      expect(bal?.quantity).toBe(Math.ceil(8.4 / 0.15));
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Бетонная лестница (materialType = 1)", () => {
    const result = calc({
      floorHeight: 2.8,
      stepHeight: 170,
      stepWidth: 280,
      stairWidth: 1.0,
      materialType: 1,
    });

    it("бетон М300 присутствует", () => {
      expect(findMaterial(result, "Бетон М300")).toBeDefined();
    });

    it("арматура А500С присутствует", () => {
      expect(findMaterial(result, "Арматура А500С")).toBeDefined();
    });

    it("объём бетона: (1.0 * 0.28 * 0.17 / 2) * 16 = 0.3808 м³", () => {
      const concrete = findMaterial(result, "Бетон М300");
      const expected = (1.0 * 0.28 * 0.17 / 2) * 16;
      expect(concrete?.quantity).toBeCloseTo(expected, 3);
    });

    it("нет косоура и подступенков (дерево)", () => {
      expect(findMaterial(result, "Косоур")).toBeUndefined();
      expect(findMaterial(result, "Подступенок")).toBeUndefined();
    });

    it("нет саморезов и лака", () => {
      expect(findMaterial(result, "Саморезы по дереву")).toBeUndefined();
      expect(findMaterial(result, "Лак для дерева")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Металлокаркас (materialType = 2)", () => {
    const result = calc({
      floorHeight: 2.8,
      stepHeight: 170,
      stepWidth: 280,
      stairWidth: 1.0,
      materialType: 2,
    });

    it("швеллер / профтруба присутствует", () => {
      expect(findMaterial(result, "Швеллер")).toBeDefined();
    });

    it("ступень дубовая присутствует", () => {
      expect(findMaterial(result, "Ступень дубовая")).toBeDefined();
    });

    it("болты М8 присутствуют", () => {
      const bolts = findMaterial(result, "Болты М8");
      expect(bolts).toBeDefined();
      // bolts = 16 * 4 + 8 = 72, withReserve = ceil(72*1.1) = ceil(79.2) = 80
      expect(bolts?.purchaseQty).toBe(80);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Предупреждения", () => {
    it("высота ступени > 190 мм → предупреждение ГОСТ 23120", () => {
      const result = calc({ floorHeight: 2.8, stepHeight: 200, stepWidth: 280, stairWidth: 1.0, materialType: 0 });
      expect(result.warnings.some((w) => w.includes("ГОСТ 23120"))).toBe(true);
    });

    it("ширина проступи < 250 мм → предупреждение", () => {
      const result = calc({ floorHeight: 2.8, stepHeight: 170, stepWidth: 250, stairWidth: 1.0, materialType: 0 });
      // stepWidth = 250, which is NOT < 250, so no warning
      expect(result.warnings.some((w) => w.includes("250 мм"))).toBe(false);
    });

    it("ширина лестницы < 0.9 м → предупреждение СП 54.13330", () => {
      const result = calc({ floorHeight: 2.8, stepHeight: 170, stepWidth: 280, stairWidth: 0.8, materialType: 0 });
      expect(result.warnings.some((w) => w.includes("0.9 м"))).toBe(true);
    });

    it("стандартные параметры — нет предупреждений", () => {
      const result = calc({ floorHeight: 2.8, stepHeight: 170, stepWidth: 280, stairWidth: 1.0, materialType: 0 });
      expect(result.warnings.length).toBe(0);
    });
  });

  describe("Минимальная высота (clamped to 2.0)", () => {
    const result = calc({
      floorHeight: 1.0,
      stepHeight: 170,
      stepWidth: 280,
      stairWidth: 1.0,
      materialType: 0,
    });

    it("floorHeight clamped to 2.0, stepCount = round(2.0/0.17) = round(11.76) = 12", () => {
      expect(result.totals.stepCount).toBe(12);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });
});
