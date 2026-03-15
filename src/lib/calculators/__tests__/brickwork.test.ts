import { describe, it, expect } from "vitest";
import { brickworkDef } from "../formulas/brickwork";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = brickworkDef.calculate.bind(brickworkDef);

describe("Калькулятор кладки кирпича", () => {
  describe("Одинарный кирпич, в кирпич (250 мм), 10×2.7 м, проёмы 5 м²", () => {
    // netArea = 22 м²
    // bricksPerSqm = 102 (одинарный, в кирпич, шов 10мм)
    // totalBricks = 22 × 102 = 2244
    // bricksWithReserve = ceil(2244 × 1.05) = 2357
    const result = calc({
      inputMode: 0,
      wallLength: 10,
      wallHeight: 2.7,
      openingsArea: 5,
      brickFormat: 0,
      wallThickness: 1,
      mortarJoint: 10,
    });

    it("кирпич ≈ 2499 шт (с запасом + REC ×1.06)", () => {
      const bricks = findMaterial(result, "Кирпич одинарный");
      expect(bricks).toBeDefined();
      // totalBricks=2244, ×1.05=2357 (withReserve), ×1.06(REC)=2498.42 → ceil=2499
      expect(bricks!.purchaseQty).toBe(2499);
    });

    it("поддоны кирпича", () => {
      const pallets = findMaterial(result, "Поддоны");
      expect(pallets).toBeDefined();
      // 2357 / 480 = 4.91 → 5 поддонов
      expect(pallets!.purchaseQty).toBe(5);
    });

    it("раствор кладочный", () => {
      expect(findMaterial(result, "Раствор кладочный")).toBeDefined();
    });

    it("кладочная сетка", () => {
      expect(findMaterial(result, "Кладочная сетка")).toBeDefined();
    });

    it("перемычки", () => {
      expect(findMaterial(result, "Перемычки")).toBeDefined();
    });

    it("totals", () => {
      expect(result.totals.netArea).toBe(22);
      expect(result.totals.bricksWithReserve).toBe(2357);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Полуторный кирпич, в полкирпича", () => {
    const result = calc({
      inputMode: 1,
      area: 15,
      openingsArea: 2,
      brickFormat: 1,
      wallThickness: 0,
      mortarJoint: 10,
    });

    it("полуторный кирпич", () => {
      const bricks = findMaterial(result, "полуторный");
      expect(bricks).toBeDefined();
      // netArea = 13, 13 × 39 = 507, × 1.05 = 533, × 1.06(REC) = 564.98 → ceil = 565
      expect(bricks!.purchaseQty).toBe(565);
    });

    it("предупреждение о ненесущих перегородках", () => {
      expect(result.warnings.some((w) => w.includes("ненесущих"))).toBe(true);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Двойной кирпич, в 1.5 кирпича", () => {
    const result = calc({
      inputMode: 0,
      wallLength: 8,
      wallHeight: 3,
      openingsArea: 4,
      brickFormat: 2,
      wallThickness: 2,
      mortarJoint: 12,
    });

    it("двойной кирпич рассчитан", () => {
      const bricks = findMaterial(result, "двойной");
      expect(bricks).toBeDefined();
      expect(bricks!.purchaseQty).toBeGreaterThan(0);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Без проёмов → перемычек 0 шт", () => {
    const result = calc({
      inputMode: 0,
      wallLength: 5,
      wallHeight: 2.7,
      openingsArea: 0,
      brickFormat: 0,
      wallThickness: 1,
      mortarJoint: 10,
    });

    it("перемычек 0 шт", () => {
      const lintels = findMaterial(result, "Перемычки");
      expect(lintels).toBeDefined();
      expect(lintels!.purchaseQty).toBe(0);
    });
  });
});
