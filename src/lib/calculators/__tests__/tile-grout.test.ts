import { describe, it, expect } from "vitest";
import { tileGroutDef } from "../formulas/tile-grout";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(tileGroutDef.calculate.bind(tileGroutDef));

describe("Затирка для плитки", () => {
  describe("Цементная затирка (groutType=0)", () => {
    it("20 м², плитка 300x300, шов 3 мм, толщина 8 мм, уп. 2 кг", () => {
      const r = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 0, bagSize: 2 });
      checkInvariants(r);
      // Engine: "Затирка цементная 2кг"
      const grout = findMaterial(r, "Затирка цементная");
      expect(grout).toBeDefined();
    });

    it("большая площадь 100 м², уп. 5 кг", () => {
      const r = calc({ area: 100, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 0, bagSize: 5 });
      checkInvariants(r);
      expect(findMaterial(r, "Затирка цементная")).toBeDefined();
    });
  });

  describe("Эпоксидная затирка (groutType=1)", () => {
    it("плотность 1400 кг/м³", () => {
      const r = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 1, bagSize: 2 });
      checkInvariants(r);
      // Engine: "Затирка эпоксидная 2кг"
      expect(findMaterial(r, "эпоксидная")).toBeDefined();
    });

    it("предупреждение о быстром нанесении", () => {
      const r = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 1, bagSize: 2 });
      // Engine: "Эпоксидная затирка требует быстрого нанесения — готовьте небольшими порциями"
      expect(r.warnings.some(w => w.includes("быстрого нанесения"))).toBe(true);
    });
  });

  describe("Полиуретановая затирка (groutType=2)", () => {
    it("плотность 1200 кг/м³", () => {
      const r = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 2, bagSize: 2 });
      checkInvariants(r);
      // Engine: "Затирка полиуретановая 2кг"
      expect(findMaterial(r, "полиуретановая")).toBeDefined();
    });
  });

  describe("Размер плитки", () => {
    it("крупноформат 600x1200 — меньше швов → меньше затирки", () => {
      const r = calc({ area: 20, tileWidth: 600, tileHeight: 1200, tileThickness: 8, jointWidth: 3, groutType: 0, bagSize: 2 });
      const rSmall = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 0, bagSize: 2 });
      expect(r.totals.totalKg).toBeLessThan(rSmall.totals.totalKg);
    });
  });

  describe("Широкие швы → предупреждение", () => {
    it("jointWidth >= 10 → крупнозернистая затирка", () => {
      const r = calc({ area: 20, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 10, groutType: 0, bagSize: 2 });
      // Engine: "Широкие швы — рекомендуется крупнозернистая затирка"
      expect(r.warnings.some(w => w.includes("крупнозернистая"))).toBe(true);
    });
  });

  describe("Граничные условия", () => {
    it("минимальная площадь 1 м²", () => {
      const r = calc({ area: 0.5, tileWidth: 300, tileHeight: 300, tileThickness: 8, jointWidth: 3, groutType: 0, bagSize: 1 });
      checkInvariants(r);
      // area clamped to 1
      expect(r.totals.area).toBe(1);
    });
  });
});
