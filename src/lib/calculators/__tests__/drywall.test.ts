import { describe, it, expect } from "vitest";
import { drywallDef } from "../formulas/drywall";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = drywallDef.calculate.bind(drywallDef);

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

    it("листов ГКЛ = 10", () => {
      const sheets = findMaterial(result, "ГКЛ");
      expect(sheets?.purchaseQty).toBe(10);
    });

    it("профиль ПН присутствует", () => {
      expect(findMaterial(result, "ПН")).toBeDefined();
    });

    it("профиль ПП присутствует", () => {
      expect(findMaterial(result, "ПП")).toBeDefined();
    });

    it("саморезы для ГКЛ 3.5×25 в кг", () => {
      const screws = findMaterial(result, "Саморезы для ГКЛ 3.5×25");
      expect(screws).toBeDefined();
      expect(screws?.unit).toBe("кг");
    });

    it("саморезы-клопы металл-металл в шт", () => {
      const screws = findMaterial(result, "клопы");
      expect(screws).toBeDefined();
      expect(screws?.unit).toBe("шт");
    });

    it("шпаклёвка финишная Knauf присутствует", () => {
      expect(findMaterial(result, "финишная")).toBeDefined();
    });

    it("серпянка присутствует", () => {
      expect(findMaterial(result, "Серпянка")).toBeDefined();
    });

    it("totals содержат sheetsNeeded = 10", () => {
      expect(result.totals.sheetsNeeded).toBe(10);
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

    it("листов = 5 (одна сторона)", () => {
      const sheets = findMaterial(result, "ГКЛ");
      expect(sheets?.purchaseQty).toBe(5);
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

    it("листов = 20", () => {
      const sheets = findMaterial(result, "ГКЛ");
      expect(sheets?.purchaseQty).toBe(20);
    });

    it("предупреждение о смещении стыков", () => {
      expect(result.warnings.some((w) => w.includes("смещением"))).toBe(true);
    });
  });

  describe("Высота > 3.5 м → усиленный каркас", () => {
    it("предупреждение об усиленном каркасе", () => {
      const result = calc({
        workType: 0,
        length: 5,
        height: 4.0,
        layers: 1,
        profileStep: 0.6,
      });
      expect(result.warnings.some((w) => w.includes("усиленный"))).toBe(true);
    });
  });
});
