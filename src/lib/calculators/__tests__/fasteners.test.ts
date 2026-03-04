import { describe, it, expect } from "vitest";
import { fastenersDef } from "../formulas/fasteners";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = fastenersDef.calculate.bind(fastenersDef);

describe("Калькулятор крепежа", () => {
  describe("ГКЛ, 10 листов, шаг 250 мм", () => {
    const result = calc({
      materialType: 0,
      sheetCount: 10,
      fastenerStep: 250,
      hasFrameScrews: 1,
      hasDowels: 0,
    });

    it("саморезы для ГКЛ присутствуют", () => {
      const screws = findMaterial(result, "Саморезы для ГКЛ");
      expect(screws).toBeDefined();
      expect(screws!.unit).toBe("кг");
    });

    it("клопы для каркаса присутствуют", () => {
      expect(findMaterial(result, "клопы")).toBeDefined();
    });

    it("бита PH2 присутствует", () => {
      expect(findMaterial(result, "Бита PH2")).toBeDefined();
    });

    it("дюбели отсутствуют (не включены)", () => {
      expect(findMaterial(result, "Дюбель")).toBeUndefined();
    });

    it("totals", () => {
      expect(result.totals.sheetsOrArea).toBe(10);
      expect(result.totals.screwsPerUnit).toBe(24);
      // 10 × 24 × 1.05 = 252
      expect(result.totals.totalScrews).toBe(252);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("ОСБ, 20 листов, шаг 200 мм", () => {
    const result = calc({
      materialType: 1,
      sheetCount: 20,
      fastenerStep: 200,
      hasFrameScrews: 1,
      hasDowels: 1,
    });

    it("саморезы по дереву 3.5×35", () => {
      const screws = findMaterial(result, "Саморезы по дереву");
      expect(screws).toBeDefined();
    });

    it("дюбели присутствуют (включены)", () => {
      expect(findMaterial(result, "Дюбель")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Профлист, 50 м², шаг 300 мм", () => {
    const result = calc({
      materialType: 2,
      sheetCount: 50,
      fastenerStep: 300,
      hasFrameScrews: 0,
      hasDowels: 0,
    });

    it("кровельные саморезы с EPDM", () => {
      const screws = findMaterial(result, "кровельные");
      expect(screws).toBeDefined();
    });

    it("клопы отсутствуют (профлист)", () => {
      expect(findMaterial(result, "клопы")).toBeUndefined();
    });

    it("предупреждение о шуруповёрте", () => {
      expect(result.warnings.some((w) => w.includes("шуруповёрт"))).toBe(true);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Вагонка, 30 м²", () => {
    const result = calc({
      materialType: 3,
      sheetCount: 30,
      fastenerStep: 250,
      hasFrameScrews: 0,
      hasDowels: 0,
    });

    it("кляймеры вместо саморезов", () => {
      expect(findMaterial(result, "Кляймеры")).toBeDefined();
    });

    it("гвозди для кляймеров", () => {
      expect(findMaterial(result, "Гвозди для кляймеров")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Усиленный шаг 150 мм → предупреждение", () => {
    const result = calc({
      materialType: 0,
      sheetCount: 5,
      fastenerStep: 150,
      hasFrameScrews: 0,
      hasDowels: 0,
    });

    it("предупреждение об усиленном креплении", () => {
      expect(result.warnings.some((w) => w.includes("усиленное"))).toBe(true);
    });
  });
});
