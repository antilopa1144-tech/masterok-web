import { describe, it, expect } from "vitest";
import { facadeBrickDef } from "../formulas/facade-brick";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(facadeBrickDef.calculate.bind(facadeBrickDef));

describe("Облицовочный кирпич", () => {
  describe("Одинарный кирпич 250×65, шов 10 мм, 80 м²", () => {
    it("bricksPerM2 ≈ 51.282 (roundDisplay 3), totalBricks = 80 * bricksPerM2", () => {
      const r = calc({ area: 80, brickType: 0, jointThickness: 10, withTie: 1 });
      checkInvariants(r);
      // l = (250+10)/1000 = 0.26, h = (65+10)/1000 = 0.075
      // bricksPerM2 = 1/(0.26*0.075) = 1/0.0195 ≈ 51.282 (roundDisplay 3)
      expect(r.totals.bricksPerM2).toBeCloseTo(51.282, 2);
      const totalBricks = 80 * r.totals.bricksPerM2;
      expect(r.totals.totalBricks).toBeCloseTo(totalBricks, 1);
    });

    it("кирпич с запасом 10%, purchaseQty = ceil(recScenario.exact_need)", () => {
      const r = calc({ area: 80, brickType: 0, jointThickness: 10, withTie: 1 });
      // Engine: Кирпич облицовочный одинарный (65 мм)
      const brick = findMaterial(r, "облицовочный одинарный");
      expect(brick).toBeDefined();
      // purchaseQty = ceil(recScenario.exact_need) which includes scenario multiplier
      expect(brick!.purchaseQty).toBeGreaterThan(0);
    });
  });

  describe("Полуторный кирпич 250×88, шов 10 мм", () => {
    it("bricksPerM2 ≈ 39.246", () => {
      const r = calc({ area: 80, brickType: 1, jointThickness: 10, withTie: 1 });
      checkInvariants(r);
      // l = 260/1000 = 0.26, h = 98/1000 = 0.098
      // bricksPerM2 = 1 / (0.26 * 0.098) ≈ 39.246
      expect(r.totals.bricksPerM2).toBeCloseTo(39.246, 1);
      const brick = findMaterial(r, "облицовочный полуторный");
      expect(brick).toBeDefined();
    });
  });

  describe("Двойной кирпич 250×138, шов 10 мм", () => {
    it("bricksPerM2 ≈ 25.995", () => {
      const r = calc({ area: 80, brickType: 2, jointThickness: 10, withTie: 1 });
      checkInvariants(r);
      // l = 0.26, h = (138+10)/1000 = 0.148
      // bricksPerM2 = 1 / (0.26 * 0.148) ≈ 25.995
      expect(r.totals.bricksPerM2).toBeCloseTo(25.995, 1);
      const brick = findMaterial(r, "облицовочный двойной");
      expect(brick).toBeDefined();
    });
  });

  describe("Клинкерный кирпич, шов 12 мм", () => {
    it("предупреждение о толстом шве для клинкера", () => {
      const r = calc({ area: 80, brickType: 3, jointThickness: 12, withTie: 1 });
      // Engine: "Клинкерный кирпич обычно кладётся с швом 8–10 мм"
      expect(r.warnings.some(w => w.includes("8–10 мм"))).toBe(true);
    });

    it("шов 8 мм — без предупреждения о шве", () => {
      const r = calc({ area: 80, brickType: 3, jointThickness: 8, withTie: 1 });
      expect(r.warnings.some(w => w.includes("8–10 мм"))).toBe(false);
    });
  });

  describe("Гибкие связи", () => {
    it("стеклопластиковые: 5 шт/м² × area × 1.05", () => {
      const r = calc({ area: 80, brickType: 0, jointThickness: 10, withTie: 1 });
      // Engine: "Связи стеклопластиковые"
      const ties = findMaterial(r, "Связи стеклопластиковые");
      expect(ties).toBeDefined();
      expect(ties!.purchaseQty).toBe(Math.ceil(80 * 5 * 1.05));
    });

    it("нержавеющие: withTie=2", () => {
      const r = calc({ area: 80, brickType: 0, jointThickness: 10, withTie: 2 });
      // Engine: "Связи нержавеющие"
      const ties = findMaterial(r, "Связи нержавеющие");
      expect(ties).toBeDefined();
      expect(ties!.purchaseQty).toBe(Math.ceil(80 * 5 * 1.05));
    });

    it("без связей: withTie=0 → предупреждение + крепёж отсутствует", () => {
      const r = calc({ area: 80, brickType: 0, jointThickness: 10, withTie: 0 });
      expect(findMaterial(r, "Связи")).toBeUndefined();
      // Engine: "Облицовочная кладка должна иметь конструктивное крепление к основной стене (гибкие связи)"
      expect(r.warnings.some(w => w.includes("конструктивное крепление"))).toBe(true);
    });
  });

  describe("Раствор", () => {
    it("цемент M400: masonryVolume = area*0.12, mortar = masonry*0.23, bags = ceil(mortar*430/50)", () => {
      const r = calc({ area: 80, brickType: 0, jointThickness: 10, withTie: 1 });
      const masonryVolume = 80 * 0.12;
      const mortarVolume = masonryVolume * 0.23;
      const expectedBags = Math.ceil((mortarVolume * 430) / 50);
      // Engine: "Цемент М400 (50 кг)"
      const cement = findMaterial(r, "Цемент М400");
      expect(cement).toBeDefined();
      expect(cement!.purchaseQty).toBe(expectedBags);
    });

    it("песок строительный: ceil(mortarVolume * 1.4 * 10) / 10", () => {
      const r = calc({ area: 80, brickType: 0, jointThickness: 10, withTie: 1 });
      const mortarVolume = 80 * 0.12 * 0.23;
      const expectedSand = Math.ceil(mortarVolume * 1.4 * 10) / 10;
      // Engine: "Песок строительный"
      const sand = findMaterial(r, "Песок строительный");
      expect(sand).toBeDefined();
      expect(sand!.purchaseQty).toBe(Math.ceil(expectedSand));
    });
  });

  describe("Все материалы присутствуют", () => {
    it("гидроизоляция, вент. коробки, затирка, гидрофобизатор", () => {
      const r = calc({ area: 80, brickType: 0, jointThickness: 10, withTie: 1 });
      // Engine names:
      expect(findMaterial(r, "Гидроизоляция рулонная")).toBeDefined();
      expect(findMaterial(r, "Вентиляционные коробки")).toBeDefined();
      expect(findMaterial(r, "Затирка для швов")).toBeDefined();
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
