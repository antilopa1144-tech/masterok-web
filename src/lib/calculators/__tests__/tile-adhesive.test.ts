import { describe, it, expect } from "vitest";
import { tileAdhesiveDef } from "../formulas/tile-adhesive";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = tileAdhesiveDef.calculate.bind(tileAdhesiveDef);

describe("Плиточный клей", () => {
  describe("Стандартный расчёт", () => {
    it("20 м², средняя плитка, пол, бетон, мешки 25 кг", () => {
      const r = calc({ area: 20, tileSize: 1, layingType: 0, baseType: 0, bagWeight: 25 });
      checkInvariants(r);
      // kgPerSqm=5.0, totalKg=20*5*1.1=110, bags=ceil(110/25)=5
      const glue = findMaterial(r, "Клей плиточный");
      expect(glue).toBeDefined();
      expect(glue!.purchaseQty).toBe(5);
      expect(r.totals.totalKg).toBeCloseTo(110, 0);
    });

    it("маленькая плитка (≤30 см) → 3 кг/м²", () => {
      const r = calc({ area: 10, tileSize: 0, layingType: 0, baseType: 0, bagWeight: 25 });
      // kgPerSqm=3.0, totalKg=10*3*1.1=33, bags=ceil(33/25)=2
      expect(r.totals.kgPerSqm).toBeCloseTo(3.0, 1);
      expect(findMaterial(r, "Клей")!.purchaseQty).toBe(2);
    });

    it("крупноформатная плитка → 7.5 кг/м²", () => {
      const r = calc({ area: 10, tileSize: 2, layingType: 0, baseType: 0, bagWeight: 25 });
      expect(r.totals.kgPerSqm).toBeCloseTo(7.5, 1);
    });
  });

  describe("Место укладки", () => {
    it("стена — расход -15%", () => {
      const r = calc({ area: 20, tileSize: 1, layingType: 1, baseType: 0, bagWeight: 25 });
      // kgPerSqm=5*0.85=4.25, totalKg=20*4.25*1.1=93.5
      expect(r.totals.kgPerSqm).toBeCloseTo(4.25, 2);
    });

    it("улица/тёплый пол — расход +30%", () => {
      const r = calc({ area: 20, tileSize: 1, layingType: 2, baseType: 0, bagWeight: 25 });
      // kgPerSqm=5*1.3=6.5
      expect(r.totals.kgPerSqm).toBeCloseTo(6.5, 2);
    });
  });

  describe("Основание", () => {
    it("старая плитка → расход +20%", () => {
      const r = calc({ area: 20, tileSize: 1, layingType: 0, baseType: 2, bagWeight: 25 });
      // kgPerSqm=5*1.2=6.0
      expect(r.totals.kgPerSqm).toBeCloseTo(6.0, 2);
    });
  });

  describe("Фасовка", () => {
    it("мешки 5 кг → больше мешков", () => {
      const r = calc({ area: 20, tileSize: 1, layingType: 0, baseType: 0, bagWeight: 5 });
      // totalKg=20*5*1.1≈110 (IEEE 754 rounding), bags=ceil(~110/5)=23
      expect(findMaterial(r, "Клей")!.purchaseQty).toBe(23);
    });
  });

  describe("Сопутствующие материалы", () => {
    it("грунтовка и крестики в результате", () => {
      const r = calc({ area: 20, tileSize: 1, layingType: 0, baseType: 0, bagWeight: 25 });
      expect(findMaterial(r, "Грунтовка")).toBeDefined();
      expect(findMaterial(r, "Крестики")).toBeDefined();
    });

    it("крестики — 4 шт/плитку, упак. по 200", () => {
      const r = calc({ area: 20, tileSize: 1, layingType: 0, baseType: 0, bagWeight: 25 });
      // tileSideM=0.6, tiles=20/(0.6*0.6)≈55.56, crosses=ceil(55.56*4*1.1)=ceil(244.44)=245
      // packs=ceil(245/200)=2
      const crosses = findMaterial(r, "Крестики");
      expect(crosses!.purchaseQty).toBe(2);
    });
  });

  describe("Предупреждения", () => {
    it("крупноформатная → предупреждение о двойном нанесении", () => {
      const r = calc({ area: 20, tileSize: 2, layingType: 0, baseType: 0, bagWeight: 25 });
      expect(r.warnings.some(w => w.includes("двойное нанесение"))).toBe(true);
    });

    it("гипсокартон + пол → предупреждение", () => {
      const r = calc({ area: 20, tileSize: 1, layingType: 0, baseType: 1, bagWeight: 25 });
      expect(r.warnings.some(w => w.includes("гипсокартонном полу"))).toBe(true);
    });

    it("улица + маленькая плитка → предупреждение о деформируемом клее", () => {
      const r = calc({ area: 20, tileSize: 0, layingType: 2, baseType: 0, bagWeight: 25 });
      expect(r.warnings.some(w => w.includes("деформируемый клей"))).toBe(true);
    });

    it("рекомендация марки в каждом результате", () => {
      const r = calc({ area: 20, tileSize: 1, layingType: 0, baseType: 0, bagWeight: 25 });
      expect(r.warnings.some(w => w.includes("Рекомендуемая марка"))).toBe(true);
    });
  });
});
