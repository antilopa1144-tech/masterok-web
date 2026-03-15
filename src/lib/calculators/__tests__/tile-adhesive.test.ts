import { describe, it, expect } from "vitest";
import { tileAdhesiveDef } from "../formulas/tile-adhesive";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = tileAdhesiveDef.calculate.bind(tileAdhesiveDef);

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

    it("крупноформатная плитка (tileSize=2) → 7.5 кг/м²", () => {
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
    it("крупноформатная → гребёнка 12 мм", () => {
      const r = calc({ area: 20, tileSize: 2, laying: 0, base: 0, bagWeight: 25 });
      // Engine: "Крупноформатная плитка — рекомендуется гребёнка 12 мм"
      expect(r.warnings.some(w => w.includes("гребёнка 12 мм"))).toBe(true);
    });

    it("старая плитка → контактный грунт", () => {
      const r = calc({ area: 20, tileSize: 1, laying: 0, base: 2, bagWeight: 25 });
      // Engine: "Укладка на старую плитку — обязателен контактный грунт"
      expect(r.warnings.some(w => w.includes("контактный грунт"))).toBe(true);
    });
  });
});
