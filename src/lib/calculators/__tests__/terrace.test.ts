import { describe, it, expect } from "vitest";
import { terraceDef } from "../formulas/terrace";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = terraceDef.calculate.bind(terraceDef);

describe("Калькулятор террасной доски", () => {
  describe("ДПК 150 мм: 5×3 м, доска 3000 мм, шаг лаг 400 мм, без обработки", () => {
    // area = 5 * 3 = 15
    // boardWidth = 150, gap = 5, boardPitch = 155/1000 = 0.155
    // rowCount = ceil(3 / 0.155) = ceil(19.35) = 20
    // boardsPerRow = ceil(5 / 3) = 2
    // totalBoards = ceil(20 * 2 * 1.1) = ceil(44) = 44
    const result = calc({
      length: 5,
      width: 3,
      boardType: 0,
      boardLength: 3000,
      lagStep: 400,
      withTreatment: 0,
    });

    it("totals.area = 15", () => {
      expect(result.totals.area).toBeCloseTo(15, 2);
    });

    it("totals.totalBoards = 44", () => {
      // Engine: totals.totalBoards
      expect(result.totals.totalBoards).toBe(44);
    });

    it("ДПК 150 мм (3000 мм): purchaseQty from recScenario", () => {
      // Engine: "ДПК 150 мм (3000 мм)" — quantity = recScenario.exact_need
      const board = findMaterial(result, "ДПК 150 мм");
      expect(board).toBeDefined();
      // purchaseQty = ceil(recScenario.exact_need) which includes scenario multiplier
      expect(board!.purchaseQty).toBeGreaterThanOrEqual(44);
    });

    it("лаги 50×50 мм присутствуют", () => {
      // Engine: "Лаги 50×50 мм (3 м)"
      const lag = findMaterial(result, "Лаги");
      expect(lag).toBeDefined();
      // lagRowCount = ceil(5/0.4)+1 = 14, lagTotalLen = 14*3*1.05 = 44.1, lagPcs = ceil(44.1/3) = 15
      expect(lag?.purchaseQty).toBe(15);
    });

    it("totals.lagRowCount = 14", () => {
      expect(result.totals.lagRowCount).toBe(14);
    });

    it("кляймеры присутствуют", () => {
      // Engine: "Кляймеры"
      const klaymer = findMaterial(result, "Кляймеры");
      expect(klaymer).toBeDefined();
      // klaymerCount = lagRowCount * rowCount = 14 * 20 = 280
      expect(klaymer?.purchaseQty).toBe(280);
    });

    it("саморезы присутствуют", () => {
      // Engine: "Саморезы"
      expect(findMaterial(result, "Саморезы")).toBeDefined();
    });

    it("геотекстиль присутствует", () => {
      // Engine: "Геотекстиль (50 м²)"
      expect(findMaterial(result, "Геотекстиль")).toBeDefined();
    });

    it("нет обработки для ДПК с withTreatment=0", () => {
      expect(findMaterial(result, "Масло")).toBeUndefined();
      expect(findMaterial(result, "Антисептик")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Лиственница 120 мм: 4×2 м, доска 4000 мм, шаг 300 мм, масло", () => {
    // boardWidth = 120, gap = 5, boardPitch = 0.125
    // rowCount = ceil(2 / 0.125) = 16
    // boardsPerRow = ceil(4 / 4) = 1
    // totalBoards = ceil(16*1*1.1) = ceil(17.6) = 18
    const result = calc({
      length: 4,
      width: 2,
      boardType: 1,
      boardLength: 4000,
      lagStep: 300,
      withTreatment: 1,
    });

    it("лиственница 120 мм (4000 мм) присутствует", () => {
      // Engine: "Лиственница 120 мм (4000 мм)"
      const board = findMaterial(result, "Лиственница 120 мм");
      expect(board).toBeDefined();
    });

    it("масло для дерева присутствует", () => {
      // Engine: "Масло для дерева"
      const oil = findMaterial(result, "Масло для дерева");
      expect(oil).toBeDefined();
      // treatmentL = roundDisplay(8 * 2 * 0.15 * 1.1, 2) = 2.64
      // purchaseQty = ceil(2.64) = 3
      expect(oil?.purchaseQty).toBe(3);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Сосна 90 мм: 6×4 м, доска 6000 мм, шаг 400 мм, антисептик", () => {
    // boardWidth = 90, gap = 5, boardPitch = 0.095
    // rowCount = ceil(4 / 0.095) = ceil(42.1) = 43
    // boardsPerRow = ceil(6 / 6) = 1
    // totalBoards = ceil(43*1*1.1) = ceil(47.3) = 48
    const result = calc({
      length: 6,
      width: 4,
      boardType: 2,
      boardLength: 6000,
      lagStep: 400,
      withTreatment: 2,
    });

    it("доска 90 мм: totalBoards = 48", () => {
      expect(result.totals.totalBoards).toBe(48);
    });

    it("антисептик для дерева присутствует", () => {
      // Engine: "Антисептик для дерева"
      const oil = findMaterial(result, "Антисептик для дерева");
      expect(oil).toBeDefined();
      // treatmentL = roundDisplay(24 * 2 * 0.15 * 1.1, 2) = 7.92
      // purchaseQty = ceil(7.92) = 8
      expect(oil?.purchaseQty).toBe(8);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Планкен 120 мм: без зазора", () => {
    // boardWidth = 120, gap = 0, boardPitch = 0.12
    const result = calc({
      length: 5,
      width: 3,
      boardType: 3,
      boardLength: 3000,
      lagStep: 400,
      withTreatment: 1,
    });

    it("планкен 120 мм присутствует", () => {
      // Engine: "Планкен 120 мм (3000 мм)"
      expect(findMaterial(result, "Планкен 120 мм")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Предупреждения", () => {
    it("натуральная древесина без обработки → предупреждение", () => {
      const result = calc({ length: 5, width: 3, boardType: 1, boardLength: 3000, lagStep: 400, withTreatment: 0 });
      // Engine: "Деревянная доска без обработки подвержена гниению — рекомендуется масло или антисептик"
      expect(result.warnings.some((w) => w.includes("гниению"))).toBe(true);
    });

    it("площадь > 50 м² → предупреждение о профессиональном монтаже", () => {
      const result = calc({ length: 10, width: 6, boardType: 0, boardLength: 3000, lagStep: 400, withTreatment: 0 });
      // Engine: "Для террас большой площади рекомендуется профессиональный монтаж"
      expect(result.warnings.some((w) => w.includes("профессиональный монтаж"))).toBe(true);
    });

    it("ДПК без обработки, нормальная площадь — нет предупреждений", () => {
      const result = calc({ length: 5, width: 3, boardType: 0, boardLength: 3000, lagStep: 400, withTreatment: 0 });
      expect(result.warnings.length).toBe(0);
    });
  });
});
