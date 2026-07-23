import { describe, it, expect } from "vitest";
import { screedDef } from "../formulas/screed";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(screedDef.calculate.bind(screedDef));

describe("Калькулятор стяжки пола", () => {
  describe("ЦПС 1:3, 5×4 м, толщина 50 мм", () => {
    // area = 20, thicknessM = 0.05
    // volume = 20 * 0.05 * 1.15 = 1.15 (усадочный множитель 1.15 для ручного замеса ЦПС 1:3)
    // cementKg = 1.15 * 0.25 * 1300 = 373.75
    // cementBags = ceil(373.75/50) = ceil(7.475) = 8
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      thickness: 50,
      screedType: 0,
    });

    it("площадь = 20 м²", () => {
      expect(result.totals.area).toBe(20);
    });

    it("объём с усадкой 15% = 1.15 м³", () => {
      expect(result.totals.volume).toBeCloseTo(1.15, 3);
    });

    it("цемент 8 мешков × 50 кг = 400 кг", () => {
      const cement = findMaterial(result, "Цемент");
      expect(cement?.purchaseQty).toBe(400);
    });

    it("песок присутствует", () => {
      expect(findMaterial(result, "Песок")).toBeDefined();
    });

    it("армосетка при 50 мм >= 40 мм", () => {
      expect(findMaterial(result, "Сетка армирующая")).toBeDefined();
    });

    it("демпферная лента присутствует", () => {
      expect(findMaterial(result, "Демпферная лента")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Готовая смесь (пескобетон М300)", () => {
    // area=20, thicknessM=0.05, volume_multiplier=1.10 (готовая смесь, заводская)
    // volume = 20 * 0.05 * 1.10 = 1.10 м³
    // массa = 1.10 * 2000 = 2200 кг; мешки 40 кг: ceil(2200/40) = 55 → 2200 кг
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      thickness: 50,
      screedType: 1,
    });

    it("пескобетон М300 присутствует", () => {
      expect(findMaterial(result, "Пескобетон М300")).toBeDefined();
    });

    it("объём с усадкой 10% = 1.10 м³", () => {
      expect(result.totals.volume).toBeCloseTo(1.10, 3);
    });

    it("масса 2200 кг → 55 мешков × 40 кг = 2200 кг", () => {
      const mix = findMaterial(result, "Пескобетон М300");
      expect(mix?.purchaseQty).toBe(2200);
      expect(mix?.packageInfo?.count).toBe(55);
    });
  });

  describe("Полусухая стяжка", () => {
    // area=20, thicknessM=0.05, volume_multiplier=1.07 (полусухая, минимум воды)
    // volume = 20 * 0.05 * 1.07 = 1.07 м³
    // cpsKg = 1.07 * 1800 = 1926
    // Для механизированной полусухой стяжки мешки не являются единицей
    // закупки: показываем ориентировочную массу компонентов.
    const result = calc({
      inputMode: 0,
      length: 5,
      width: 4,
      thickness: 50,
      screedType: 2,
    });

    it("ориентировочная масса сухих компонентов присутствует", () => {
      expect(findMaterial(result, "Сухие компоненты для полусухой")).toBeDefined();
    });

    it("объём с усадкой 7% = 1.07 м³", () => {
      expect(result.totals.volume).toBeCloseTo(1.07, 3);
    });

    it("не выдумывает фасовку 50 кг для механизированной работы", () => {
      const cps = findMaterial(result, "Сухие компоненты для полусухой");
      expect(cps?.quantity).toBe(1926);
      expect(cps?.purchaseQty).toBe(1930);
      expect(cps?.packageInfo).toBeUndefined();
    });

    it("фиброволокно ПП присутствует", () => {
      expect(findMaterial(result, "Фиброволокно")).toBeDefined();
    });

    it("фиброволокно считается по объёму, а не по площади", () => {
      const fiber = findMaterial(result, "Фиброволокно");
      // 1,07 м³ × 0,9 кг/м³ = 0,963 кг → 2 пакета по 0,6 кг.
      expect(fiber?.quantity).toBeCloseTo(0.963, 3);
      expect(fiber?.purchaseQty).toBe(1.2);
      expect(fiber?.packageInfo).toEqual({
        count: 2,
        size: 0.6,
        packageUnit: "пакетов",
      });
    });
  });

  describe("Ручной замес — марка цемента и пропорция", () => {
    const base = { inputMode: 0 as const, length: 5, width: 4, thickness: 50, screedType: 0 };

    it("дефолт (М400, 1:3) не изменился — паритет: цемент 400 кг", () => {
      const result = calc({ ...base, cementGrade: 0, mixProportion: 0 });
      const cement = findMaterial(result, "Цемент");
      expect(cement?.purchaseQty).toBe(400);
      expect(cement?.name).toContain("М400");
    });

    it("М400 1:4 — цемента меньше, чем при 1:3", () => {
      const ref = calc({ ...base, cementGrade: 0, mixProportion: 0 });
      const result = calc({ ...base, cementGrade: 0, mixProportion: 1 });
      const refKg = findMaterial(ref, "Цемент")!.quantity;
      const kg = findMaterial(result, "Цемент")!.quantity;
      expect(kg).toBeLessThan(refKg);
    });

    it("М500 — цемента меньше, чем у М400 при той же пропорции", () => {
      const m400 = calc({ ...base, cementGrade: 0, mixProportion: 0 });
      const m500 = calc({ ...base, cementGrade: 1, mixProportion: 0 });
      const kg400 = findMaterial(m400, "Цемент")!.quantity;
      const kg500 = findMaterial(m500, "Цемент")!.quantity;
      expect(kg500).toBeLessThan(kg400);
      expect(findMaterial(m500, "Цемент")?.name).toContain("М500");
    });

    it("цемент кратен мешку 50 кг (округление вверх)", () => {
      const result = calc({ ...base, cementGrade: 1, mixProportion: 1 });
      const cement = findMaterial(result, "Цемент")!;
      expect(cement.purchaseQty! % 50).toBe(0);
      expect(cement.purchaseQty).toBeGreaterThanOrEqual(cement.quantity);
    });

    it("учитывает выбранную фасовку цемента 25 кг", () => {
      const result = calc({ ...base, cementBagWeight: 25 });
      const cement = findMaterial(result, "Цемент")!;
      expect(cement.packageInfo?.size).toBe(25);
      expect(cement.packageInfo?.count).toBe(15);
      expect(cement.purchaseQty).toBe(375);
    });

    it("не округляет песок до лишней целой тонны", () => {
      const result = calc({ ...base });
      const sand = findMaterial(result, "Песок")!;
      expect(sand.quantity).toBe(1.4);
      expect(sand.purchaseQty).toBe(1.4);
    });
  });

  describe("Готовая смесь — пескобетон", () => {
    const base = { inputMode: 0 as const, length: 5, width: 4, thickness: 50, screedType: 1 };

    it("пескобетон М300 по умолчанию, мешки 40 кг", () => {
      const result = calc({ ...base, readyMix: 0 });
      const mix = findMaterial(result, "Пескобетон");
      expect(mix).toBeDefined();
      expect(mix?.packageInfo?.size).toBe(40);
      expect(mix?.purchaseQty! % 40).toBe(0);
    });

    it("вариант М200 — другое название позиции", () => {
      const result = calc({ ...base, readyMix: 1 });
      expect(findMaterial(result, "цементно-песчаная смесь М200")).toBeDefined();
    });

    it("пересчитывает покупку для мешков 30 кг", () => {
      const result = calc({ ...base, readyBagWeight: 30 });
      const mix = findMaterial(result, "Пескобетон")!;
      expect(mix.packageInfo?.size).toBe(30);
      expect(mix.packageInfo?.count).toBe(74);
      expect(mix.purchaseQty).toBe(2220);
      expect(result.scenarios?.REC.buy_plan.package_size).toBe(30);
    });
  });

  describe("Предупреждения", () => {
    it("толщина > 100 мм → укладка слоями", () => {
      const result = calc({ inputMode: 1, area: 20, thickness: 120, screedType: 0 });
      expect(result.warnings.some((w) => w.includes("слои"))).toBe(true);
    });

    it("площадь > 50 м² → рекомендация готовой цементно-песчаной смеси", () => {
      const result = calc({ inputMode: 1, area: 60, thickness: 50, screedType: 0 });
      expect(result.warnings.some((w) => w.includes("готовую цементно-песчаную смесь"))).toBe(true);
    });
  });
});
