import { describe, it, expect } from "vitest";
import { fastenersDef } from "../formulas/fasteners";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = fastenersDef.calculate.bind(fastenersDef);

describe("Калькулятор крепежа", () => {
  describe("ГКЛ (materialType=0), 10 листов, шаг 200 мм", () => {
    const result = calc({
      materialType: 0,
      sheetCount: 10,
      fastenerStep: 200,
      withFrameScrews: 1,
      withDubels: 0,
    });

    it("саморезы 3.5x25 присутствуют", () => {
      // Engine: "Саморезы 3.5×25"
      const screws = findMaterial(result, "Саморезы 3.5×25");
      expect(screws).toBeDefined();
    });

    it("саморезы каркасные присутствуют (withFrameScrews=1)", () => {
      // Engine: "Саморезы каркасные"
      expect(findMaterial(result, "Саморезы каркасные")).toBeDefined();
    });

    it("биты для шуруповёрта присутствуют", () => {
      // Engine: "Биты для шуруповёрта"
      expect(findMaterial(result, "Биты")).toBeDefined();
    });

    it("дюбели отсутствуют (withDubels=0)", () => {
      expect(findMaterial(result, "Дюбели")).toBeUndefined();
    });

    it("totals содержат screwsPerUnit, totalScrews", () => {
      expect(result.totals.screwsPerUnit).toBeGreaterThan(0);
      expect(result.totals.totalScrews).toBeGreaterThan(0);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("ОСБ (materialType=1), 20 листов, шаг 200 мм, с дюбелями", () => {
    const result = calc({
      materialType: 1,
      sheetCount: 20,
      fastenerStep: 200,
      withFrameScrews: 1,
      withDubels: 1,
    });

    it("саморезы 3.5x35 присутствуют", () => {
      // Engine: "Саморезы 3.5×35"
      const screws = findMaterial(result, "Саморезы 3.5×35");
      expect(screws).toBeDefined();
    });

    it("дюбели присутствуют (withDubels=1)", () => {
      // Engine: "Дюбели"
      expect(findMaterial(result, "Дюбели")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Профлист (materialType=2), 50 листов, шаг 200 мм", () => {
    const result = calc({
      materialType: 2,
      sheetCount: 50,
      fastenerStep: 200,
      withFrameScrews: 0,
      withDubels: 0,
    });

    it("саморезы 4.8x35 присутствуют", () => {
      // Engine: "Саморезы 4.8×35"
      const screws = findMaterial(result, "Саморезы 4.8×35");
      expect(screws).toBeDefined();
    });

    it("каркасные саморезы отсутствуют", () => {
      expect(findMaterial(result, "Саморезы каркасные")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Вагонка (materialType=3), 30 листов", () => {
    const result = calc({
      materialType: 3,
      sheetCount: 30,
      fastenerStep: 200,
      withFrameScrews: 0,
      withDubels: 0,
    });

    it("кляймеры вместо саморезов", () => {
      // Engine: "Кляймеры"
      expect(findMaterial(result, "Кляймеры")).toBeDefined();
    });

    it("предупреждение о кляймерах", () => {
      // Engine: "Для вагонки используются кляймеры вместо саморезов"
      expect(result.warnings.some((w) => w.includes("кляймеры"))).toBe(true);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Большой объём > 100 листов", () => {
    it("предупреждение об оптовой упаковке", () => {
      const r = calc({ materialType: 0, sheetCount: 150, fastenerStep: 200, withFrameScrews: 0, withDubels: 0 });
      // Engine: "Большой объём — рассмотрите оптовую упаковку"
      expect(r.warnings.some((w) => w.includes("оптовую упаковку"))).toBe(true);
    });
  });
});
