import { describe, it, expect } from "vitest";
import { puttyDef } from "../formulas/putty";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = puttyDef.calculate.bind(puttyDef);

describe("Калькулятор шпаклёвки", () => {
  describe("Только финишная, стены, 5×4×2.7 м, мешок 20 кг", () => {
    // wallsArea = 2*(5+4)*2.7 = 48.6
    // finishKg = 48.6 * 1.1 * 1.1 = 58.806
    // finishBags = ceil(58.806/20) = ceil(2.94) = 3
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      height: 2.7,
      surface: 0,
      puttyType: 0,
      bagWeight: 20,
    });

    it("площадь стен = 48.6 м²", () => {
      expect(result.totals.wallArea).toBeCloseTo(48.6, 1);
    });

    it("шпаклёвки финишной 3 мешка", () => {
      const putty = findMaterial(result, "финишная");
      expect(putty?.purchaseQty).toBe(3);
    });

    it("грунтовка присутствует", () => {
      expect(findMaterial(result, "Грунтовка")).toBeDefined();
    });

    it("наждачная бумага присутствует", () => {
      expect(findMaterial(result, "Наждачная")).toBeDefined();
    });

    it("нет стартовой", () => {
      expect(findMaterial(result, "стартовая")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Стартовая + финишная", () => {
    // startKg = 48.6 * 2.7 * 1.1 = 144.342 → bags = ceil(144.342/20) = ceil(7.22) = 8
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      height: 2.7,
      surface: 0,
      puttyType: 1,
      bagWeight: 20,
    });

    it("финишная присутствует", () => {
      expect(findMaterial(result, "финишная")).toBeDefined();
    });

    it("стартовая присутствует", () => {
      expect(findMaterial(result, "стартовая")).toBeDefined();
    });

    it("серпянка присутствует при стартовой", () => {
      expect(findMaterial(result, "Серпянка")).toBeDefined();
    });
  });

  describe("Только стартовая", () => {
    const result = calc({
      inputMode: 1,
      area: 48.6,
      surface: 0,
      puttyType: 2,
      bagWeight: 20,
    });

    it("нет финишной", () => {
      expect(findMaterial(result, "финишная")).toBeUndefined();
    });

    it("стартовая присутствует", () => {
      expect(findMaterial(result, "стартовая")).toBeDefined();
    });
  });

  describe("Потолок", () => {
    // ceilArea = 5*4 = 20
    // finishKg = 20 * 1.1 * 1.1 = 24.2 → bags = ceil(24.2/20) = 2
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      height: 2.7,
      surface: 1,
      puttyType: 0,
      bagWeight: 20,
    });

    it("площадь потолка = 20 м²", () => {
      expect(result.totals.wallArea).toBeCloseTo(20, 1);
    });

    it("финишной 2 мешка", () => {
      const putty = findMaterial(result, "финишная");
      expect(putty?.purchaseQty).toBe(2);
    });
  });

  describe("Большая площадь → предупреждение о механизации", () => {
    it("площадь > 100 м² → предупреждение", () => {
      const result = calc({ inputMode: 1, area: 120, surface: 0, puttyType: 0, bagWeight: 20 });
      expect(result.warnings.some((w) => w.includes("механизированным"))).toBe(true);
    });
  });
});
