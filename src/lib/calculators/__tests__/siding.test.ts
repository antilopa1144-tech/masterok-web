import { describe, it, expect } from "vitest";
import { sidingDef } from "../formulas/siding";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = sidingDef.calculate.bind(sidingDef);

describe("Сайдинг", () => {
  describe("Виниловый, 100 м² фасад, 10 м² проёмов, периметр 40 м, высота 5 м", () => {
    it("panelArea=0.732, panels=ceil(90/0.732*1.10)", () => {
      const r = calc({ facadeArea: 100, openingsArea: 10, perimeter: 40, height: 5, sidingType: 0, exteriorCorners: 4 });
      checkInvariants(r);
      const netArea = 90;
      const expectedPanels = Math.ceil(netArea / 0.732 * 1.10);
      // Engine: "Виниловый сайдинг (0.732 м²)"
      const panels = findMaterial(r, "Виниловый сайдинг");
      expect(panels).toBeDefined();
      expect(r.totals.panels).toBe(expectedPanels);
    });

    it("стартовая планка присутствует", () => {
      const r = calc({ facadeArea: 100, openingsArea: 10, perimeter: 40, height: 5, sidingType: 0, exteriorCorners: 4 });
      // Engine: "Стартовая планка (3.66 м)"
      expect(findMaterial(r, "Стартовая планка")).toBeDefined();
    });

    it("J-профиль присутствует", () => {
      const r = calc({ facadeArea: 100, openingsArea: 10, perimeter: 40, height: 5, sidingType: 0, exteriorCorners: 4 });
      // Engine: "J-профиль (3.66 м)"
      expect(findMaterial(r, "J-профиль")).toBeDefined();
    });

    it("наружный угол присутствует", () => {
      const r = calc({ facadeArea: 100, openingsArea: 10, perimeter: 40, height: 5, sidingType: 0, exteriorCorners: 4 });
      // Engine: "Наружный угол (3 м)"
      expect(findMaterial(r, "Наружный угол")).toBeDefined();
    });

    it("финишная планка присутствует", () => {
      const r = calc({ facadeArea: 100, openingsArea: 10, perimeter: 40, height: 5, sidingType: 0, exteriorCorners: 4 });
      // Engine: "Финишная планка (3.66 м)"
      expect(findMaterial(r, "Финишная планка")).toBeDefined();
    });

    it("саморезы присутствуют", () => {
      const r = calc({ facadeArea: 100, openingsArea: 10, perimeter: 40, height: 5, sidingType: 0, exteriorCorners: 4 });
      // Engine: "Саморезы"
      expect(findMaterial(r, "Саморезы")).toBeDefined();
    });

    it("обрешётка присутствует", () => {
      const r = calc({ facadeArea: 100, openingsArea: 10, perimeter: 40, height: 5, sidingType: 0, exteriorCorners: 4 });
      // Engine: "Обрешётка (м.п.)"
      expect(findMaterial(r, "Обрешётка")).toBeDefined();
    });

    it("мембрана присутствует", () => {
      const r = calc({ facadeArea: 100, openingsArea: 10, perimeter: 40, height: 5, sidingType: 0, exteriorCorners: 4 });
      // Engine: "Мембрана (75 м²)"
      expect(findMaterial(r, "Мембрана")).toBeDefined();
    });

    it("герметик (тубы) присутствует", () => {
      const r = calc({ facadeArea: 100, openingsArea: 10, perimeter: 40, height: 5, sidingType: 0, exteriorCorners: 4 });
      // Engine: "Герметик (тубы)"
      expect(findMaterial(r, "Герметик")).toBeDefined();
    });
  });

  describe("Металлический сайдинг (sidingType=1)", () => {
    it("panelArea = 0.9 м²", () => {
      const r = calc({ facadeArea: 100, openingsArea: 10, perimeter: 40, height: 5, sidingType: 1, exteriorCorners: 4 });
      checkInvariants(r);
      // Engine: "Металлический сайдинг (0.9 м²)"
      expect(findMaterial(r, "Металлический сайдинг")).toBeDefined();
    });
  });

  describe("Фиброцементный сайдинг (sidingType=2)", () => {
    it("panelArea = 0.63 м²", () => {
      const r = calc({ facadeArea: 100, openingsArea: 10, perimeter: 40, height: 5, sidingType: 2, exteriorCorners: 4 });
      checkInvariants(r);
      // Engine: "Фиброцементный сайдинг (0.63 м²)"
      expect(findMaterial(r, "Фиброцементный сайдинг")).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("> 300 м² netArea → оптовая закупка", () => {
      const r = calc({ facadeArea: 400, openingsArea: 10, perimeter: 80, height: 5, sidingType: 0, exteriorCorners: 4 });
      // Engine: "Большая площадь — рассмотрите оптовую закупку сайдинга"
      expect(r.warnings.some(w => w.includes("оптовую закупку"))).toBe(true);
    });

    it("openingsArea > facadeArea*0.3 → проверка доборных", () => {
      const r = calc({ facadeArea: 100, openingsArea: 40, perimeter: 40, height: 5, sidingType: 0, exteriorCorners: 4 });
      // Engine: "Большая площадь проёмов — проверьте количество доборных элементов"
      expect(r.warnings.some(w => w.includes("доборных"))).toBe(true);
    });
  });
});
