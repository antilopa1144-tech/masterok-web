import { describe, it, expect } from "vitest";
import { bathroomDef } from "../formulas/bathroom";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = bathroomDef.calculate.bind(bathroomDef);

describe("Калькулятор ванной комнаты", () => {
  describe("Стандартная ванная 2.5×1.7, h=2.5, плитка 300×300/250×400", () => {
    // floorArea = 2.5 × 1.7 = 4.25 м²
    // perimeter = 2 × (2.5 + 1.7) = 8.4 м
    // wallArea = 8.4 × 2.5 − 0.7 × 2.1 = 21 − 1.47 = 19.53 м²
    const result = calc({
      length: 2.5,
      width: 1.7,
      height: 2.5,
      floorTileSize: 0, // 300×300
      wallTileSize: 1, // 250×400
      hasWaterproofing: 1,
      doorWidth: 0.7,
    });

    it("напольная плитка 300×300 → 52 шт (запас 10%)", () => {
      // 4.25 / (0.3×0.3) × 1.10 = 47.222 × 1.10 = 51.944 → ceil = 52
      const tile = findMaterial(result, "напольная");
      expect(tile).toBeDefined();
      expect(tile!.purchaseQty).toBe(52);
    });

    it("настенная плитка 250×400 → 215 шт (запас 10%)", () => {
      // 19.53 / (0.25×0.4) × 1.10 = 195.3 × 1.10 = 214.83 → ceil = 215
      const tile = findMaterial(result, "настенная");
      expect(tile).toBeDefined();
      expect(tile!.purchaseQty).toBe(215);
    });

    it("клей для пола → 1 мешок 25 кг", () => {
      // 4.25 × 5 = 21.25 кг → ceil(21.25/25) = 1
      const adhesive = findMaterial(result, "Клей плиточный для пола");
      expect(adhesive).toBeDefined();
      expect(adhesive!.purchaseQty).toBe(1);
    });

    it("клей для стен → 3 мешка 25 кг", () => {
      // 19.53 × 3.5 = 68.355 кг → ceil(68.355/25) = 3
      const adhesive = findMaterial(result, "Клей плиточный для стен");
      expect(adhesive).toBeDefined();
      expect(adhesive!.purchaseQty).toBe(3);
    });

    it("затирка → 6 мешков 2 кг", () => {
      // (4.25 + 19.53) × 0.5 = 11.89 кг → ceil(11.89/2) = 6
      const grout = findMaterial(result, "Затирка");
      expect(grout).toBeDefined();
      expect(grout!.purchaseQty).toBe(6);
    });

    it("гидроизоляция обмазочная → 3 ведра 4 кг", () => {
      // (4.25 + 8.4×0.2) × 1.5 = 5.93 × 1.5 = 8.895 кг → ceil(8.895/4) = 3
      const wp = findMaterial(result, "Гидроизоляция обмазочная");
      expect(wp).toBeDefined();
      expect(wp!.purchaseQty).toBe(3);
    });

    it("лента гидроизоляционная → 1 рулон 10 м", () => {
      // 8.4 + 1.2 = 9.6 м → ceil(9.6/10) = 1
      const tape = findMaterial(result, "Лента гидроизоляционная");
      expect(tape).toBeDefined();
      expect(tape!.purchaseQty).toBe(1);
    });

    it("грунтовка → 1 канистра 5 л", () => {
      // (4.25 + 19.53) × 0.2 = 4.756 л → ceil(4.756/5) = 1
      const primer = findMaterial(result, "Грунтовка");
      expect(primer).toBeDefined();
      expect(primer!.purchaseQty).toBe(1);
    });

    it("герметик силиконовый → 3 тубы", () => {
      // ceil(8.4 / 3) = 3
      const sealant = findMaterial(result, "Герметик");
      expect(sealant).toBeDefined();
      expect(sealant!.purchaseQty).toBe(3);
    });

    it("totals содержат площадь пола, стен и периметр", () => {
      expect(result.totals.floorArea).toBeCloseTo(4.25, 2);
      expect(result.totals.wallArea).toBeCloseTo(19.53, 2);
      expect(result.totals.perimeter).toBeCloseTo(8.4, 2);
    });

    it("инварианты — все материалы корректны", () => {
      checkInvariants(result);
    });
  });

  describe("Без гидроизоляции → предупреждение", () => {
    const result = calc({
      length: 2.5,
      width: 1.7,
      height: 2.5,
      floorTileSize: 0,
      wallTileSize: 0,
      hasWaterproofing: 0,
      doorWidth: 0.7,
    });

    it("предупреждение о СП 29.13330", () => {
      expect(result.warnings.some((w) => w.includes("СП 29.13330"))).toBe(true);
    });

    it("гидроизоляция отсутствует в материалах", () => {
      expect(findMaterial(result, "Гидроизоляция")).toBeUndefined();
      expect(findMaterial(result, "Лента гидроизоляционная")).toBeUndefined();
    });

    it("остальные материалы на месте", () => {
      expect(findMaterial(result, "напольная")).toBeDefined();
      expect(findMaterial(result, "настенная")).toBeDefined();
      expect(findMaterial(result, "Клей")).toBeDefined();
      expect(findMaterial(result, "Затирка")).toBeDefined();
      expect(findMaterial(result, "Грунтовка")).toBeDefined();
      checkInvariants(result);
    });
  });

  describe("Маленькая ванная 1.2×1.0 → предупреждение", () => {
    const result = calc({
      length: 1.2,
      width: 1.0,
      height: 2.5,
      floorTileSize: 0,
      wallTileSize: 0,
      hasWaterproofing: 1,
      doorWidth: 0.6,
    });

    it("предупреждение о маленькой площади", () => {
      // floorArea = 1.2 × 1.0 = 1.2 < 2
      expect(result.warnings.some((w) => w.includes("Маленькая площадь"))).toBe(true);
    });

    it("расчёт выполняется без ошибок", () => {
      checkInvariants(result);
    });
  });
});
