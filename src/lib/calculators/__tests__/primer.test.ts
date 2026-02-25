import { describe, it, expect } from "vitest";
import { primerDef } from "../formulas/primer";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = primerDef.calculate.bind(primerDef);

describe("Грунтовка", () => {
  describe("Глубокое проникновение", () => {
    it("50 м², бетон, 1 слой, канистра 5 л", () => {
      const r = calc({ area: 50, surfaceType: 0, primerType: 0, coats: 1, canSize: 5 });
      checkInvariants(r);
      // lPerSqm=0.1*1.5=0.15, totalL=50*0.15*1*1.05=7.875, cans=ceil(7.875/5)=2
      const primer = findMaterial(r, "Грунтовка");
      expect(primer).toBeDefined();
      expect(primer!.purchaseQty).toBe(2);
      expect(r.totals.lPerSqm).toBeCloseTo(0.15, 3);
    });

    it("50 м², ГКЛ (множитель 1.0)", () => {
      const r = calc({ area: 50, surfaceType: 1, primerType: 0, coats: 1, canSize: 5 });
      // lPerSqm=0.1*1.0=0.10, totalL=50*0.10*1.05=5.25, cans=ceil(5.25/5)=2
      expect(r.totals.lPerSqm).toBeCloseTo(0.10, 3);
    });

    it("2 слоя — удвоение расхода", () => {
      const r = calc({ area: 50, surfaceType: 0, primerType: 0, coats: 2, canSize: 5 });
      // totalL=50*0.15*2*1.05=15.75, cans=ceil(15.75/5)=4
      expect(findMaterial(r, "Грунтовка")!.purchaseQty).toBe(4);
    });
  });

  describe("Бетон-контакт", () => {
    it("50 м², бетон, 1 слой", () => {
      const r = calc({ area: 50, surfaceType: 0, primerType: 1, coats: 1, canSize: 10 });
      // lPerSqm=0.35*1.5=0.525, totalL=50*0.525*1.05=27.5625, cans=ceil(27.5625/10)=3
      expect(findMaterial(r, "контакт")!.purchaseQty).toBe(3);
    });
  });

  describe("Для ГКЛ", () => {
    it("50 м², ГКЛ, 1 слой", () => {
      const r = calc({ area: 50, surfaceType: 1, primerType: 2, coats: 1, canSize: 5 });
      // lPerSqm=0.12*1.0=0.12, totalL=50*0.12*1.05=6.3, cans=ceil(6.3/5)=2
      expect(findMaterial(r, "ГКЛ")!.purchaseQty).toBe(2);
    });
  });

  describe("Канистры", () => {
    it("20 л — меньше канистр", () => {
      const r = calc({ area: 50, surfaceType: 0, primerType: 0, coats: 1, canSize: 20 });
      // totalL=7.875, cans=ceil(7.875/20)=1
      expect(findMaterial(r, "Грунтовка")!.purchaseQty).toBe(1);
    });
  });

  describe("Инструмент", () => {
    it("валик и кювета включены", () => {
      const r = calc({ area: 50, surfaceType: 0, primerType: 0, coats: 1, canSize: 5 });
      expect(findMaterial(r, "Валик")).toBeDefined();
      expect(findMaterial(r, "Кювета")).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("бетон + не глубокое проникновение → рекомендация", () => {
      const r = calc({ area: 50, surfaceType: 0, primerType: 1, coats: 1, canSize: 5 });
      expect(r.warnings.some(w => w.includes("впитывающих"))).toBe(true);
    });

    it("1 слой на бетон → рекомендация 2 слоя", () => {
      const r = calc({ area: 50, surfaceType: 0, primerType: 0, coats: 1, canSize: 5 });
      expect(r.warnings.some(w => w.includes("2 слоя"))).toBe(true);
    });

    it("бетон-контакт на бетоне → предупреждение", () => {
      const r = calc({ area: 50, surfaceType: 0, primerType: 1, coats: 1, canSize: 5 });
      expect(r.warnings.some(w => w.includes("невпитывающих"))).toBe(true);
    });
  });
});
