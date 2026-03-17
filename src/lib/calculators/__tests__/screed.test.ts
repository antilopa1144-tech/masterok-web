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

    it("цемент 8 мешков × 50 кг = 400 кг", () => {
      const cement = findMaterial(result, "Цемент");
      expect(cement?.purchaseQty).toBe(400);
    });

    it("песок присутствует", () => {
      expect(findMaterial(result, "Песок")).toBeDefined();
    });

    it("армосетка при 50 мм >= 40 мм", () => {
      expect(findMaterial(result, "Сетка армирующая")).toBeDefined();
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

    it("ЦПС 44 мешка × 50 кг = 2200 кг", () => {
      const cps = findMaterial(result, "Готовая ЦПС М150");
      expect(cps?.purchaseQty).toBe(2200);
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

    it("ЦПС полусухая присутствует", () => {
      expect(findMaterial(result, "ЦПС полусухая")).toBeDefined();
    });

    it("фиброволокно ПП присутствует", () => {
      expect(findMaterial(result, "Фиброволокно")).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("толщина > 100 мм → укладка слоями", () => {
      const result = calc({ inputMode: 1, area: 20, thickness: 120, screedType: 0 });
      expect(result.warnings.some((w) => w.includes("слои"))).toBe(true);
    });

    it("площадь > 50 м² с ЦПС → рекомендация готовой ЦПС", () => {
      const result = calc({ inputMode: 1, area: 60, thickness: 50, screedType: 0 });
      expect(result.warnings.some((w) => w.includes("готовую ЦПС"))).toBe(true);
    });
  });
});
