import { describe, it, expect } from "vitest";
import { foundationSlabDef } from "../formulas/foundation-slab";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = foundationSlabDef.calculate.bind(foundationSlabDef);

describe("Калькулятор плитного фундамента", () => {
  describe("Стандарт: 60 м², толщина 200 мм, Ø12, шаг 200 мм, без утепления", () => {
    const result = calc({
      area: 60,
      thickness: 200,
      rebarDiam: 12,
      rebarStep: 200,
      insulationThickness: 0,
    });

    it("объём бетона ≈ area * thickness/1000 * reserve", () => {
      // concreteM3 = roundDisplay(60 * 0.2 * reserve, 6)
      expect(result.totals.concreteM3).toBeGreaterThan(12);
    });

    it("бетон М300 присутствует", () => {
      // Engine: "Бетон М300"
      expect(findMaterial(result, "Бетон М300")).toBeDefined();
    });

    it("арматура присутствует", () => {
      // Engine: "Арматура ∅12 мм"
      expect(findMaterial(result, "Арматура")).toBeDefined();
    });

    it("rebarKg в totals", () => {
      // Engine uses totals.rebarKg (not rebarTons)
      expect(result.totals.rebarKg).toBeGreaterThan(0);
    });

    it("вязальная проволока присутствует", () => {
      // Engine: "Проволока вязальная"
      expect(findMaterial(result, "Проволока вязальная")).toBeDefined();
    });

    it("щебень подготовка = 60 × 0.15 = 9 м³", () => {
      // Engine: "Щебень (подушка)"
      const gravel = findMaterial(result, "Щебень");
      expect(gravel?.quantity).toBeCloseTo(9, 2);
    });

    it("песок подушка = 60 × 0.1 = 6 м³", () => {
      // Engine: "Песок (подушка)"
      const sand = findMaterial(result, "Песок");
      expect(sand?.quantity).toBeCloseTo(6, 2);
    });

    it("геотекстиль присутствует", () => {
      // Engine: "Геотекстиль"
      const geo = findMaterial(result, "Геотекстиль");
      expect(geo).toBeDefined();
    });

    it("опалубка присутствует", () => {
      // Engine: "Опалубка (доска)"
      const formwork = findMaterial(result, "Опалубка");
      expect(formwork).toBeDefined();
    });

    it("без утепления — нет ЭППС", () => {
      expect(findMaterial(result, "ЭППС")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("С утеплением ЭППС 100 мм", () => {
    const result = calc({
      area: 60,
      thickness: 200,
      rebarDiam: 12,
      rebarStep: 200,
      insulationThickness: 100,
    });

    it("ЭППС присутствует", () => {
      // Engine: "ЭППС утеплитель"
      const epps = findMaterial(result, "ЭППС");
      expect(epps).toBeDefined();
    });

    it("ЭППС плит > 0", () => {
      const epps = findMaterial(result, "ЭППС");
      expect(epps?.purchaseQty).toBeGreaterThan(0);
    });
  });

  describe("Разные диаметры арматуры", () => {
    it("Ø10: масса меньше, чем Ø12", () => {
      const r10 = calc({ area: 60, thickness: 200, rebarDiam: 10, rebarStep: 200, insulationThickness: 0 });
      const r12 = calc({ area: 60, thickness: 200, rebarDiam: 12, rebarStep: 200, insulationThickness: 0 });
      expect(r10.totals.rebarKg).toBeLessThan(r12.totals.rebarKg);
    });

    it("Ø16: масса больше, чем Ø12", () => {
      const r16 = calc({ area: 60, thickness: 200, rebarDiam: 16, rebarStep: 200, insulationThickness: 0 });
      const r12 = calc({ area: 60, thickness: 200, rebarDiam: 12, rebarStep: 200, insulationThickness: 0 });
      expect(r16.totals.rebarKg).toBeGreaterThan(r12.totals.rebarKg);
    });
  });

  describe("Предупреждения", () => {
    it("тонкая плита → предупреждение", () => {
      const result = calc({ area: 60, thickness: 150, rebarDiam: 12, rebarStep: 200, insulationThickness: 0 });
      // Engine: "Тонкая плита — убедитесь, что расчёт соответствует нагрузкам"
      expect(result.warnings.some((w) => w.includes("Тонкая плита"))).toBe(true);
    });

    it("большая площадь → предупреждение", () => {
      const result = calc({ area: 300, thickness: 200, rebarDiam: 12, rebarStep: 200, insulationThickness: 0 });
      // Engine: "Большая площадь плиты — рекомендуется профессиональный расчёт нагрузок"
      expect(result.warnings.some((w) => w.includes("Большая площадь"))).toBe(true);
    });
  });

  describe("Минимальная площадь (area < 10 → clamped to 10)", () => {
    const result = calc({ area: 5, thickness: 200, rebarDiam: 12, rebarStep: 200, insulationThickness: 0 });

    it("totals.area = 10 (clamped)", () => {
      expect(result.totals.area).toBe(10);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });
});
