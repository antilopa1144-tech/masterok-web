import { describe, it, expect } from "vitest";
import { blindAreaDef } from "../formulas/blind-area";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = blindAreaDef.calculate.bind(blindAreaDef);

describe("Калькулятор отмостки", () => {
  describe("Бетонная отмостка: периметр 40 м, ширина 1.0 м, толщина 100 мм", () => {
    // area = 40 * 1.0 = 40
    // concreteM3 = 40 * 0.1 = 4
    // concreteWithReserve = ceil(4 * 1.05 * 10) / 10 = ceil(42) / 10 = 4.2
    const result = calc({
      perimeter: 40,
      width: 1.0,
      thickness: 100,
      materialType: 0,
      withInsulation: 0,
    });

    it("площадь = 40 м²", () => {
      expect(result.totals.area).toBeCloseTo(40, 2);
    });

    it("бетон М200 присутствует", () => {
      expect(findMaterial(result, "Бетон М200")).toBeDefined();
    });

    it("бетон purchaseQty = 4.2 м³", () => {
      const concrete = findMaterial(result, "Бетон М200");
      expect(concrete?.purchaseQty).toBeCloseTo(4.2, 1);
    });

    it("армирующая сетка ВР-1 при толщине ≥ 100 мм", () => {
      const mesh = findMaterial(result, "Сетка армирующая");
      expect(mesh).toBeDefined();
      // purchaseQty = ceil(40 * 1.1) = ceil(44) = 44
      expect(mesh?.purchaseQty).toBe(44);
    });

    it("демпферная лента присутствует для бетонной", () => {
      expect(findMaterial(result, "Демпферная лента")).toBeDefined();
    });

    it("щебень подготовка = 40 * 0.15 = 6 м³", () => {
      const gravel = findMaterial(result, "Щебень фракция 20-40");
      expect(gravel?.quantity).toBeCloseTo(6, 2);
    });

    it("песок подсыпка = 40 * 0.1 = 4 м³", () => {
      const sand = findMaterial(result, "Песок");
      expect(sand?.quantity).toBeCloseTo(4, 2);
    });

    it("геотекстиль присутствует", () => {
      expect(findMaterial(result, "Геотекстиль")).toBeDefined();
    });

    it("без утепления — нет ЭППС", () => {
      expect(findMaterial(result, "ЭППС")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Бетонная отмостка толщина 70 мм — без армирующей сетки", () => {
    const result = calc({
      perimeter: 40,
      width: 1.0,
      thickness: 70,
      materialType: 0,
      withInsulation: 0,
    });

    it("нет армирующей сетки при толщине < 100", () => {
      expect(findMaterial(result, "Сетка армирующая")).toBeUndefined();
    });
  });

  describe("Тротуарная плитка: периметр 30 м, ширина 0.8 м", () => {
    // area = 30 * 0.8 = 24
    const result = calc({
      perimeter: 30,
      width: 0.8,
      thickness: 100,
      materialType: 1,
      withInsulation: 0,
    });

    it("тротуарная плитка присутствует", () => {
      expect(findMaterial(result, "Тротуарная плитка")).toBeDefined();
    });

    it("плитка purchaseQty = ceil(24 * 1.08) = ceil(25.92) = 26", () => {
      const tile = findMaterial(result, "Тротуарная плитка");
      expect(tile?.purchaseQty).toBe(26);
    });

    it("цементно-песчаная смесь присутствует", () => {
      // mixKg = 24 * 6 = 144, bags = ceil(144/50) = 3
      const mix = findMaterial(result, "Цементно-песчаная");
      expect(mix).toBeDefined();
      expect(mix?.purchaseQty).toBe(3);
    });

    it("бордюрный камень = ceil(30 / 0.5) = 60 шт", () => {
      const border = findMaterial(result, "Бордюрный камень");
      expect(border?.purchaseQty).toBe(60);
    });

    it("демпферная лента (рулон) для non-concrete type", () => {
      // damperLengthReserve = 30 * 1.1 = 33, rolls = ceil(33/20) = 2
      const damper = findMaterial(result, "Демпферная лента");
      expect(damper).toBeDefined();
      expect(damper?.purchaseQty).toBe(2);
    });

    it("нет бетона М200", () => {
      expect(findMaterial(result, "Бетон М200")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Мягкая отмостка: периметр 40 м, ширина 1.0 м", () => {
    // area = 40
    const result = calc({
      perimeter: 40,
      width: 1.0,
      thickness: 100,
      materialType: 2,
      withInsulation: 0,
    });

    it("профилированная мембрана присутствует", () => {
      const membrane = findMaterial(result, "мембрана HDPE");
      expect(membrane).toBeDefined();
      // purchaseQty = ceil(40 * 1.15) = ceil(46) = 46
      expect(membrane?.purchaseQty).toBe(46);
    });

    it("щебень декоративный = 40 * 0.1 = 4 м³", () => {
      const pebble = findMaterial(result, "Щебень декоративный");
      expect(pebble?.quantity).toBeCloseTo(4, 2);
    });

    it("нет бетона М200 и плитки", () => {
      expect(findMaterial(result, "Бетон М200")).toBeUndefined();
      expect(findMaterial(result, "Тротуарная плитка")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("С утеплением ЭППС 50 мм", () => {
    const result = calc({
      perimeter: 40,
      width: 1.0,
      thickness: 100,
      materialType: 0,
      withInsulation: 50,
    });

    it("ЭППС присутствует", () => {
      const epps = findMaterial(result, "ЭППС");
      expect(epps).toBeDefined();
    });

    it("ЭППС плит = ceil(40 * 1.05 / 0.72) = ceil(58.33) = 59", () => {
      const epps = findMaterial(result, "ЭППС");
      expect(epps?.purchaseQty).toBe(Math.ceil(40 * 1.05 / 0.72));
    });
  });

  describe("Предупреждения", () => {
    it("ширина < 0.8 м → предупреждение", () => {
      const result = calc({ perimeter: 40, width: 0.6, thickness: 100, materialType: 0, withInsulation: 0 });
      expect(result.warnings.some((w) => w.includes("0.6 м"))).toBe(true);
    });

    it("всегда предупреждение об уклоне", () => {
      const result = calc({ perimeter: 40, width: 1.0, thickness: 100, materialType: 0, withInsulation: 0 });
      expect(result.warnings.some((w) => w.includes("Уклон"))).toBe(true);
    });

    it("всегда предупреждение о компенсационном шве", () => {
      const result = calc({ perimeter: 40, width: 1.0, thickness: 100, materialType: 0, withInsulation: 0 });
      expect(result.warnings.some((w) => w.includes("Компенсационный шов"))).toBe(true);
    });
  });
});
