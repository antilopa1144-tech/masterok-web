import { describe, it, expect } from "vitest";
import { ceilingRailDef } from "../formulas/ceiling-rail";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = ceilingRailDef.calculate.bind(ceilingRailDef);

describe("Реечный потолок", () => {
  describe("Стандартный расчёт", () => {
    it("15 м², рейка 100 мм × 3 м, длина 5 м", () => {
      const r = calc({ area: 15, railWidth: 10, railLength: 3, roomLength: 5 });
      checkInvariants(r);
      // roomWidth=3, rowCount=ceil(3/0.1)=30
      // totalRailLength=30*5*1.1=165, railPcs=ceil(165/3)=55
      expect(r.totals.rowCount).toBe(30);
      expect(r.totals.railPcs).toBe(55);
    });
  });

  describe("Ширина рейки", () => {
    it("200 мм → меньше реек", () => {
      const r = calc({ area: 15, railWidth: 20, railLength: 3, roomLength: 5 });
      // roomWidth=3, rowCount=ceil(3/0.2)=15
      expect(r.totals.rowCount).toBe(15);
    });
  });

  describe("Материалы", () => {
    it("рейки, направляющие, подвесы, саморезы, дюбели", () => {
      const r = calc({ area: 15, railWidth: 10, railLength: 3, roomLength: 5 });
      expect(findMaterial(r, "Рейка")).toBeDefined();
      expect(findMaterial(r, "направляющий")).toBeDefined();
      expect(findMaterial(r, "Подвес")).toBeDefined();
      expect(findMaterial(r, "Саморез")).toBeDefined();
      expect(findMaterial(r, "Дюбель")).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("рекомендация по монтажу и зазору", () => {
      const r = calc({ area: 15, railWidth: 10, railLength: 3, roomLength: 5 });
      expect(r.warnings.some(w => w.includes("перпендикулярно"))).toBe(true);
      expect(r.warnings.some(w => w.includes("зазор"))).toBe(true);
    });
  });
});
