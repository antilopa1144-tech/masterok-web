import { describe, it, expect } from "vitest";
import { tileAdhesiveDef } from "../formulas/tile-adhesive";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(tileAdhesiveDef.calculate.bind(tileAdhesiveDef));

describe("Плиточный клей", () => {
  describe("Стандартный расчёт", () => {
    it("20 м², маленькая плитка (tileSize=0), пол (laying=0), бетон (base=0), мешки 25 кг", () => {
      const r = calc({ area: 20, tileSize: 0, laying: 0, base: 0, bagWeight: 25 });
      checkInvariants(r);
      // Engine: adjustedRate=3.0, totalKg=20*3.0*1.1=66, bags=ceil(66/25)=3
      // Engine: "Плиточный клей 25кг"
      const glue = findMaterial(r, "Плиточный клей");
      expect(glue).toBeDefined();
    });

    it("средняя плитка (tileSize=1) → 5 кг/м²", () => {
      const r = calc({ area: 20, tileSize: 1, laying: 0, base: 0, bagWeight: 25 });
      expect(r.totals.adjustedRate).toBeCloseTo(5.0, 1);
    });

    it("крупная плитка 60 см (tileSize=2) → 7.5 кг/м²", () => {
      const r = calc({ area: 20, tileSize: 2, laying: 0, base: 0, bagWeight: 25 });
      expect(r.totals.adjustedRate).toBeCloseTo(7.5, 1);
    });
  });

  describe("Место укладки (laying)", () => {
    it("стена (laying=1) — расход *0.85", () => {
      const r = calc({ area: 20, tileSize: 1, laying: 1, base: 0, bagWeight: 25 });
      // adjustedRate=5*0.85=4.25
      expect(r.totals.adjustedRate).toBeCloseTo(4.25, 2);
    });

    it("улица/тёплый пол (laying=2) — расход *1.3", () => {
      const r = calc({ area: 20, tileSize: 1, laying: 2, base: 0, bagWeight: 25 });
      // adjustedRate=5*1.3=6.5
      expect(r.totals.adjustedRate).toBeCloseTo(6.5, 2);
    });
  });

  describe("Основание (base)", () => {
    it("старая плитка (base=2) → расход *1.2", () => {
      const r = calc({ area: 20, tileSize: 1, laying: 0, base: 2, bagWeight: 25 });
      // adjustedRate=5*1.2=6.0
      expect(r.totals.adjustedRate).toBeCloseTo(6.0, 2);
    });
  });

  describe("Сопутствующие материалы", () => {
    it("грунтовка и крестики присутствуют", () => {
      const r = calc({ area: 20, tileSize: 0, laying: 0, base: 0, bagWeight: 25 });
      // Engine: "Грунтовка (канистра 10 л)", "Крестики (упаковка 200 шт)"
      expect(findMaterial(r, "Грунтовка")).toBeDefined();
      expect(findMaterial(r, "Крестики")).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("крупная плитка → гребёнка 10-12 мм", () => {
      const r = calc({ area: 20, tileSize: 2, laying: 0, base: 0, bagWeight: 25 });
      // Engine: "Крупная плитка (60 см) — рекомендуется гребёнка 10-12 мм"
      expect(r.warnings.some(w => w.includes("10-12 мм"))).toBe(true);
    });

    it("старая плитка → контактный грунт", () => {
      const r = calc({ area: 20, tileSize: 1, laying: 0, base: 2, bagWeight: 25 });
      // Engine: "Укладка на старую плитку — обязателен контактный грунт"
      expect(r.warnings.some(w => w.includes("контактный грунт"))).toBe(true);
    });
  });

  describe("Крупноформат (tileSize=3) и двойное нанесение (СП 71.13330.2017)", () => {
    // tileSize=3: base_consumption=7.5, авто doubleApplication → ×1.7 = 12.75
    const largeFormat = calc({ area: 20, tileSize: 3, laying: 0, base: 0, bagWeight: 25 });

    // tileSize=2 без doubleApplicationRequired: 7.5 кг/м² (как раньше)
    const class2NoDouble = calc({ area: 20, tileSize: 2, laying: 0, base: 0, bagWeight: 25 });

    // tileSize=2 с явным doubleApplicationRequired: 7.5 × 1.7 = 12.75
    const class2WithDouble = calc({ area: 20, tileSize: 2, laying: 0, base: 0, bagWeight: 25, doubleApplicationRequired: true });

    it("tileSize=3: автоматически включается двойное нанесение", () => {
      expect(largeFormat.totals.doubleApplication).toBe(1);
    });

    it("tileSize=3: adjustedRate = 7.5 × 1.7 = 12.75 кг/м²", () => {
      expect(largeFormat.totals.adjustedRate).toBeCloseTo(12.75, 1);
    });

    it("tileSize=3: warning о СП 71.13330.2017 и двойном нанесении", () => {
      const hasWarning = largeFormat.warnings.some((w) =>
        w.includes("Крупноформат") && w.includes("СП 71.13330"),
      );
      expect(hasWarning).toBe(true);
    });

    it("tileSize=2 без override: doubleApplication=0 (backward-compat)", () => {
      expect(class2NoDouble.totals.doubleApplication).toBe(0);
      expect(class2NoDouble.totals.adjustedRate).toBeCloseTo(7.5, 1);
    });

    it("tileSize=2 с override: doubleApplication=1, adjustedRate ≈ 12.75", () => {
      expect(class2WithDouble.totals.doubleApplication).toBe(1);
      expect(class2WithDouble.totals.adjustedRate).toBeCloseTo(12.75, 1);
    });

    it("tileSize=3 даёт больше клея чем tileSize=2", () => {
      const tile3Bags = largeFormat.totals.bags as number;
      const tile2Bags = class2NoDouble.totals.bags as number;
      expect(tile3Bags).toBeGreaterThan(tile2Bags);
    });

    it("tileSize=3 с улицей (laying=2): двойной множитель + уличный", () => {
      const r = calc({ area: 20, tileSize: 3, laying: 2, base: 0, bagWeight: 25 });
      // 7.5 * 1.3 (street) * 1.7 (double) = 16.575
      expect(r.totals.adjustedRate).toBeCloseTo(16.575, 1);
    });
  });
});
