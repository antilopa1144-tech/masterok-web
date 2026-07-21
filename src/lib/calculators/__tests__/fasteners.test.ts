import { describe, it, expect } from "vitest";
import { fastenersDef } from "../formulas/fasteners";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(fastenersDef.calculate.bind(fastenersDef));

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
      const screws = findMaterial(result, "Чёрные саморезы для гипсокартона по металлу 3,5×25 мм");
      expect(screws).toBeDefined();
      expect(screws?.subtitle).toContain("Фосфатированные");
      expect(screws?.subtitle).toContain("шт.");
    });

    it("саморезы каркасные присутствуют (withFrameScrews=1)", () => {
      // Engine: "Саморезы каркасные"
      expect(findMaterial(result, "Саморезы-клопы по металлу 3,5×9,5")).toBeDefined();
    });

    it("биты для шуруповёрта присутствуют", () => {
      // Engine: "Биты для шуруповёрта"
      expect(findMaterial(result, "Крестовая бита PH2")).toBeDefined();
    });

    it("дюбели отсутствуют (withDubels=0)", () => {
      expect(findMaterial(result, "Дюбель-гвозди")).toBeUndefined();
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
      const screws = findMaterial(result, "Саморезы по дереву 3,5×35");
      expect(screws).toBeDefined();
    });

    it("дюбели присутствуют (withDubels=1)", () => {
      // Engine: "Дюбели"
      const dowels = findMaterial(result, "Дюбель-гвозди 6×40");
      expect(dowels).toBeDefined();
      expect(dowels?.subtitle).toContain("газобетона");
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
      const screws = findMaterial(result, "Кровельные саморезы 4,8×35");
      expect(screws).toBeDefined();
      expect(screws?.name).toContain("EPDM");
      expect(findMaterial(result, "Магнитная торцевая насадка 8 мм")).toBeDefined();
    });

    it("каркасные саморезы отсутствуют", () => {
      expect(findMaterial(result, "Саморезы-клопы")).toBeUndefined();
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
      expect(findMaterial(result, "Кляймеры")?.subtitle).toContain("паза");
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

  describe("Регрессия: не падает при пустых/частичных данных", () => {
    it("не падает без входных данных", () => {
      expect(() => calc({})).not.toThrow();
      const r = calc({});
      expect(r.materials.length).toBeGreaterThan(0);
    });

    it("не падает с минимальными данными", () => {
      expect(() => calc({ materialType: 0 })).not.toThrow();
    });

    it("withFrameScrews=1 генерирует каркасные саморезы", () => {
      const r = calc({ materialType: 0, sheetCount: 10, withFrameScrews: 1 });
      expect(findMaterial(r, "Саморезы-клопы")).toBeDefined();
    });

    it("withDubels=1 генерирует дюбели", () => {
      const r = calc({ materialType: 0, sheetCount: 10, withDubels: 1 });
      expect(findMaterial(r, "Дюбель-гвозди")).toBeDefined();
    });

    it("поле калькулятора использует withFrameScrews, а не hasFrameScrews", () => {
      const field = fastenersDef.fields.find((f) => f.label.includes("каркаса"));
      expect(field?.key).toBe("withFrameScrews");
    });

    it("поле калькулятора использует withDubels, а не hasDowels", () => {
      const field = fastenersDef.fields.find((f) => f.label.includes("Дюбели"));
      expect(field?.key).toBe("withDubels");
    });
  });
});
