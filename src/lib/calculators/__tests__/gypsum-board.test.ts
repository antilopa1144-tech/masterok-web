import { describe, it, expect } from "vitest";
import { gypsumBoardDef } from "../formulas/gypsum-board";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(gypsumBoardDef.calculate.bind(gypsumBoardDef));

describe("Калькулятор гипсокартона", () => {
  describe("Обшивка стены (constructionType=0), 40 м², 1 слой, шаг 600", () => {
    const result = calc({
      area: 40,
      constructionType: 0,
      layers: 1,
      gklType: 0,
      profileStep: 600,
    });

    it("ГКЛ стандартный присутствует", () => {
      // Engine: "ГКЛ стандартный"
      const gkl = findMaterial(result, "ГКЛ стандартный");
      expect(gkl).toBeDefined();
    });

    it("Профиль ПП 60×27 3м присутствует", () => {
      // Engine: "Профиль ПП 60×27 3м"
      expect(findMaterial(result, "ПП 60×27")).toBeDefined();
    });

    it("Профиль ПН 27×28 3м присутствует", () => {
      // Engine: "Профиль ПН 27×28 3м"
      expect(findMaterial(result, "ПН 27×28")).toBeDefined();
    });

    it("саморезы для ГКЛ присутствуют", () => {
      // Engine: "Саморезы для ГКЛ"
      expect(findMaterial(result, "Саморезы для ГКЛ")).toBeDefined();
    });

    it("дюбели присутствуют", () => {
      // Engine: "Дюбели"
      expect(findMaterial(result, "Дюбели")).toBeDefined();
    });

    it("серпянка присутствует", () => {
      // Engine: "Серпянка"
      expect(findMaterial(result, "Серпянка")).toBeDefined();
    });

    it("шпаклёвка 25 кг присутствует", () => {
      // Engine: "Шпаклёвка 25 кг"
      expect(findMaterial(result, "Шпаклёвка")).toBeDefined();
    });

    it("грунтовка 10 л присутствует", () => {
      // Engine: "Грунтовка 10 л"
      expect(findMaterial(result, "Грунтовка")).toBeDefined();
    });

    it("totals.area = 40", () => {
      expect(result.totals.area).toBe(40);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Перегородка (constructionType=1), 40 м², 1 слой", () => {
    const result = calc({
      area: 40,
      constructionType: 1,
      layers: 1,
      gklType: 0,
      profileStep: 600,
    });

    it("totalSheets = sheetsOneSide * 2 (обе стороны)", () => {
      // Engine: sides=2
      expect(result.totals.sides).toBe(2);
      expect(result.totals.totalSheets).toBe(result.totals.sheetsOneSide * 2);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Потолок (constructionType=2), 15 м², 1 слой", () => {
    const result = calc({
      area: 15,
      constructionType: 2,
      layers: 1,
      gklType: 0,
      profileStep: 600,
    });

    it("ГКЛ листы для потолка", () => {
      const gkl = findMaterial(result, "ГКЛ");
      expect(gkl).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("2 слоя ГКЛ → предупреждение", () => {
    const result = calc({
      area: 10,
      constructionType: 0,
      layers: 2,
      gklType: 0,
      profileStep: 600,
    });

    it("предупреждение о смещении швов", () => {
      // Engine: "Второй слой ГКЛ монтируется со смещением швов"
      expect(result.warnings.some((w) => w.includes("смещением швов"))).toBe(true);
    });
  });

  describe("ГКЛВ влагостойкий (gklType=1)", () => {
    const result = calc({
      area: 10,
      constructionType: 0,
      layers: 1,
      gklType: 1,
      profileStep: 600,
    });

    it("название содержит ГКЛВ", () => {
      // Engine: "ГКЛВ влагостойкий"
      expect(findMaterial(result, "ГКЛВ")).toBeDefined();
    });
  });

  describe("ГКЛО огнестойкий (gklType=2)", () => {
    const result = calc({
      area: 10,
      constructionType: 0,
      layers: 1,
      gklType: 2,
      profileStep: 600,
    });

    it("название содержит ГКЛО", () => {
      // Engine: "ГКЛО огнестойкий"
      expect(findMaterial(result, "ГКЛО")).toBeDefined();
    });
  });

  describe("Большая площадь → предупреждение", () => {
    it("профессиональный монтаж", () => {
      const r = calc({ area: 250, constructionType: 0, layers: 1, gklType: 0, profileStep: 600 });
      // Engine: "Большая площадь — рекомендуется профессиональный монтаж"
      expect(r.warnings.some(w => w.includes("профессиональный монтаж"))).toBe(true);
    });
  });
});
