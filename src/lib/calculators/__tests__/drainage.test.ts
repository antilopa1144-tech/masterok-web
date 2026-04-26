import { describe, it, expect } from "vitest";
import { drainageDef } from "../formulas/drainage";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(drainageDef.calculate.bind(drainageDef));

describe("Калькулятор дренажа участка", () => {
  describe("Defaults: 40 м, Ø110, ёлочка, средний УГВ, с накопителем", () => {
    const result = calc({
      length: 40,
      pipeDiameter: 110,
      drainageType: 1,
      groundwaterRisk: 1,
      withCollector: 1,
    });

    it("суммарная длина траншеи (ёлочка ×1.5) = 60 м", () => {
      expect(result.totals.totalTrenchLength).toBeCloseTo(60, 2);
    });

    it("труба с запасом 5% от длины траншеи = 60 × 1.05 = 63 м", () => {
      expect(result.totals.pipeWithReserveM).toBeCloseTo(63, 2);
    });

    it("песок подсыпки = 60 × 0.30 × 0.10 × 1.20 = 2.16 м³", () => {
      expect(result.totals.sandM3).toBeCloseTo(2.16, 2);
    });

    it("щебень обсыпки = 60 × 0.30 × 0.40 × 1.25 = 9 м³", () => {
      expect(result.totals.gravelM3).toBeCloseTo(9, 2);
    });

    it("геотекстиль = 60 × 1.61 × 1.15 = 111.09 м²", () => {
      expect(result.totals.geotextileM2).toBeCloseTo(111.09, 2);
    });

    it("геотекстиль рулонов = ceil(111.09 / 50) = 3", () => {
      expect(result.totals.geotextileRolls).toBe(3);
    });

    it("колодцы = max(1, ceil(40/50)) + ceil(20/30) = 1 + 1 = 2", () => {
      expect(result.totals.wellCount).toBe(2);
    });

    it("приёмный накопитель присутствует (длина ≥ 20 м)", () => {
      expect(result.totals.collectorCount).toBe(1);
      expect(findMaterial(result, "Приёмный колодец")).toBeDefined();
    });

    it("отводы для ёлочки = 2", () => {
      expect(result.totals.elbowCount).toBe(2);
    });

    it("тройники для ёлочки = 4", () => {
      expect(result.totals.teeCount).toBe(4);
      expect(findMaterial(result, "Тройники")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Линейный дренаж: 25 м, Ø110, без накопителя", () => {
    const result = calc({
      length: 25,
      pipeDiameter: 110,
      drainageType: 2,
      groundwaterRisk: 0,
      withCollector: 0,
    });

    it("длина траншеи = длине трассы (нет ёлочки)", () => {
      expect(result.totals.totalTrenchLength).toBeCloseTo(25, 2);
    });

    it("без тройников (только линейный)", () => {
      expect(result.totals.teeCount).toBe(0);
      expect(findMaterial(result, "Тройники")).toBeUndefined();
    });

    it("без накопителя", () => {
      expect(result.totals.collectorCount).toBe(0);
      expect(findMaterial(result, "Приёмный колодец")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Высокий УГВ: дополнительная обмотка геотекстилем ×1.30", () => {
    const result = calc({
      length: 40,
      pipeDiameter: 110,
      drainageType: 2,
      groundwaterRisk: 2,
      withCollector: 1,
    });

    it("геотекстиль увеличен в 1.30 раза", () => {
      // base = 40 × 1.61 × 1.30 × 1.15 = 96.278
      expect(result.totals.geotextileM2).toBeCloseTo(40 * 1.61 * 1.30 * 1.15, 1);
    });

    it("предупреждение про высокий УГВ", () => {
      expect(result.warnings.some((w) => w.includes("грунтовых вод") || w.includes("УГВ"))).toBe(true);
    });
  });

  describe("Длинная трасса Ø110 — предупреждение про лимит 80 м", () => {
    const result = calc({
      length: 100,
      pipeDiameter: 110,
      drainageType: 2,
      groundwaterRisk: 1,
      withCollector: 1,
    });

    it("предупреждение про превышение 80 м для Ø110", () => {
      expect(result.warnings.some((w) => w.includes("Ø110") && w.includes("80"))).toBe(true);
    });

    it("колодцев минимум 2 на 100 м", () => {
      // ceil(100/50) = 2, ёлочки нет — только base
      expect(result.totals.wellCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Накопитель на короткой трассе — предупреждение", () => {
    const result = calc({
      length: 10,
      pipeDiameter: 110,
      drainageType: 2,
      groundwaterRisk: 0,
      withCollector: 1,
    });

    it("накопитель не считается (длина < 20 м)", () => {
      expect(result.totals.collectorCount).toBe(0);
    });

    it("предупреждение про лишний накопитель", () => {
      expect(result.warnings.some((w) => w.includes("накопит"))).toBe(true);
    });
  });

  describe("Ø160 — другой минимальный уклон", () => {
    const result = calc({
      length: 80,
      pipeDiameter: 160,
      drainageType: 2,
      groundwaterRisk: 1,
      withCollector: 1,
    });

    it("выбран диаметр 160", () => {
      expect(result.totals.pipeDiameter).toBe(160);
    });

    it("в материалах указан Ø160", () => {
      expect(findMaterial(result, "Ø160")).toBeDefined();
    });

    it("нет предупреждения про лимит 80 м (Ø160 справляется)", () => {
      expect(result.warnings.some((w) => w.includes("Ø110") && w.includes("80"))).toBe(false);
    });

    it("в practicalNotes указан минимальный уклон 3 мм/м", () => {
      expect(result.practicalNotes!.some((n) => n.includes("3 мм") || n.includes("3 мм"))).toBe(true);
    });
  });

  describe("Сценарии MIN ≤ REC ≤ MAX", () => {
    const result = calc({
      length: 40,
      pipeDiameter: 110,
      drainageType: 1,
      groundwaterRisk: 1,
      withCollector: 1,
    });

    it("MIN ≤ REC ≤ MAX по exact_need", () => {
      expect(result.scenarios!.MIN.exact_need).toBeLessThanOrEqual(result.scenarios!.REC.exact_need);
      expect(result.scenarios!.REC.exact_need).toBeLessThanOrEqual(result.scenarios!.MAX.exact_need);
    });

    it("REC покупка ≥ exact_need (упаковка)", () => {
      expect(result.scenarios!.REC.purchase_quantity).toBeGreaterThanOrEqual(result.scenarios!.REC.exact_need);
    });
  });

  describe("Граничные значения", () => {
    it("минимум 5 м — расчёт работает", () => {
      const result = calc({
        length: 5,
        pipeDiameter: 110,
        drainageType: 2,
        groundwaterRisk: 0,
        withCollector: 0,
      });
      checkInvariants(result);
      expect(result.totals.wellCount).toBeGreaterThanOrEqual(1);
    });

    it("максимум 500 м — расчёт работает (с предупреждением для Ø110)", () => {
      const result = calc({
        length: 500,
        pipeDiameter: 160,
        drainageType: 2,
        groundwaterRisk: 1,
        withCollector: 1,
      });
      checkInvariants(result);
      expect(result.totals.wellCount).toBeGreaterThanOrEqual(10);
    });
  });
});
