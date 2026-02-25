import { describe, it, expect } from "vitest";
import { ceilingStretchDef } from "../formulas/ceiling-stretch";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = ceilingStretchDef.calculate.bind(ceilingStretchDef);

describe("Натяжной потолок", () => {
  describe("Стандартная комната 20 м², глянцевое ПВХ", () => {
    it("полотно = 20 м², purchaseQty = 20", () => {
      const r = calc({ area: 20, corners: 4, fixtures: 6, ceilingType: 0 });
      checkInvariants(r);
      const canvas = findMaterial(r, "Полотно");
      expect(canvas).toBeDefined();
      expect(canvas!.quantity).toBe(20);
      expect(canvas!.purchaseQty).toBe(20);
      expect(canvas!.name).toContain("Глянцевое ПВХ");
    });

    it("профиль багет: периметр = sqrt(20)*4 ≈ 17.89, *1.1 ≈ 19.68, ceil(19.68/2.5) = 8", () => {
      const r = calc({ area: 20, corners: 4, fixtures: 6, ceilingType: 0 });
      const side = Math.sqrt(20);
      const perimeter = side * 4;
      const baguetLength = perimeter * 1.1;
      const expectedProfilePcs = Math.ceil(baguetLength / 2.5);
      const profile = findMaterial(r, "Профиль стартовый");
      expect(profile).toBeDefined();
      expect(profile!.purchaseQty).toBe(expectedProfilePcs);
    });

    it("декоративная вставка по периметру с запасом 10%", () => {
      const r = calc({ area: 20, corners: 4, fixtures: 6, ceilingType: 0 });
      const perimeter = Math.sqrt(20) * 4;
      const insert = findMaterial(r, "Декоративная вставка");
      expect(insert).toBeDefined();
      expect(insert!.purchaseQty).toBe(Math.ceil(perimeter * 1.1));
    });

    it("totals содержат area, perimeter, fixtures", () => {
      const r = calc({ area: 20, corners: 4, fixtures: 6, ceilingType: 0 });
      expect(r.totals.area).toBe(20);
      expect(r.totals.perimeter).toBeCloseTo(Math.sqrt(20) * 4, 5);
      expect(r.totals.fixtures).toBe(6);
    });
  });

  describe("Типы полотна", () => {
    it("матовое ПВХ — название содержит 'Матовое ПВХ'", () => {
      const r = calc({ area: 15, corners: 4, fixtures: 0, ceilingType: 1 });
      const canvas = findMaterial(r, "Полотно");
      expect(canvas!.name).toContain("Матовое ПВХ");
    });

    it("тканевое — название содержит 'Тканевое'", () => {
      const r = calc({ area: 15, corners: 4, fixtures: 0, ceilingType: 2 });
      const canvas = findMaterial(r, "Полотно");
      expect(canvas!.name).toContain("Тканевое");
    });

    it("тканевое — предупреждение о монтаже без нагрева", () => {
      const r = calc({ area: 15, corners: 4, fixtures: 0, ceilingType: 2 });
      expect(r.warnings.some(w => w.includes("без нагрева"))).toBe(true);
    });
  });

  describe("Светильники", () => {
    it("6 светильников → 6 закладных платформ", () => {
      const r = calc({ area: 20, corners: 4, fixtures: 6, ceilingType: 0 });
      const platforms = findMaterial(r, "Закладная платформа");
      expect(platforms).toBeDefined();
      expect(platforms!.purchaseQty).toBe(6);
    });

    it("0 светильников → закладные отсутствуют", () => {
      const r = calc({ area: 20, corners: 4, fixtures: 0, ceilingType: 0 });
      const platforms = findMaterial(r, "Закладная платформа");
      expect(platforms).toBeUndefined();
    });

    it("светильники > 0 → предупреждение о закладных ДО натяжки", () => {
      const r = calc({ area: 20, corners: 4, fixtures: 4, ceilingType: 0 });
      expect(r.warnings.some(w => w.includes("закладные платформы"))).toBe(true);
    });
  });

  describe("Большая площадь > 100 м²", () => {
    it("предупреждение о составных полотнах", () => {
      const r = calc({ area: 120, corners: 4, fixtures: 0, ceilingType: 0 });
      expect(r.warnings.some(w => w.includes("составные полотна"))).toBe(true);
    });
  });

  describe("Обвод для труб и маскировочная лента", () => {
    it("обвод для труб всегда 2 шт", () => {
      const r = calc({ area: 20, corners: 4, fixtures: 0, ceilingType: 0 });
      const bypass = findMaterial(r, "Обвод для труб");
      expect(bypass).toBeDefined();
      expect(bypass!.purchaseQty).toBe(2);
    });

    it("маскировочная лента: бухта 50 м, purchaseQty = ceil(perimeter*1.1/50)", () => {
      const r = calc({ area: 20, corners: 4, fixtures: 0, ceilingType: 0 });
      const perimeter = Math.sqrt(20) * 4;
      const tape = findMaterial(r, "Маскировочная лента");
      expect(tape).toBeDefined();
      expect(tape!.purchaseQty).toBe(Math.ceil(perimeter * 1.1 / 50));
    });
  });

  describe("Минимальная площадь", () => {
    it("area = 1 → расчёт без ошибок", () => {
      const r = calc({ area: 1, corners: 3, fixtures: 0, ceilingType: 0 });
      checkInvariants(r);
      expect(r.totals.area).toBe(1);
    });
  });
});
