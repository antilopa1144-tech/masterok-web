import { describe, it, expect } from "vitest";
import { foundationSlabDef } from "../formulas/foundation-slab";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(foundationSlabDef.calculate.bind(foundationSlabDef));

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

  describe("Прямоугольная плита 6×10 м (60 м²)", () => {
    // useRect=true: length=10, width=6, area=60
    // perimeter = 2*(10+6) = 32 м (vs 4*sqrt(60) ≈ 30.98 при квадратной аппроксимации)
    // barsAlongLength = ceil(6/0.2) + 1 = 31, barsAlongWidth = ceil(10/0.2) + 1 = 51
    // totalBarLen = (31*10 + 51*6) * 2 = (310 + 306) * 2 = 1232 м (vs 1240 у квадрата)
    // rebarKg ≈ 1232 * 0.888 ≈ 1094 кг
    const result = calc({
      length: 10,
      width: 6,
      thickness: 200,
      rebarDiam: 12,
      rebarStep: 200,
      insulationThickness: 0,
    });

    it("использован реальный прямоугольник: length=10, width=6", () => {
      expect(result.totals.length).toBe(10);
      expect(result.totals.width).toBe(6);
    });

    it("площадь = 60 м² (length × width)", () => {
      expect(result.totals.area).toBeCloseTo(60, 2);
    });

    it("периметр = 32 м (2 × (10+6))", () => {
      expect(result.totals.perimeter).toBeCloseTo(32, 2);
    });

    it("прутков вдоль длины = 31, вдоль ширины = 51", () => {
      expect(result.totals.barsAlongLength).toBe(31);
      expect(result.totals.barsAlongWidth).toBe(51);
    });

    it("общая длина арматуры = 1232 м (две сетки)", () => {
      expect(result.totals.totalBarLen).toBeCloseTo(1232, 1);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Вытянутая плита 3×20 м — заметная разница с sqrt-аппроксимацией", () => {
    // length=20, width=3, area=60 (та же что и квадрат 7.75×7.75)
    // periметр = 2*(3+20) = 46 м (vs 31 у квадрата → +48% опалубки!)
    // barsAlongLength = ceil(3/0.2) + 1 = 16, barsAlongWidth = ceil(20/0.2) + 1 = 101
    // totalBarLen = (16*20 + 101*3) * 2 = (320 + 303) * 2 = 1246 м
    const rect = calc({
      length: 20,
      width: 3,
      thickness: 200,
      rebarDiam: 12,
      rebarStep: 200,
      insulationThickness: 0,
    });
    const square = calc({ area: 60, thickness: 200, rebarDiam: 12, rebarStep: 200, insulationThickness: 0 });

    it("периметр прямоугольника > периметра квадрата", () => {
      // 46 vs ~31
      expect(rect.totals.perimeter).toBeGreaterThan(square.totals.perimeter * 1.4);
    });

    it("опалубка прямоугольника заметно больше", () => {
      const rectFormwork = rect.totals.formworkArea as number;
      const squareFormwork = square.totals.formworkArea as number;
      expect(rectFormwork).toBeGreaterThan(squareFormwork * 1.4);
    });
  });

  describe("Backward-compat: только area без length/width", () => {
    const old = calc({ area: 60, thickness: 200, rebarDiam: 12, rebarStep: 200, insulationThickness: 0 });
    const explicit = calc({ length: 0, width: 0, area: 60, thickness: 200, rebarDiam: 12, rebarStep: 200, insulationThickness: 0 });

    it("identical: только area даёт тот же результат, что и length=0/width=0", () => {
      expect(old.totals.rebarKg).toBeCloseTo(explicit.totals.rebarKg as number, 3);
      expect(old.totals.concreteM3).toBeCloseTo(explicit.totals.concreteM3 as number, 3);
      expect(old.totals.perimeter).toBeCloseTo(explicit.totals.perimeter as number, 3);
    });
  });
});
