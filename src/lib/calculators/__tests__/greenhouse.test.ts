import { describe, it, expect } from "vitest";
import { greenhouseDef } from "../formulas/greenhouse";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(greenhouseDef.calculate.bind(greenhouseDef));

describe("Калькулятор теплицы из поликарбоната", () => {
  describe("Defaults: 6×3×2.1, арка, ПК 6 мм, шаг 0.65, брус", () => {
    const result = calc({
      length: 6,
      width: 3,
      height: 2.1,
      roofType: 0,
      polycarbonateThickness: 6,
      archStep: 0.65,
      doorCount: 2,
      ventCount: 2,
      foundationType: 1,
    });

    it("длина дуги полуарки = π × 3 / 2 ≈ 4.712 м", () => {
      expect(result.totals.archLengthM).toBeCloseTo(4.712, 2);
    });

    it("площадь поликарбоната ≈ 35.34 м² (полуцилиндр + торцы)", () => {
      expect(result.totals.polyArea).toBeCloseTo(35.34, 1);
    });

    it("листов поликарбоната = ceil(40.6 / 12.6) = 4", () => {
      expect(result.totals.polySheets).toBe(4);
    });

    it("количество дуг = ceil(6/0.65) + 1 = 11", () => {
      expect(result.totals.archCount).toBe(11);
    });

    it("термошайбы = ceil(35.34 × 6) = 213 шт, упаковок = 3", () => {
      expect(result.totals.thermalWashersTotal).toBe(213);
      expect(result.totals.thermalWasherPacks).toBe(3);
    });

    it("H-швов = ceil(6/2.1) − 1 = 2", () => {
      expect(result.totals.hSeamCount).toBe(2);
    });

    it("брус: периметр 18 + поперечины 3 шт × 3 м = 27, ×1.05 = 28.35 м, 5 шт по 6 м", () => {
      expect(result.totals.woodBeamLengthM).toBeCloseTo(28.35, 2);
      expect(result.totals.woodBeamPieces).toBe(5);
    });

    it("в материалах поликарбонат, каркас, фундамент, двери, форточки", () => {
      expect(findMaterial(result, "Поликарбонат")).toBeDefined();
      expect(findMaterial(result, "Профиль каркаса")).toBeDefined();
      expect(findMaterial(result, "Брус")).toBeDefined();
      expect(findMaterial(result, "Дверь")).toBeDefined();
      expect(findMaterial(result, "Форточка")).toBeDefined();
      expect(findMaterial(result, "Термошайбы")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Двускатная теплица: 4×3×2.4", () => {
    const result = calc({
      length: 4,
      width: 3,
      height: 2.4,
      roofType: 1,
      polycarbonateThickness: 6,
      archStep: 0.65,
      doorCount: 1,
      ventCount: 1,
      foundationType: 1,
    });

    it("выбран двускатный тип", () => {
      expect(result.totals.roofType).toBe(1);
    });

    it("полная развёртка больше чем у арки той же ширины (есть прямые стены)", () => {
      // Площадь двускатной с прямыми стенами всегда больше арки той же длины
      expect(result.totals.polyArea).toBeGreaterThan(20);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Толщина 8 мм для зимы", () => {
    const result = calc({
      length: 8,
      width: 3,
      height: 2.1,
      roofType: 0,
      polycarbonateThickness: 8,
      archStep: 0.65,
      doorCount: 2,
      ventCount: 3,
      foundationType: 2,
    });

    it("выбран ПК 8 мм", () => {
      expect(result.totals.polycarbonateThickness).toBe(8);
      expect(findMaterial(result, "8 мм")).toBeDefined();
    });

    it("винтовые сваи: периметр 22 / 1.5 = 15, минимум 4", () => {
      // perimeter = 2*(8+3) = 22
      expect(result.totals.screwPileCount).toBeGreaterThanOrEqual(15);
      expect(findMaterial(result, "Винтовая свая")).toBeDefined();
    });
  });

  describe("Без фундамента — анкеры", () => {
    const result = calc({
      length: 4,
      width: 2,
      height: 2.0,
      roofType: 0,
      polycarbonateThickness: 4,
      archStep: 1.0,
      doorCount: 1,
      ventCount: 1,
      foundationType: 0,
    });

    it("есть анкеры", () => {
      expect(result.totals.anchorCount).toBeGreaterThanOrEqual(8);
      expect(findMaterial(result, "Анкеры")).toBeDefined();
    });

    it("без бруса/свай/бетона", () => {
      expect(result.totals.woodBeamPieces).toBe(0);
      expect(result.totals.screwPileCount).toBe(0);
      expect(result.totals.concreteM3).toBe(0);
    });
  });

  describe("Ленточный фундамент", () => {
    const result = calc({
      length: 8,
      width: 3,
      height: 2.4,
      roofType: 1,
      polycarbonateThickness: 8,
      archStep: 0.65,
      doorCount: 2,
      ventCount: 2,
      foundationType: 3,
    });

    it("бетон М200 = периметр × 0.30 × 0.40 × 1.05", () => {
      // perimeter = 22; concrete = 22 × 0.30 × 0.40 × 1.05 = 2.772
      expect(result.totals.concreteM3).toBeCloseTo(2.772, 2);
      expect(findMaterial(result, "Бетон М200")).toBeDefined();
    });
  });

  describe("Без форточек на длинной теплице — предупреждение", () => {
    const result = calc({
      length: 8,
      width: 3,
      height: 2.1,
      roofType: 0,
      polycarbonateThickness: 6,
      archStep: 0.65,
      doorCount: 2,
      ventCount: 0,
      foundationType: 1,
    });

    it("есть предупреждение про перегрев", () => {
      expect(result.warnings.some((w) => w.includes("форточек") || w.includes("перегрев"))).toBe(true);
    });
  });

  describe("Тонкий поликарбонат + большой шаг → предупреждение зимы", () => {
    const result = calc({
      length: 6,
      width: 3,
      height: 2.1,
      roofType: 0,
      polycarbonateThickness: 4,
      archStep: 1.0,
      doorCount: 2,
      ventCount: 2,
      foundationType: 1,
    });

    it("предупреждение про снеговую нагрузку", () => {
      expect(result.warnings.some((w) => w.includes("снеговую") || w.includes("снего"))).toBe(true);
    });
  });

  describe("Без фундамента + длинная теплица → предупреждение", () => {
    const result = calc({
      length: 8,
      width: 3,
      height: 2.1,
      roofType: 0,
      polycarbonateThickness: 6,
      archStep: 0.65,
      doorCount: 2,
      ventCount: 2,
      foundationType: 0,
    });

    it("предупреждение про необходимость фундамента", () => {
      expect(result.warnings.some((w) => w.includes("фундамент") || w.includes("брус"))).toBe(true);
    });
  });

  describe("Сценарии MIN ≤ REC ≤ MAX", () => {
    const result = calc({
      length: 6,
      width: 3,
      height: 2.1,
      roofType: 0,
      polycarbonateThickness: 6,
      archStep: 0.65,
      doorCount: 2,
      ventCount: 2,
      foundationType: 1,
    });

    it("MIN ≤ REC ≤ MAX", () => {
      expect(result.scenarios!.MIN.exact_need).toBeLessThanOrEqual(result.scenarios!.REC.exact_need);
      expect(result.scenarios!.REC.exact_need).toBeLessThanOrEqual(result.scenarios!.MAX.exact_need);
    });
  });

  describe("Граничные значения", () => {
    it("малая теплица 2×2 м работает", () => {
      const result = calc({
        length: 2,
        width: 2,
        height: 1.8,
        roofType: 0,
        polycarbonateThickness: 4,
        archStep: 1.0,
        doorCount: 1,
        ventCount: 0,
        foundationType: 0,
      });
      checkInvariants(result);
    });

    it("большая теплица 12×6 м работает", () => {
      const result = calc({
        length: 12,
        width: 6,
        height: 3.0,
        roofType: 1,
        polycarbonateThickness: 10,
        archStep: 0.65,
        doorCount: 2,
        ventCount: 6,
        foundationType: 3,
      });
      checkInvariants(result);
      expect(result.totals.polySheets).toBeGreaterThan(8);
    });
  });
});
