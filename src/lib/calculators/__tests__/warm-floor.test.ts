import { describe, it, expect } from "vitest";
import { warmFloorDef } from "../formulas/warm-floor";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = warmFloorDef.calculate.bind(warmFloorDef);

describe("Калькулятор тёплого пола", () => {
  describe("Нагревательный мат, 10 м² комната, 2 м² мебель, 150 Вт/м²", () => {
    // heatingArea = 8, totalPowerW = 1200
    // matsTotal = ceil(8/2) = 4
    // insulationArea = ceil(8*1.1) = 9
    const result = calc({
      roomArea: 10,
      furnitureArea: 2,
      heatingType: 0,
      powerDensity: 150,
    });

    it("рабочая площадь = 8 м²", () => {
      expect(result.totals.heatingArea).toBeCloseTo(8, 2);
    });

    it("мощность = 1200 Вт", () => {
      expect(result.totals.totalPowerW).toBeCloseTo(1200, 1);
    });

    it("матов = 4 шт", () => {
      const mat = findMaterial(result, "мат");
      expect(mat?.purchaseQty).toBe(4);
    });

    it("терморегулятор присутствует", () => {
      expect(findMaterial(result, "Терморегулятор")).toBeDefined();
    });

    it("теплоотражающая подложка присутствует", () => {
      expect(findMaterial(result, "Теплоотражающая")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Греющий кабель в стяжку", () => {
    // heatingArea = 8, cableStep = 0.15
    // cableLength = ceil((8/0.15)*1.05) = ceil(56) = 56
    const result = calc({
      roomArea: 10,
      furnitureArea: 2,
      heatingType: 1,
      powerDensity: 150,
    });

    it("греющий кабель присутствует", () => {
      expect(findMaterial(result, "Греющий кабель")).toBeDefined();
    });

    it("длина кабеля в totals", () => {
      expect(result.totals.cableLength).toBeGreaterThan(0);
    });

    it("стяжка поверх кабеля присутствует", () => {
      expect(findMaterial(result, "Стяжка")).toBeDefined();
    });

    it("утеплитель ЭПС присутствует", () => {
      expect(findMaterial(result, "ЭПС")).toBeDefined();
    });
  });

  describe("Водяной тёплый пол", () => {
    const result = calc({
      roomArea: 10,
      furnitureArea: 2,
      heatingType: 2,
      powerDensity: 150,
    });

    it("труба PE-Xa присутствует", () => {
      expect(findMaterial(result, "PE-Xa")).toBeDefined();
    });

    it("предупреждение о согласовании для МКД", () => {
      expect(result.warnings.some((w) => w.includes("МКД"))).toBe(true);
    });
  });

  describe("Предупреждения", () => {
    it("мощность > 3.5 кВт → отдельный автомат", () => {
      const result = calc({
        roomArea: 30,
        furnitureArea: 2,
        heatingType: 0,
        powerDensity: 150,
      });
      // heatingArea = 28, totalPowerKW = 4.2 > 3.5
      expect(result.warnings.some((w) => w.includes("автомата"))).toBe(true);
    });

    it("< 50% площади под обогревом → малоэффективно", () => {
      const result = calc({
        roomArea: 10,
        furnitureArea: 7,
        heatingType: 0,
        powerDensity: 150,
      });
      // heatingArea = 3 / 10 = 30% < 50%
      expect(result.warnings.some((w) => w.includes("50%"))).toBe(true);
    });
  });
});
