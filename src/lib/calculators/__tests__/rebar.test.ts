import { describe, it, expect } from "vitest";
import { rebarDef } from "../formulas/rebar";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = rebarDef.calculate.bind(rebarDef);

describe("Калькулятор арматуры", () => {
  describe("Плита 10×8, h=0.3, Ø12, шаг 200", () => {
    // gridStepM = 0.2
    // barsAlongLength = ceil(8 / 0.2) + 1 = 41
    // barsAlongWidth = ceil(10 / 0.2) + 1 = 51
    // mainRebarLength = 2 × (41×10 + 51×8) × 1.05 = 2 × 818 × 1.05 = 1717.8
    // mainKgPerM (Ø12) = 0.888
    // mainRebarKg = 1717.8 × 0.888 = 1525.4064
    // mainRods = ceil(1717.8 / 11.7) = 147
    //
    // Vertical ties Ø6: tieCountX = ceil(10/0.6) = 17, tieCountY = ceil(8/0.6) = 14
    // totalTies = 238, each = 0.3 + 0.2 = 0.5 м → tieRebarLength = 119
    //
    // intersections = 41×51×2 + 238×2 = 4182 + 476 = 4658
    // wireKg = 4658 × 0.3 × 0.006 = 8.3844
    //
    // fixators = ceil(80 × 5) = 400
    const result = calc({
      structureType: 0,
      length: 10,
      width: 8,
      height: 0.3,
      mainDiameter: 12,
      gridStep: 200,
    });

    it("рабочая арматура ≈ 1717.8 м.п.", () => {
      expect(result.totals.mainRebarLength).toBeCloseTo(1717.8, 0);
    });

    it("масса рабочей арматуры ≈ 1525 кг", () => {
      expect(result.totals.mainRebarKg).toBeCloseTo(1525.41, 0);
    });

    it("стержни 11.7 м = 147 шт", () => {
      expect(result.totals.mainRods).toBe(147);
    });

    it("вертикальные связи Ø6 = 119 м.п.", () => {
      expect(result.totals.tieRebarLength).toBeCloseTo(119, 0);
    });

    it("вязальная проволока ≈ 8.38 кг", () => {
      expect(result.totals.wireKg).toBeCloseTo(8.38, 1);
    });

    it("проволока присутствует в материалах", () => {
      const wire = findMaterial(result, "Проволока вязальная");
      expect(wire).toBeDefined();
      expect(wire!.purchaseQty).toBeGreaterThanOrEqual(1);
    });

    it("фиксаторы = 400 шт", () => {
      expect(result.totals.fixators).toBe(400);
    });

    it("фиксаторы пластиковые = 400 шт (без доп. запаса)", () => {
      const fix = findMaterial(result, "Фиксаторы");
      expect(fix).toBeDefined();
      expect(fix!.purchaseQty).toBe(400);
    });

    it("totals содержат все ключевые значения", () => {
      expect(result.totals.mainRebarLength).toBeGreaterThan(0);
      expect(result.totals.mainRebarKg).toBeGreaterThan(0);
      expect(result.totals.tieRebarLength).toBeGreaterThan(0);
      expect(result.totals.tieRebarKg).toBeGreaterThan(0);
      expect(result.totals.intersections).toBeGreaterThan(0);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Ленточный фундамент 10×8, h=0.3, Ø12, шаг 200", () => {
    // perimeter = 2 × (10 + 8) = 36
    // mainRebarLength = 36 × 4 × 1.12 = 161.28
    // stirrupCount = ceil(36 / 0.4) = 90
    // sectionPerimeter = 2 × (0.3 + 0.3 - 0.1) = 1.0, but max(0.8, 1.0) = 1.0
    // tieRebarLength = 90 × max(0.8, 1.0) = 90
    // fixators = 0 (strip foundation)
    const result = calc({
      structureType: 1,
      length: 10,
      width: 8,
      height: 0.3,
      mainDiameter: 12,
      gridStep: 200,
    });

    it("4 продольных прутка: 36 × 4 × 1.12 = 161.28 м.п.", () => {
      expect(result.totals.mainRebarLength).toBeCloseTo(161.28, 1);
    });

    it("арматура для хомутов присутствует", () => {
      const tie = findMaterial(result, "хомутов");
      expect(tie).toBeDefined();
    });

    it("стержни 11.7 м = ceil(161.28 / 11.7) = 14", () => {
      expect(result.totals.mainRods).toBe(14);
    });

    it("фиксаторы = 0 (ленточный фундамент)", () => {
      expect(result.totals.fixators).toBe(0);
    });

    it("вязальная проволока присутствует", () => {
      expect(findMaterial(result, "Проволока вязальная")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Армопояс 10×8, Ø12", () => {
    // perimeter = 36
    // mainRebarLength = 36 × 4 × 1.12 = 161.28
    // stirrupCount = ceil(36 / 0.4) = 90
    // tieRebarLength = 90 × 2 × (0.30 + 0.25 - 0.1) = 90 × 0.9 = 81
    const result = calc({
      structureType: 2,
      length: 10,
      width: 8,
      height: 0.25,
      mainDiameter: 12,
      gridStep: 200,
    });

    it("4 прутка: 161.28 м.п.", () => {
      expect(result.totals.mainRebarLength).toBeCloseTo(161.28, 1);
    });

    it("хомуты ≈ 81 м.п.", () => {
      expect(result.totals.tieRebarLength).toBeCloseTo(81, 0);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Перекрытие 10×8, Ø12, шаг 200", () => {
    // одинарная сетка: barsAlongLength=41, barsAlongWidth=51
    // mainRebarLength = (41×10 + 51×8) × 1.05 = 818 × 1.05 = 858.9
    // Вторичная Ø6: secStep = 0.4, secBarsL = ceil(8/0.4)+1=21, secBarsW = ceil(10/0.4)+1=26
    // tieRebarLength = (21×10 + 26×8) × 1.05 = 418 × 1.05 = 438.9
    const result = calc({
      structureType: 3,
      length: 10,
      width: 8,
      height: 0.2,
      mainDiameter: 12,
      gridStep: 200,
    });

    it("одинарная сетка ≈ 858.9 м.п.", () => {
      expect(result.totals.mainRebarLength).toBeCloseTo(858.9, 0);
    });

    it("арматура вторичная Ø6 присутствует", () => {
      const sec = findMaterial(result, "вторичная");
      expect(sec).toBeDefined();
      expect(sec!.quantity).toBeCloseTo(438.9, 0);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Предупреждения", () => {
    it("Ø8 для плитного фундамента → предупреждение", () => {
      const result = calc({
        structureType: 0,
        length: 10,
        width: 8,
        height: 0.3,
        mainDiameter: 8,
        gridStep: 200,
      });
      expect(result.warnings.some((w) => w.includes("не менее 10"))).toBe(true);
    });

    it("толщина плиты < 150 мм → предупреждение по СП", () => {
      const result = calc({
        structureType: 0,
        length: 10,
        width: 8,
        height: 0.1,
        mainDiameter: 12,
        gridStep: 200,
      });
      expect(result.warnings.some((w) => w.includes("150 мм"))).toBe(true);
    });

    it("Ø8 для ленточного фундамента → предупреждение", () => {
      const result = calc({
        structureType: 1,
        length: 10,
        width: 8,
        height: 0.3,
        mainDiameter: 8,
        gridStep: 200,
      });
      expect(result.warnings.some((w) => w.includes("не менее 10"))).toBe(true);
    });

    it("шаг сетки > 250 мм → предупреждение о несущей способности", () => {
      const result = calc({
        structureType: 0,
        length: 10,
        width: 8,
        height: 0.3,
        mainDiameter: 12,
        gridStep: 300,
      });
      expect(result.warnings.some((w) => w.includes("250 мм"))).toBe(true);
    });
  });
});
