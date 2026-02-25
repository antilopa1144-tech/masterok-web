import { describe, it, expect } from "vitest";
import { facadeBrickDef } from "../formulas/facade-brick";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = facadeBrickDef.calculate.bind(facadeBrickDef);

describe("Облицовочный кирпич", () => {
  describe("Одинарный кирпич 250×65, шов 10 мм, 80 м²", () => {
    it("bricksPerM2 ≈ 51 (округление), totalBricks = 80 * bricksPerM2", () => {
      const r = calc({ area: 80, brickType: 0, jointThickness: 10, withTie: 1 });
      checkInvariants(r);
      // l = (250+10)/1000 = 0.26, h = (65+10)/1000 = 0.075
      // bricksPerM2 = 1/(0.26*0.075) = 1/0.0195 ≈ 51.28
      const bricksPerM2 = 1 / ((260 / 1000) * (75 / 1000));
      expect(r.totals.bricksPerM2).toBe(Math.round(bricksPerM2));
      const totalBricks = 80 * bricksPerM2;
      expect(r.totals.totalBricks).toBeCloseTo(totalBricks, 5);
    });

    it("кирпич с запасом 10%, purchaseQty = ceil(total * 1.10)", () => {
      const r = calc({ area: 80, brickType: 0, jointThickness: 10, withTie: 1 });
      const bricksPerM2 = 1 / (0.26 * 0.075);
      const totalBricks = 80 * bricksPerM2;
      const expected = Math.ceil(totalBricks * 1.10);
      const brick = findMaterial(r, "Одинарный кирпич");
      expect(brick).toBeDefined();
      expect(brick!.purchaseQty).toBe(expected);
    });
  });

  describe("Полуторный кирпич 250×88, шов 10 мм", () => {
    it("bricksPerM2 ≈ 38", () => {
      const r = calc({ area: 80, brickType: 1, jointThickness: 10, withTie: 1 });
      checkInvariants(r);
      // l = 260/1000 = 0.26, h = 98/1000 = 0.098
      const bricksPerM2 = 1 / (0.26 * 0.098);
      expect(r.totals.bricksPerM2).toBe(Math.round(bricksPerM2));
      const brick = findMaterial(r, "Полуторный кирпич");
      expect(brick).toBeDefined();
    });
  });

  describe("Двойной кирпич 250×138, шов 10 мм", () => {
    it("bricksPerM2 ≈ 26", () => {
      const r = calc({ area: 80, brickType: 2, jointThickness: 10, withTie: 1 });
      checkInvariants(r);
      const bricksPerM2 = 1 / (0.26 * 0.148);
      expect(r.totals.bricksPerM2).toBe(Math.round(bricksPerM2));
      const brick = findMaterial(r, "Двойной кирпич");
      expect(brick).toBeDefined();
    });
  });

  describe("Клинкерный кирпич, шов 12 мм", () => {
    it("предупреждение о толстом шве для клинкера", () => {
      const r = calc({ area: 80, brickType: 3, jointThickness: 12, withTie: 1 });
      expect(r.warnings.some(w => w.includes("8–10 мм"))).toBe(true);
    });

    it("шов 8 мм — без предупреждения о шве", () => {
      const r = calc({ area: 80, brickType: 3, jointThickness: 8, withTie: 1 });
      expect(r.warnings.some(w => w.includes("8–10 мм"))).toBe(false);
    });
  });

  describe("Гибкие связи", () => {
    it("стеклопластиковые ТПА: 5 шт/м² × area × 1.05", () => {
      const r = calc({ area: 80, brickType: 0, jointThickness: 10, withTie: 1 });
      const ties = findMaterial(r, "Гибкая связь стеклопластиковая");
      expect(ties).toBeDefined();
      expect(ties!.purchaseQty).toBe(Math.ceil(80 * 5 * 1.05));
    });

    it("нержавеющая сталь: withTie=2", () => {
      const r = calc({ area: 80, brickType: 0, jointThickness: 10, withTie: 2 });
      const ties = findMaterial(r, "нержавеющая сталь");
      expect(ties).toBeDefined();
      expect(ties!.purchaseQty).toBe(Math.ceil(80 * 5 * 1.05));
    });

    it("без связей: withTie=0 → предупреждение + крепёж отсутствует", () => {
      const r = calc({ area: 80, brickType: 0, jointThickness: 10, withTie: 0 });
      expect(findMaterial(r, "Гибкая связь")).toBeUndefined();
      expect(r.warnings.some(w => w.includes("Без гибких связей"))).toBe(true);
    });
  });

  describe("Раствор", () => {
    it("цемент M500: masonryVolume = area*0.12, mortar = masonry*0.23, bags = ceil(mortar*430/50)", () => {
      const r = calc({ area: 80, brickType: 0, jointThickness: 10, withTie: 1 });
      const masonryVolume = 80 * 0.12;
      const mortarVolume = masonryVolume * 0.23;
      const expectedBags = Math.ceil((mortarVolume * 430) / 50);
      const cement = findMaterial(r, "Цемент М500");
      expect(cement).toBeDefined();
      expect(cement!.purchaseQty).toBe(expectedBags);
    });

    it("песок речной: ceil(mortarVolume * 1.4 * 10) / 10", () => {
      const r = calc({ area: 80, brickType: 0, jointThickness: 10, withTie: 1 });
      const mortarVolume = 80 * 0.12 * 0.23;
      const expectedSand = Math.ceil(mortarVolume * 1.4 * 10) / 10;
      const sand = findMaterial(r, "Песок речной");
      expect(sand).toBeDefined();
      expect(sand!.purchaseQty).toBe(expectedSand);
    });
  });

  describe("Все материалы присутствуют", () => {
    it("гидроизоляция, вент. коробочки, затирка, гидрофобизатор", () => {
      const r = calc({ area: 80, brickType: 0, jointThickness: 10, withTie: 1 });
      expect(findMaterial(r, "Гидроизоляция цоколя")).toBeDefined();
      expect(findMaterial(r, "Вентиляционная коробочка")).toBeDefined();
      expect(findMaterial(r, "расшивки швов")).toBeDefined();
      expect(findMaterial(r, "Гидрофобизатор")).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("всегда содержит предупреждение о вентиляционном зазоре СП 15.13330", () => {
      const r = calc({ area: 80, brickType: 0, jointThickness: 10, withTie: 1 });
      expect(r.warnings.some(w => w.includes("СП 15.13330"))).toBe(true);
    });
  });
});
