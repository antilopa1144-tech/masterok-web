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

    it("объём бетона = 60 × 0.2 = 12 м³", () => {
      expect(result.totals.concreteM3).toBeCloseTo(12, 2);
    });

    it("бетон с запасом 5%: ceil(12 * 1.05 * 10) / 10 — IEEE 754: 12*1.05*10=126.0000..01 → ceil=127 → 12.7", () => {
      const concrete = findMaterial(result, "Бетон М300");
      // IEEE 754: 12 * 1.05 * 10 = 126.00000000000001 → Math.ceil = 127 → 127/10 = 12.7
      expect(concrete?.purchaseQty).toBeCloseTo(12.7, 1);
    });

    it("арматура А500С присутствует", () => {
      expect(findMaterial(result, "Арматура А500С")).toBeDefined();
    });

    it("арматура: side=sqrt(60)=7.746, barCount=ceil(7.746/0.2)+1=40, totalLength=40*7.746*2*2=1239.32, kg=1239.32*0.888=1100.52, tons~1.1", () => {
      const side = Math.sqrt(60);
      const barCount = Math.ceil(side / 0.2) + 1; // 40
      const totalLength = barCount * side * 2 * 2;
      const rebarTons = totalLength * 0.888 / 1000;
      expect(result.totals.rebarTons).toBeCloseTo(rebarTons, 2);
    });

    it("вязальная проволока присутствует", () => {
      expect(findMaterial(result, "Проволока вязальная")).toBeDefined();
    });

    it("щебень подготовка = 60 × 0.15 = 9 м³", () => {
      const gravel = findMaterial(result, "Щебень фракция");
      expect(gravel?.quantity).toBeCloseTo(9, 2);
    });

    it("песок подушка = 60 × 0.1 = 6 м³", () => {
      const sand = findMaterial(result, "Песок");
      expect(sand?.quantity).toBeCloseTo(6, 2);
    });

    it("геотекстиль = ceil(60 * 1.2) = 72 м²", () => {
      const geo = findMaterial(result, "Геотекстиль");
      expect(geo?.purchaseQty).toBe(72);
    });

    it("опалубка: perimeter = sqrt(60)*4 = 30.98, area = 30.98*0.2 = 6.197, purchaseQty = ceil(6.197*1.1) = 7", () => {
      const side = Math.sqrt(60);
      const perimeter = side * 4;
      const formworkArea = perimeter * 0.2;
      const expected = Math.ceil(formworkArea * 1.1);
      const formwork = findMaterial(result, "Опалубка");
      expect(formwork?.purchaseQty).toBe(expected);
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
      const epps = findMaterial(result, "ЭППС");
      expect(epps).toBeDefined();
    });

    it("ЭППС плит = ceil(60 * 1.05 / 0.72) = ceil(87.5) = 88", () => {
      const epps = findMaterial(result, "ЭППС");
      expect(epps?.purchaseQty).toBe(Math.ceil(60 * 1.05 / 0.72));
    });
  });

  describe("Разные диаметры арматуры", () => {
    it("Ø10: масса меньше, чем Ø12", () => {
      const r10 = calc({ area: 60, thickness: 200, rebarDiam: 10, rebarStep: 200, insulationThickness: 0 });
      const r12 = calc({ area: 60, thickness: 200, rebarDiam: 12, rebarStep: 200, insulationThickness: 0 });
      expect(r10.totals.rebarTons).toBeLessThan(r12.totals.rebarTons);
    });

    it("Ø16: масса больше, чем Ø12", () => {
      const r16 = calc({ area: 60, thickness: 200, rebarDiam: 16, rebarStep: 200, insulationThickness: 0 });
      const r12 = calc({ area: 60, thickness: 200, rebarDiam: 12, rebarStep: 200, insulationThickness: 0 });
      expect(r16.totals.rebarTons).toBeGreaterThan(r12.totals.rebarTons);
    });
  });

  describe("Предупреждения", () => {
    it("толщина 150 мм → предупреждение о жилых домах", () => {
      const result = calc({ area: 60, thickness: 150, rebarDiam: 12, rebarStep: 200, insulationThickness: 0 });
      expect(result.warnings.some((w) => w.includes("<200 мм"))).toBe(true);
    });

    it("шаг 250 мм + площадь > 100 м² → предупреждение о шаге", () => {
      const result = calc({ area: 150, thickness: 200, rebarDiam: 12, rebarStep: 250, insulationThickness: 0 });
      expect(result.warnings.some((w) => w.includes("150–200 мм"))).toBe(true);
    });

    it("всегда присутствует предупреждение о миксерах", () => {
      const result = calc({ area: 60, thickness: 200, rebarDiam: 12, rebarStep: 200, insulationThickness: 0 });
      expect(result.warnings.some((w) => w.includes("миксеры"))).toBe(true);
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
