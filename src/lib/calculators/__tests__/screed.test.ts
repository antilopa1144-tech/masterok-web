import { describe, it, expect } from "vitest";
import { screedDef } from "../formulas/screed";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(screedDef.calculate.bind(screedDef));

describe("Калькулятор стяжки пола", () => {
  describe("ЦПС 1:3, 5×4 м, толщина 50 мм", () => {
    // area = 20, thicknessM = 0.05
    // volume = 20 * 0.05 * 1.15 = 1.15 (усадочный множитель 1.15 для ручного замеса ЦПС 1:3)
    // cementKg = 1.15 * 0.25 * 1300 = 373.75
    // cementBags = ceil(373.75/50) = ceil(7.475) = 8
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

    it("объём с усадкой 15% = 1.15 м³", () => {
      expect(result.totals.volume).toBeCloseTo(1.15, 3);
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
    // area=20, thicknessM=0.05, volume_multiplier=1.10 (готовая ЦПС, заводская)
    // volume = 20 * 0.05 * 1.10 = 1.10 м³
    // cpsKg = 1.10 * 2000 = 2200
    // bags50 = ceil(2200/50) = 44
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

    it("объём с усадкой 10% = 1.10 м³", () => {
      expect(result.totals.volume).toBeCloseTo(1.10, 3);
    });

    it("ЦПС 44 мешка × 50 кг = 2200 кг", () => {
      const cps = findMaterial(result, "Готовая ЦПС М150");
      expect(cps?.purchaseQty).toBe(2200);
    });
  });

  describe("Полусухая стяжка", () => {
    // area=20, thicknessM=0.05, volume_multiplier=1.07 (полусухая, минимум воды)
    // volume = 20 * 0.05 * 1.07 = 1.07 м³
    // cpsKg = 1.07 * 1800 = 1926
    // bags50 = ceil(1926/50) = 39, purchaseQty = 1950
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

    it("объём с усадкой 7% = 1.07 м³", () => {
      expect(result.totals.volume).toBeCloseTo(1.07, 3);
    });

    it("ЦПС 39 мешков × 50 кг = 1950 кг", () => {
      const cps = findMaterial(result, "ЦПС полусухая");
      expect(cps?.purchaseQty).toBe(1950);
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
