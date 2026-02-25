import { describe, it, expect } from "vitest";
import { wallpaperDef } from "../formulas/wallpaper";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = wallpaperDef.calculate.bind(wallpaperDef);

describe("Калькулятор обоев", () => {
  describe("Стандартный расчёт: периметр 14 м, высота 2.7, рулон 10×0.53 м, без раппорта, 1 дверь, 1 окно", () => {
    // wallArea = 14 * 2.7 = 37.8
    // stripHeight = 2.7 (rapport = 0)
    // stripsPerRoll = floor(10/2.7) = 3
    // openingsArea = 1.71 + 1.68 = 3.39
    // netArea = 37.8 - 3.39 = 34.41
    // totalStrips = ceil(34.41 / (0.53 * 2.7)) = ceil(34.41 / 1.431) = ceil(24.04) = 25
    // rolls = ceil(25/3) + 1 = 9 + 1 = 10
    const result = calc({
      perimeter: 14,
      height: 2.7,
      rollLength: 10,
      rollWidth: 530,
      rapport: 0,
      doors: 1,
      windows: 1,
    });

    it("площадь стен = 37.8 м²", () => {
      expect(result.totals.wallArea).toBeCloseTo(37.8, 1);
    });

    it("чистая площадь = 34.41 м²", () => {
      expect(result.totals.netArea).toBeCloseTo(34.41, 1);
    });

    it("рулонов = 10", () => {
      const wallpaper = findMaterial(result, "Обои");
      expect(wallpaper?.purchaseQty).toBe(10);
    });

    it("клей обойный присутствует", () => {
      expect(findMaterial(result, "Клей")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Без проёмов: только стены", () => {
    // wallArea = 14*2.7 = 37.8, netArea = 37.8
    // totalStrips = ceil(37.8 / 1.431) = ceil(26.41) = 27
    // rolls = ceil(27/3) + 1 = 9+1 = 10
    const result = calc({
      perimeter: 14,
      height: 2.7,
      rollLength: 10,
      rollWidth: 530,
      rapport: 0,
      doors: 0,
      windows: 0,
    });

    it("нет проёмов → рулонов >= 10", () => {
      expect(result.totals.rollsNeeded).toBeGreaterThanOrEqual(10);
    });
  });

  describe("Большой раппорт → предупреждение", () => {
    it("раппорт > 32 см → предупреждение", () => {
      const result = calc({
        perimeter: 14,
        height: 2.7,
        rollLength: 10,
        rollWidth: 530,
        rapport: 40,
        doors: 1,
        windows: 1,
      });
      expect(result.warnings.some((w) => w.includes("раппорт"))).toBe(true);
    });
  });

  describe("Широкие обои 1060 мм → предупреждение", () => {
    it("ширина рулона > 700 мм → предупреждение о сложности", () => {
      const result = calc({
        perimeter: 14,
        height: 2.7,
        rollLength: 10,
        rollWidth: 1060,
        rapport: 0,
        doors: 1,
        windows: 1,
      });
      expect(result.warnings.some((w) => w.includes("Широкие"))).toBe(true);
    });
  });
});
