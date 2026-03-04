import { describe, it, expect } from "vitest";
import { stripFoundationDef } from "../formulas/strip-foundation";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = stripFoundationDef.calculate.bind(stripFoundationDef);

describe("Калькулятор ленточного фундамента", () => {
  describe("Периметр 40 м, ширина 400 мм, глубина 700 мм, цоколь 300 мм, 4 нитки Ø12", () => {
    // widthM = 0.4, totalHeightM = 1.0
    // volume = 40 * 0.4 * 1.0 = 16
    // volumeWithReserve = 16.8
    // cementKg = 16.8 * 290 = 4872, cementBags = ceil(4872/50) = 98
    // longitudinalLength = 40 * 4 * 1.05 = 168
    const result = calc({
      perimeter: 40,
      width: 400,
      depth: 700,
      aboveGround: 300,
      reinforcement: 1,
    });

    it("объём бетона = 16 м³", () => {
      expect(result.totals.volume).toBeCloseTo(16, 2);
    });

    it("бетон М250 присутствует", () => {
      expect(findMaterial(result, "Бетон М250")).toBeDefined();
    });

    it("объём с запасом: purchaseQty ≈ 17.2 м³", () => {
      const concrete = findMaterial(result, "Бетон М250");
      // 16 * 1.07 = 17.12 -> Math.ceil(17.12 * 10) / 10 = 17.2
      expect(concrete?.purchaseQty).toBeCloseTo(17.2, 1);
    });

    it("арматура рабочая = 179.2 м.п. (purchaseQty >= 179)", () => {
      const rebar = findMaterial(result, "рабочая");
      // 40 * 4 * 1.12 = 179.2
      expect(rebar?.purchaseQty).toBeGreaterThanOrEqual(179);
    });

    it("арматура хомуты присутствует", () => {
      expect(findMaterial(result, "хомуты")).toBeDefined();
    });

    it("вязальная проволока присутствует", () => {
      expect(findMaterial(result, "проволока")).toBeDefined();
    });

    it("доски опалубки присутствуют", () => {
      expect(findMaterial(result, "опалубки")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Предупреждения", () => {
    it("глубина < 600 мм + периметр > 30 м → предупреждение о промерзании", () => {
      const result = calc({
        perimeter: 40,
        width: 400,
        depth: 500,
        aboveGround: 300,
        reinforcement: 1,
      });
      expect(result.warnings.some((w) => w.includes("промерзания"))).toBe(true);
    });

    it("ширина < 300 мм → предупреждение", () => {
      const result = calc({
        perimeter: 40,
        width: 200,
        depth: 700,
        aboveGround: 300,
        reinforcement: 0,
      });
      expect(result.warnings.some((w) => w.includes("300 мм"))).toBe(true);
    });
  });

  describe("2 нитки Ø12 (лёгкие постройки)", () => {
    const result = calc({
      perimeter: 40,
      width: 400,
      depth: 700,
      aboveGround: 300,
      reinforcement: 0,
    });

    it("рабочая арматура = 40 * 2 * 1.12 = 89.6 м.п.", () => {
      const rebar = findMaterial(result, "рабочая");
      expect(rebar?.purchaseQty).toBeGreaterThanOrEqual(89);
    });
  });
});
