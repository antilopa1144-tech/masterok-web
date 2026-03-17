import { describe, it, expect } from "vitest";
import { concreteDef } from "../formulas/concrete";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = concreteDef.calculate.bind(concreteDef);

describe("Калькулятор бетона", () => {
  describe("Стандартный расчёт М200, 5 м³, запас 5%", () => {
    const result = calc({ concreteVolume: 5, concreteGrade: 3, manualMix: 0, reserve: 5 });

    it("содержит бетон М200 в материалах", () => {
      const concrete = findMaterial(result, "Бетон М200");
      expect(concrete).toBeDefined();
    });

    it("объём с запасом 5.25 м³", () => {
      expect(result.totals.totalVolume).toBeCloseTo(5.25, 2);
    });

    it("объём бетона с учётом REC-сценария ≈ 5.6 м³", () => {
      const concrete = findMaterial(result, "Бетон М200");
      // totalVolume=5.25, REC multiplier=1.06, exactNeed=5.565
      // packaging step=0.1 → purchaseQuantity=5.6, packageCount=56
      expect(concrete?.withReserve).toBeCloseTo(5.6, 1);
    });

    it("без manualMix — нет цемента в компонентах", () => {
      const cement = findMaterial(result, "Цемент М400");
      expect(cement).toBeUndefined();
    });

    it("инварианты: все purchaseQty >= 1", () => {
      checkInvariants(result);
    });
  });

  describe("Ручной замес (manualMix=1), М200, 5 м³", () => {
    const result = calc({ concreteVolume: 5, concreteGrade: 3, manualMix: 1, reserve: 5 });

    it("содержит цемент М400", () => {
      const cement = findMaterial(result, "Цемент М400");
      expect(cement).toBeDefined();
    });

    it("содержит песок", () => {
      const sand = findMaterial(result, "Песок");
      expect(sand).toBeDefined();
    });

    it("содержит щебень", () => {
      const gravel = findMaterial(result, "Щебень");
      expect(gravel).toBeDefined();
    });

    it("цемент М400: пропорции М200 = 290 кг/м³ × 5.25 = 1522.5 кг → 31 мешок × 50 кг = 1550 кг", () => {
      const cement = findMaterial(result, "Цемент М400");
      // 5.25 * 290 = 1522.5 kg → ceil(1522.5/50) = 31 bags → 31 * 50 = 1550 kg
      expect(cement?.purchaseQty).toBe(1550);
    });
  });

  describe("Граничные условия", () => {
    it("объём < 0.5 м³ → предупреждение о малом объёме", () => {
      const result = calc({ concreteVolume: 0.3, concreteGrade: 3, manualMix: 0, reserve: 5 });
      expect(result.warnings.some((w) => w.includes("Малый объём"))).toBe(true);
    });

    it("М300+ с manualMix → предупреждение о заводском бетоне", () => {
      const result = calc({ concreteVolume: 5, concreteGrade: 5, manualMix: 1, reserve: 5 });
      expect(result.warnings.some((w) => w.includes("заводской"))).toBe(true);
    });

    it("без запаса (reserve=0): объём = объём", () => {
      const result = calc({ concreteVolume: 10, concreteGrade: 3, manualMix: 0, reserve: 0 });
      expect(result.totals.totalVolume).toBeCloseTo(10, 3);
    });
  });
});
