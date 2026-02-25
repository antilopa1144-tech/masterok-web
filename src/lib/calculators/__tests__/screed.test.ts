import { describe, it, expect } from "vitest";
import { screedDef } from "../formulas/screed";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = screedDef.calculate.bind(screedDef);

describe("Калькулятор стяжки пола", () => {
  describe("ЦПС 1:3, 5×4 м, толщина 50 мм", () => {
    // area = 20, thicknessM = 0.05
    // volume = 20 * 0.05 * 1.08 = 1.08
    // cementM3 = 1.08/4 = 0.27
    // cementKg = 0.27 * 1300 = 351
    // cementBags = ceil(351/50) = ceil(7.02) = 8
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      thickness: 50,
      screedType: 0,
    });

    it("площадь = 20 м²", () => {
      expect(result.totals.area).toBe(20);
    });

    it("объём с запасом 8% = 1.08 м³", () => {
      expect(result.totals.volume).toBeCloseTo(1.08, 3);
    });

    it("цемент 8 мешков 50 кг", () => {
      const cement = findMaterial(result, "Цемент");
      expect(cement?.purchaseQty).toBe(8);
    });

    it("песок присутствует", () => {
      expect(findMaterial(result, "Песок")).toBeDefined();
    });

    it("армосетка при 50 мм >= 40 мм", () => {
      expect(findMaterial(result, "Сетка армировочная")).toBeDefined();
    });

    it("демпферная лента присутствует", () => {
      expect(findMaterial(result, "Демпферная лента")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Готовая ЦПС М150", () => {
    // area=20, volume=1.08, cpsKg=1.08*2000=2160
    // bags50 = ceil(2160/50) = ceil(43.2) = 44
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      thickness: 50,
      screedType: 1,
    });

    it("ЦПС М150 50 кг присутствует", () => {
      expect(findMaterial(result, "ЦПС М150")).toBeDefined();
    });

    it("мешков ЦПС 44", () => {
      const cps = findMaterial(result, "ЦПС М150 (мешки 50 кг)");
      expect(cps?.purchaseQty).toBe(44);
    });
  });

  describe("Полусухая стяжка", () => {
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      thickness: 50,
      screedType: 2,
    });

    it("предупреждение о спецоборудовании", () => {
      expect(result.warnings.some((w) => w.includes("оборудования"))).toBe(true);
    });

    it("фиброволокно присутствует", () => {
      expect(findMaterial(result, "Фиброволокно")).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("толщина >= 80 мм → укладка слоями", () => {
      const result = calc({ inputMode: 1, area: 20, thickness: 80, screedType: 0 });
      expect(result.warnings.some((w) => w.includes("слоями"))).toBe(true);
    });

    it("толщина > 100 мм → армирование", () => {
      const result = calc({ inputMode: 1, area: 20, thickness: 120, screedType: 0 });
      expect(result.warnings.some((w) => w.includes("армирование"))).toBe(true);
    });
  });
});
