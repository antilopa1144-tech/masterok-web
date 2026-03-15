import { describe, it, expect } from "vitest";
import { foamBlocksDef } from "../formulas/foam-blocks";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = foamBlocksDef.calculate.bind(foamBlocksDef);

describe("Калькулятор пеноблоков и керамзитоблоков", () => {
  describe("Пеноблок 600×300×200, стена 10×2.7, проёмы 5 м²", () => {
    // netArea = 27 - 5 = 22 м²
    // faceArea = 0.6 × 0.3 = 0.18 м²
    // blocksNet = 22 / 0.18 ≈ 122.2
    // blocksWithReserve = ceil(122.2 × 1.05) = 129
    const result = calc({
      inputMode: 0,
      wallLength: 10,
      wallHeight: 2.7,
      openingsArea: 5,
      blockSize: 0,
      mortarType: 0,
    });

    it("блоки ≈ 137 шт (с REC ×1.06)", () => {
      const blocks = findMaterial(result, "Пеноблок 600×300×200");
      expect(blocks).toBeDefined();
      // blocksWithReserve=129, × 1.06(REC) = 136.74 → ceil = 137
      expect(blocks!.purchaseQty).toBe(137);
    });

    it("клей для кладки присутствует", () => {
      expect(findMaterial(result, "Клей для кладки")).toBeDefined();
    });

    it("арматура Ø8 для штроб", () => {
      expect(findMaterial(result, "Арматура")).toBeDefined();
    });

    it("У-блоки для перемычек", () => {
      expect(findMaterial(result, "У-блок")).toBeDefined();
    });

    it("грунтовка", () => {
      expect(findMaterial(result, "Грунтовка")).toBeDefined();
    });

    it("totals", () => {
      expect(result.totals.netArea).toBe(22);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Керамзитоблок 390×190×188 с ЦПС", () => {
    const result = calc({
      inputMode: 1,
      area: 30,
      openingsArea: 3,
      blockSize: 2,
      mortarType: 1,
    });

    it("керамзитоблоки", () => {
      const blocks = findMaterial(result, "Керамзитоблок");
      expect(blocks).toBeDefined();
      expect(blocks!.purchaseQty).toBeGreaterThan(0);
    });

    it("ЦПС вместо клея", () => {
      expect(findMaterial(result, "ЦПС")).toBeDefined();
    });

    it("кладочная сетка (для керамзита)", () => {
      expect(findMaterial(result, "Кладочная сетка")).toBeDefined();
    });

    it("предупреждение об утеплении", () => {
      expect(result.warnings.some((w) => w.includes("утепление"))).toBe(true);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Перегородочный блок → предупреждение", () => {
    const result = calc({
      inputMode: 0,
      wallLength: 5,
      wallHeight: 2.7,
      openingsArea: 1,
      blockSize: 1, // 600×300×100 перегородочный
      mortarType: 0,
    });

    it("предупреждение о ненесущих перегородках", () => {
      expect(result.warnings.some((w) => w.includes("ненесущих"))).toBe(true);
    });
  });

  describe("Пеноблок с ЦПС → предупреждение о клее", () => {
    const result = calc({
      inputMode: 1,
      area: 20,
      openingsArea: 2,
      blockSize: 0,
      mortarType: 1,
    });

    it("рекомендация клеевого раствора вместо ЦПС", () => {
      expect(result.warnings.some((w) => w.includes("клеевой"))).toBe(true);
    });
  });
});
