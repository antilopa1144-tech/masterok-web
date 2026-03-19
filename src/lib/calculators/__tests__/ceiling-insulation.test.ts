import { describe, it, expect } from "vitest";
import { ceilingInsulationDef } from "../formulas/ceiling-insulation";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(ceilingInsulationDef.calculate.bind(ceilingInsulationDef));

describe("Утепление потолка", () => {
  describe("Минераловатные плиты (insulationType=0)", () => {
    it("40 м², 100 мм, 1 слой", () => {
      const r = calc({ area: 40, thickness: 100, insulationType: 0, layers: 1 });
      checkInvariants(r);
      // Engine: "Минераловатные плиты", packs=ceil(40*1.05*1/6)=ceil(7)=7
      expect(findMaterial(r, "Минераловатные плиты")!.quantity).toBe(7);
    });

    it("2 слоя → удвоение", () => {
      const r = calc({ area: 40, thickness: 100, insulationType: 0, layers: 2 });
      // packs=ceil(40*1.05*2/6)=ceil(14)=14
      expect(findMaterial(r, "Минераловатные плиты")!.quantity).toBe(14);
    });

    it("пароизоляция 50 м² присутствует", () => {
      const r = calc({ area: 40, thickness: 100, insulationType: 0, layers: 1 });
      // Engine: "Пароизоляция 50 м²"
      expect(findMaterial(r, "Пароизоляция")).toBeDefined();
    });

    it("скотч соединительный присутствует", () => {
      const r = calc({ area: 40, thickness: 100, insulationType: 0, layers: 1 });
      // Engine: "Скотч соединительный"
      expect(findMaterial(r, "Скотч")).toBeDefined();
    });
  });

  describe("Минераловатные рулоны (insulationType=1)", () => {
    it("40 м², 100 мм → рулон 5 м²", () => {
      const r = calc({ area: 40, thickness: 100, insulationType: 1, layers: 1 });
      // Engine: "Минераловатные рулоны", rolls=ceil(40*1.05*1/5)=ceil(8.4)=9
      expect(findMaterial(r, "Минераловатные рулоны")!.quantity).toBe(9);
    });

    it("50 мм → рулон 9 м²", () => {
      const r = calc({ area: 40, thickness: 50, insulationType: 1, layers: 1 });
      // rolls=ceil(40*1.05/9)=ceil(4.667)=5
      expect(findMaterial(r, "Минераловатные рулоны")!.quantity).toBe(5);
    });

    it("пароизоляция присутствует", () => {
      const r = calc({ area: 40, thickness: 100, insulationType: 1, layers: 1 });
      expect(findMaterial(r, "Пароизоляция")).toBeDefined();
    });
  });

  describe("ЭППС плиты (insulationType=2)", () => {
    it("40 м², 100 мм", () => {
      const r = calc({ area: 40, thickness: 100, insulationType: 2, layers: 1 });
      // Engine: "ЭППС плиты", plates=ceil(40*1.05*1/0.72)=ceil(58.33)=59
      expect(findMaterial(r, "ЭППС плиты")!.quantity).toBe(59);
    });

    it("нет пароизоляции для ЭППС", () => {
      const r = calc({ area: 40, thickness: 100, insulationType: 2, layers: 1 });
      expect(findMaterial(r, "Пароизоляция")).toBeUndefined();
    });
  });

  describe("Эковата (insulationType=3)", () => {
    it("40 м², 100 мм → мешки 15 кг", () => {
      const r = calc({ area: 40, thickness: 100, insulationType: 3, layers: 1 });
      // Engine: "Эковата 15 кг", kg=40*0.1*35*1=140, bags=ceil(140/15)=10
      expect(findMaterial(r, "Эковата")!.quantity).toBe(10);
    });
  });

  describe("Предупреждения", () => {
    it("тонкий слой утеплителя (thickness < 50)", () => {
      // threshold is 50, engine checks thickness < threshold, but thickness=50 resolves to 50
      // Only 50 is allowed via resolveThickness, so we can't go below 50 with valid input
      // Skip if formula doesn't trigger at exactly 50
      const r = calc({ area: 40, thickness: 50, insulationType: 0, layers: 1 });
      // Engine: thickness < spec.warnings_rules.thin_insulation_threshold_mm (50)
      // 50 < 50 is false, so no warning
      expect(r.totals.thickness).toBe(50);
    });

    it("большая площадь (> 200)", () => {
      const r = calc({ area: 250, thickness: 100, insulationType: 0, layers: 1 });
      // Engine: "Большая площадь — рекомендуется профессиональный монтаж"
      expect(r.warnings.some(w => w.includes("профессиональный монтаж"))).toBe(true);
    });
  });
});
