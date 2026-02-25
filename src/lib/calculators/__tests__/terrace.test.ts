import { describe, it, expect } from "vitest";
import { terraceDef } from "../formulas/terrace";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = terraceDef.calculate.bind(terraceDef);

describe("Калькулятор террасной доски", () => {
  describe("ДПК 150×25: 5×3 м, доска 3000 мм, шаг лаг 400 мм, без пропитки", () => {
    // area = 5 * 3 = 15
    // boardWidthMm = 150, gapMm = 5, boardPitch = 155/1000 = 0.155
    // rowCount = ceil(3 / 0.155) = ceil(19.35) = 20
    // boardsPerRow = ceil(5 / 3) = 2
    // totalBoards = 20 * 2 = 40
    // totalBoardsWithReserve = ceil(40 * 1.1) = ceil(44) = 44
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

    it("totals.boardCount = 40", () => {
      expect(result.totals.boardCount).toBe(40);
    });

    it("террасная доска 150×25: purchaseQty = 44", () => {
      const board = findMaterial(result, "Террасная доска");
      expect(board?.purchaseQty).toBe(44);
    });

    it("лаги: lagRowCount = ceil(5/0.4)+1 = 14, totalLength = 14*3*1.05 = 44.1, pcs = ceil(44.1/3) = 15", () => {
      const lagRowCount = Math.ceil(5 / 0.4) + 1; // 13 + 1 = 14
      const lagTotalLength = lagRowCount * 3 * 1.05; // 14 * 3 * 1.05 = 44.1
      const lagPcs = Math.ceil(lagTotalLength / 3); // ceil(44.1/3) = ceil(14.7) = 15
      const lag = findMaterial(result, "Лага");
      expect(lag?.purchaseQty).toBe(lagPcs);
    });

    it("totals.lagCount = ceil(5/0.4) + 1 = 14", () => {
      expect(result.totals.lagCount).toBe(14);
    });

    it("кляймеры присутствуют (ДПК имеет зазор)", () => {
      const klaymer = findMaterial(result, "Кляймер");
      expect(klaymer).toBeDefined();
      // klaymerCount = 14 * 20 = 280, withReserve = ceil(280*1.1) = ceil(308) = 308
      expect(klaymer?.purchaseQty).toBe(308);
    });

    it("саморезы нержавеющие присутствуют", () => {
      expect(findMaterial(result, "Саморез нержавеющий")).toBeDefined();
    });

    it("геотекстиль присутствует", () => {
      expect(findMaterial(result, "Геотекстиль")).toBeDefined();
    });

    it("нет пропитки для ДПК с withTreatment=0", () => {
      expect(findMaterial(result, "Масло")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Лиственница 120×28: 4×2 м, доска 4000 мм, шаг 300 мм, масло 1 слой", () => {
    // boardWidthMm = 120, gapMm = 5, boardPitch = 0.125
    // rowCount = ceil(2 / 0.125) = 16
    // boardsPerRow = ceil(4 / 4) = 1
    // totalBoards = 16, withReserve = ceil(16*1.1) = ceil(17.6) = 18
    const result = calc({
      length: 4,
      width: 2,
      boardType: 1,
      boardLength: 4000,
      lagStep: 300,
      withTreatment: 1,
    });

    it("террасная доска 120×28: purchaseQty = 18", () => {
      const board = findMaterial(result, "Террасная доска");
      expect(board?.purchaseQty).toBe(18);
    });

    it("пропитка масло присутствует (1 слой)", () => {
      const oil = findMaterial(result, "Масло");
      expect(oil).toBeDefined();
      // area=8, layers=1, liters = 8*1*0.15*1.1 = 1.32, cans = ceil(1.32/2.5) = 1
      expect(oil?.purchaseQty).toBe(1);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Сосна 90×28: 6×4 м, доска 6000 мм, шаг 400 мм, антисептик+масло 2 слоя", () => {
    // boardWidthMm = 90, gapMm = 5, boardPitch = 0.095
    // rowCount = ceil(4 / 0.095) = ceil(42.1) = 43
    // boardsPerRow = ceil(6 / 6) = 1
    // totalBoards = 43, withReserve = ceil(43*1.1) = ceil(47.3) = 48
    const result = calc({
      length: 6,
      width: 4,
      boardType: 2,
      boardLength: 6000,
      lagStep: 400,
      withTreatment: 2,
    });

    it("доска 90 мм: purchaseQty = 48", () => {
      const board = findMaterial(result, "Террасная доска");
      expect(board?.purchaseQty).toBe(48);
    });

    it("пропитка 2 слоя: area=24, liters = 24*2*0.15*1.1 = 7.92, cans = ceil(7.92/2.5) = 4", () => {
      const oil = findMaterial(result, "Масло");
      expect(oil).toBeDefined();
      expect(oil?.purchaseQty).toBe(4);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Планкен 120×20: без зазора", () => {
    // boardWidthMm = 120, gapMm = 0, boardPitch = 0.12
    const result = calc({
      length: 5,
      width: 3,
      boardType: 3,
      boardLength: 3000,
      lagStep: 400,
      withTreatment: 1,
    });

    it("нет кляймеров (gapMm = 0)", () => {
      expect(findMaterial(result, "Кляймер")).toBeUndefined();
    });

    it("саморезов больше для планкена: 2 на пересечение", () => {
      const lagRowCount = Math.ceil(5 / 0.4) + 1; // 14
      const rowCount = Math.ceil(3 / 0.12); // 25
      // screwCount = lagRowCount * rowCount * 2 = 14 * 25 * 2 = 700
      const screws = findMaterial(result, "Саморез нержавеющий");
      expect(screws).toBeDefined();
      // packs = ceil(700/200) = 4
      expect(screws?.purchaseQty).toBe(4);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Предупреждения", () => {
    it("ДПК + шаг лаг > 400 → предупреждение", () => {
      const result = calc({ length: 5, width: 3, boardType: 0, boardLength: 3000, lagStep: 500, withTreatment: 0 });
      expect(result.warnings.some((w) => w.includes("400 мм"))).toBe(true);
    });

    it("натуральная древесина без пропитки → предупреждение", () => {
      const result = calc({ length: 5, width: 3, boardType: 1, boardLength: 3000, lagStep: 400, withTreatment: 0 });
      expect(result.warnings.some((w) => w.includes("пропитки"))).toBe(true);
    });

    it("площадь > 50 м² → предупреждение о деформационном зазоре", () => {
      const result = calc({ length: 10, width: 6, boardType: 0, boardLength: 3000, lagStep: 400, withTreatment: 0 });
      expect(result.warnings.some((w) => w.includes("деформационный зазор"))).toBe(true);
    });

    it("ДПК без пропитки, нормальная площадь — нет предупреждений", () => {
      const result = calc({ length: 5, width: 3, boardType: 0, boardLength: 3000, lagStep: 400, withTreatment: 0 });
      expect(result.warnings.length).toBe(0);
    });
  });
});
