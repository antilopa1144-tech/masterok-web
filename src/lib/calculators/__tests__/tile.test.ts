import { describe, it, expect } from "vitest";
import { tileDef } from "../formulas/tile";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = tileDef.calculate.bind(tileDef);

describe("Калькулятор плитки", () => {
  describe("По размерам: 4×3 м, плитка 300×300, прямая укладка, шов 2 мм", () => {
    // area = 12, tileW=0.3, tileH=0.3, jointW=0.002
    // tileArea = (0.302)*(0.302) = 0.091204
    // tilesExact = 12/0.091204 ≈ 131.57
    // tilesWithWaste = ceil(131.57 * 1.05) = ceil(138.15) = 139
    const result = calc({
      inputMode: 0,
      length: 4,
      width: 3,
      tileWidth: 300,
      tileHeight: 300,
      layingMethod: 0,
      jointWidth: 2,
    });

    it("площадь в totals = 12 м²", () => {
      expect(result.totals.area).toBe(12);
    });

    it("процент отходов = 5%", () => {
      expect(result.totals.wastePercent).toBeCloseTo(5, 1);
    });

    it("плитки 139 шт", () => {
      const tile = findMaterial(result, "Плитка 300×300");
      expect(tile?.purchaseQty).toBe(139);
    });

    it("плиточный клей в мешках", () => {
      expect(findMaterial(result, "Плиточный клей")).toBeDefined();
    });

    it("затирка в мешках", () => {
      expect(findMaterial(result, "Затирка")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Диагональная укладка: +15% отходов", () => {
    const result = calc({
      inputMode: 1,
      area: 12,
      tileWidth: 300,
      tileHeight: 300,
      layingMethod: 1,
      jointWidth: 2,
    });

    it("процент отходов = 15%", () => {
      expect(result.totals.wastePercent).toBeCloseTo(15, 1);
    });

    it("предупреждение о диагональной укладке", () => {
      expect(result.warnings.some((w) => w.includes("Диагональная"))).toBe(true);
    });

    it("плитки > 130 шт (больше чем при прямой)", () => {
      const tile = findMaterial(result, "Плитка");
      expect(tile?.purchaseQty).toBeGreaterThan(130);
    });
  });

  describe("Крупная плитка ≥ 300 мм — система выравнивания СВП", () => {
    it("СВП присутствует при плитке 600×600", () => {
      const result = calc({
        inputMode: 1,
        area: 10,
        tileWidth: 600,
        tileHeight: 600,
        layingMethod: 0,
        jointWidth: 2,
      });
      expect(findMaterial(result, "СВП")).toBeDefined();
    });

    it("СВП отсутствует при маленькой плитке 100×100", () => {
      const result = calc({
        inputMode: 1,
        area: 10,
        tileWidth: 100,
        tileHeight: 100,
        layingMethod: 0,
        jointWidth: 2,
      });
      expect(findMaterial(result, "СВП")).toBeUndefined();
    });
  });

  describe("Предупреждение при < 5 плиток", () => {
    it("< 5 плиток → предупреждение (крупная плитка 600×600 на 1 м²)", () => {
      // area clamped to max(1, input) = 1 m²
      // tileArea = (0.602)^2 ≈ 0.362 m², tilesExact = 1/0.362 ≈ 2.76 < 5 → warning
      const result = calc({
        inputMode: 1,
        area: 1,
        tileWidth: 600,
        tileHeight: 600,
        layingMethod: 0,
        jointWidth: 2,
      });
      expect(result.warnings.some((w) => w.includes("5 плиток"))).toBe(true);
    });
  });
});
