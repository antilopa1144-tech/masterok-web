import { describe, it, expect } from "vitest";
import { drywallDef } from "../formulas/drywall";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(drywallDef.calculate.bind(drywallDef));

describe("Калькулятор гипсокартона", () => {
  describe("Перегородка 5×2.7 м, 1 слой, шаг 600 мм", () => {
    // area = 13.5, sides = 2, totalSheetArea = 27
    // GKL_AREA = 3.0
    // sheetsNeeded = ceil(27/3.0 * 1.10) = ceil(9.9) = 10
    // cdCount = ceil(5/0.6)+1 = 9+1 = 10
    // udPerimeter = 2*(5+2.7) = 15.4
    const result = calc({
      workType: 0,
      length: 5,
      height: 2.7,
      layers: 1,
      profileStep: 0.6,
    });

    it("листов ГКЛ к покупке — целое число (11): нельзя купить 10.6 листа", () => {
      const sheets = findMaterial(result, "ГКЛ");
      // baseSheetsNeeded=10, REC ×1.06 = 10.6 расхода → к покупке ceil = 11 листов
      expect(sheets?.purchaseQty).toBe(11);
      expect(Number.isInteger(sheets?.purchaseQty)).toBe(true);
      // Точный REC-расход остаётся в totals для справки
      expect(result.totals.sheetsNeeded).toBeCloseTo(10.6, 1);
    });

    it("профиль ПН присутствует", () => {
      expect(findMaterial(result, "ПН")).toBeDefined();
    });

    it("профиль ПП присутствует", () => {
      expect(findMaterial(result, "ПП")).toBeDefined();
    });

    it("саморезы 3.5×25 мм в кг", () => {
      const screws = findMaterial(result, "Саморезы 3.5×25");
      expect(screws).toBeDefined();
      expect(screws?.unit).toBe("кг");
    });

    it("саморезы-клопы 3.5×9.5 мм в кг", () => {
      const screws = findMaterial(result, "клопы");
      expect(screws).toBeDefined();
      expect(screws?.unit).toBe("кг");
    });

    it("шпаклёвка финишная Knauf присутствует", () => {
      expect(findMaterial(result, "финишная")).toBeDefined();
    });

    it("серпянка присутствует", () => {
      expect(findMaterial(result, "Серпянка")).toBeDefined();
    });

    it("totals содержат sheetsNeeded = 10.6 (REC ×1.06)", () => {
      expect(result.totals.sheetsNeeded).toBeCloseTo(10.6, 1);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Обшивка стены (1 сторона)", () => {
    // area = 13.5, sides = 1, totalSheetArea = 13.5
    // sheetsNeeded = ceil(13.5/3.0 * 1.10) = ceil(4.95) = 5
    const result = calc({
      workType: 1,
      length: 5,
      height: 2.7,
      layers: 1,
      profileStep: 0.6,
    });

    it("листов к покупке — целое (6): обшивка одной стороны", () => {
      const sheets = findMaterial(result, "ГКЛ");
      // baseSheetsNeeded=5, REC ×1.06 = 5.3 → к покупке ceil = 6 листов
      expect(sheets?.purchaseQty).toBe(6);
      expect(result.totals.sheetsNeeded).toBeCloseTo(5.3, 1);
    });
  });

  describe("2 слоя с каждой стороны", () => {
    // totalSheetArea = 13.5 * 2 * 2 = 54
    // sheetsNeeded = ceil(54/3.0 * 1.10) = ceil(19.8) = 20
    const result = calc({
      workType: 0,
      length: 5,
      height: 2.7,
      layers: 2,
      profileStep: 0.6,
    });

    it("листов к покупке — целое (22): 2 слоя с каждой стороны", () => {
      const sheets = findMaterial(result, "ГКЛ");
      // baseSheetsNeeded=20, REC ×1.06 = 21.2 → к покупке ceil = 22 листа
      expect(sheets?.purchaseQty).toBe(22);
      expect(result.totals.sheetsNeeded).toBeCloseTo(21.2, 1);
    });

    it("предупреждение о смещении стыков", () => {
      expect(result.warnings.some((w) => w.includes("смещением"))).toBe(true);
    });
  });

  describe("Высота > 3.5 м → профили 100 мм", () => {
    it("предупреждение о широких профилях", () => {
      const result = calc({
        workType: 0,
        length: 5,
        height: 4.0,
        layers: 1,
        profileStep: 0.6,
      });
      expect(result.warnings.some((w) => w.includes("профили шириной 100"))).toBe(true);
    });
  });
});
