import { describe, it, expect } from "vitest";
import { concreteDef } from "../formulas/concrete";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(concreteDef.calculate.bind(concreteDef));

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

    it("разделяет объём с запасом и заказ с шагом 0.1 м³", () => {
      const concrete = findMaterial(result, "Бетон М200");
      expect(concrete?.quantity).toBe(5);
      expect(concrete?.withReserve).toBe(5.25);
      expect(concrete?.purchaseQty).toBe(5.3);
    });

    it("готовый бетон не показывается как десятки доставок по 0.1 м³", () => {
      const concrete = findMaterial(result, "Бетон М200");
      expect(concrete?.packageInfo).toBeUndefined();
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

    it("цемент М400 согласован с выбранным запасом без скрытой надбавки", () => {
      const cement = findMaterial(result, "Цемент М400");
      // REC = 5 × 1.05 = 5.25 м³; цемент = 5.25 × 290 = 1522.5 кг
      // → ceil(1522.5/50) = 31 мешок × 50 = 1550 кг.
      expect(cement?.purchaseQty).toBe(1550);
      const cementVolumeM3 = (cement!.quantity) / 290;
      expect(cementVolumeM3).toBeCloseTo(result.totals.totalVolume, 1);
    });

    it("не предлагает одновременно купить готовый бетон и компоненты", () => {
      expect(findMaterial(result, "Бетон М200")).toBeUndefined();
    });

    it("показывает предупреждение, что таблица компонентов не является рецептом", () => {
      expect(result.warnings.some((warning) => warning.includes("не рецепт"))).toBe(true);
    });
  });

  describe("Ввод по площади и толщине", () => {
    const result = calc({
      inputMode: 1,
      area: 20,
      thickness: 200,
      concreteGrade: 3,
      manualMix: 0,
      reserve: 5,
    });

    it("считает чистый объём как площадь × толщину", () => {
      expect(result.totals.sourceVolume).toBeCloseTo(4, 3);
    });

    it("оставляет готовый список материалов для закупки", () => {
      const concrete = findMaterial(result, "Бетон М200");
      expect(concrete).toBeDefined();
      expect(concrete?.purchaseQty).toBeGreaterThan(4);
    });
  });

  describe("Граничные условия", () => {
    it("округляет готовую смесь по выбранному шагу поставщика", () => {
      const result = calc({
        concreteVolume: 5,
        concreteGrade: 3,
        manualMix: 0,
        reserve: 5,
        readyMixOrderStepM3: 0.5,
      });
      expect(result.scenarios.REC.exact_need).toBe(5.25);
      expect(result.scenarios.REC.purchase_quantity).toBe(5.5);
    });

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
