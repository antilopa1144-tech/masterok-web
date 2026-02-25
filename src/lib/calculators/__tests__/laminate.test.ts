import { describe, it, expect } from "vitest";
import { laminateDef } from "../formulas/laminate";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = laminateDef.calculate.bind(laminateDef);

describe("Калькулятор ламината", () => {
  describe("Прямая укладка: 5×4 м, упаковка 2.397 м², с подложкой", () => {
    // area = 20, perimeter = 18
    // laminateArea = 20 * 1.05 = 21
    // packs = ceil(21 / 2.397) = ceil(8.76...) = 9
    // underlaymentArea = 20 * 1.15 = 23 → rolls = ceil(23/10) = 3
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      packArea: 2.397,
      layingMethod: 0,
      hasUnderlayment: 1,
      underlaymentRoll: 10,
    });

    it("площадь = 20 м²", () => {
      expect(result.totals.area).toBe(20);
    });

    it("упаковок ламината = 9", () => {
      const laminate = findMaterial(result, "Ламинат");
      expect(laminate?.purchaseQty).toBe(9);
    });

    it("процент отходов = 5%", () => {
      expect(result.totals.wastePercent).toBeCloseTo(5, 1);
    });

    it("подложки 3 рулона", () => {
      const underlayment = findMaterial(result, "Подложка");
      expect(underlayment?.purchaseQty).toBe(3);
    });

    it("плинтус присутствует", () => {
      expect(findMaterial(result, "Плинтус")).toBeDefined();
    });

    it("клинья распорные присутствуют", () => {
      expect(findMaterial(result, "клинья") ?? findMaterial(result, "Клинья")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Диагональная укладка: +15% отходов", () => {
    // area = 20, packs = ceil(20*1.15/2.397) = ceil(9.59) = 10
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      packArea: 2.397,
      layingMethod: 1,
      hasUnderlayment: 0,
      underlaymentRoll: 10,
    });

    it("упаковок = 10", () => {
      const laminate = findMaterial(result, "Ламинат");
      expect(laminate?.purchaseQty).toBe(10);
    });

    it("без подложки — не входит в результат", () => {
      expect(findMaterial(result, "Подложка")).toBeUndefined();
    });
  });

  describe("Ёлочка: +20% отходов", () => {
    // area = 20, packs = ceil(20*1.20/2.397) = ceil(10.01) = 11
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      packArea: 2.397,
      layingMethod: 2,
      hasUnderlayment: 0,
      underlaymentRoll: 10,
    });

    it("упаковок = 11", () => {
      const laminate = findMaterial(result, "Ламинат");
      expect(laminate?.purchaseQty).toBe(11);
    });
  });

  describe("Предупреждения", () => {
    it("площадь < 3 м² → предупреждение", () => {
      const result = calc({
        inputMode: 1,
        area: 2,
        packArea: 2.397,
        layingMethod: 0,
        hasUnderlayment: 0,
        underlaymentRoll: 10,
      });
      expect(result.warnings.some((w) => w.includes("Маленькая"))).toBe(true);
    });

    it("ёлочка > 50 м² → предупреждение", () => {
      const result = calc({
        inputMode: 1,
        area: 60,
        packArea: 2.397,
        layingMethod: 2,
        hasUnderlayment: 0,
        underlaymentRoll: 10,
      });
      expect(result.warnings.some((w) => w.includes("ёлочк"))).toBe(true);
    });
  });
});
