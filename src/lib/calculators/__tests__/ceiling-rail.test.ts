import { describe, it, expect } from "vitest";
import { ceilingRailDef } from "../formulas/ceiling-rail";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = ceilingRailDef.calculate.bind(ceilingRailDef);

describe("Реечный потолок", () => {
  describe("Стандартный расчёт: 20 м², рейка 100 мм x 3 м, длина 5 м", () => {
    it("рейки рассчитаны", () => {
      const r = calc({ area: 20, railWidth: 100, railLength: 3, roomLength: 5 });
      checkInvariants(r);
      // Engine: roomWidth=20/5=4, railRows=ceil(4/0.1)=40
      // totalRailLen=40*5*1.1=220, railPcs=ceil(220/3)=74
      // Engine: "Рейка 100 мм × 3 м"
      expect(findMaterial(r, "Рейка")).toBeDefined();
      expect(r.totals.railPcs).toBeGreaterThan(0);
    });
  });

  describe("Ширина рейки 200 мм", () => {
    it("200 мм → меньше реек", () => {
      const r = calc({ area: 20, railWidth: 200, railLength: 3, roomLength: 5 });
      // railRows=ceil(4/0.2)=20
      expect(r.totals.railRows).toBe(20);
    });
  });

  describe("Материалы", () => {
    it("рейки, Т-профиль, подвесы, саморезы, дюбели", () => {
      const r = calc({ area: 20, railWidth: 100, railLength: 3, roomLength: 5 });
      // Engine names
      expect(findMaterial(r, "Рейка")).toBeDefined();
      expect(findMaterial(r, "Т-профиль")).toBeDefined();
      expect(findMaterial(r, "Подвес")).toBeDefined();
      expect(findMaterial(r, "Саморезы")).toBeDefined();
      expect(findMaterial(r, "Дюбели")).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("большая площадь → профессиональный монтаж", () => {
      const r = calc({ area: 120, railWidth: 100, railLength: 3, roomLength: 12 });
      // Engine: "Большая площадь — рекомендуется профессиональный монтаж"
      expect(r.warnings.some(w => w.includes("профессиональный монтаж"))).toBe(true);
    });
  });
});
