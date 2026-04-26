import { describe, it, expect } from "vitest";
import { lawnDef } from "../formulas/lawn";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(lawnDef.calculate.bind(lawnDef));

describe("Калькулятор газона", () => {
  describe("Defaults: 50 м² посевной обычный, суглинок, 12 см грунта", () => {
    const result = calc({
      area: 50,
      lawnType: 0,
      soilThickness: 12,
      groundType: 1,
      usageIntensity: 1,
      withDrainage: 0,
      withGeotextile: 0,
    });

    it("норма посева для обычного газона = 40 г/м²", () => {
      expect(result.totals.seedRatePerM2).toBe(40);
    });

    it("семян = 50 × 40 × 1.10 / 1000 = 2.2 кг", () => {
      expect(result.totals.seedKg).toBeCloseTo(2.2, 2);
    });

    it("пачек семян = ceil(2.2) = 3 (по 1 кг)", () => {
      expect(result.totals.seedPacks).toBe(3);
    });

    it("плодородный грунт = 50 × 0.12 × 1.20 = 7.2 м³", () => {
      expect(result.totals.topsoilM3).toBeCloseTo(7.2, 2);
    });

    it("удобрение = 50 × 40 × 1.05 / 1000 = 2.1 кг, 1 пачка по 5 кг", () => {
      expect(result.totals.fertilizerKg).toBeCloseTo(2.1, 2);
      expect(result.totals.fertilizerPacks).toBe(1);
    });

    it("без рулонов / стимулятора / геотекстиля / дренажа", () => {
      expect(result.totals.rollsCount).toBe(0);
      expect(result.totals.stimulatorCans).toBe(0);
      expect(result.totals.geotextileRolls).toBe(0);
      expect(result.totals.drainageSandM3).toBe(0);
    });

    it("в материалах семена, грунт, удобрение, каток", () => {
      expect(findMaterial(result, "Семена газона")).toBeDefined();
      expect(findMaterial(result, "Плодородный грунт")).toBeDefined();
      expect(findMaterial(result, "Удобрение")).toBeDefined();
      expect(findMaterial(result, "Каток")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Декоративный газон (партер) — норма 30 г/м²", () => {
    const result = calc({
      area: 100,
      lawnType: 0,
      soilThickness: 10,
      groundType: 0,
      usageIntensity: 0,
      withDrainage: 0,
      withGeotextile: 0,
    });

    it("норма = 30 г/м²", () => {
      expect(result.totals.seedRatePerM2).toBe(30);
    });

    it("семян = 100 × 30 × 1.10 / 1000 = 3.3 кг", () => {
      expect(result.totals.seedKg).toBeCloseTo(3.3, 2);
    });
  });

  describe("Спортивный газон — норма 50 г/м²", () => {
    const result = calc({
      area: 100,
      lawnType: 0,
      soilThickness: 15,
      groundType: 1,
      usageIntensity: 2,
      withDrainage: 0,
      withGeotextile: 0,
    });

    it("норма = 50 г/м²", () => {
      expect(result.totals.seedRatePerM2).toBe(50);
    });

    it("семян = 100 × 50 × 1.10 / 1000 = 5.5 кг", () => {
      expect(result.totals.seedKg).toBeCloseTo(5.5, 2);
    });

    it("предупреждение: спортивный из семян долго формируется", () => {
      expect(result.warnings.some((w) => w.includes("Спортивный") || w.includes("1.5-2 года"))).toBe(true);
    });
  });

  describe("Рулонный газон 100 м²", () => {
    const result = calc({
      area: 100,
      lawnType: 1,
      soilThickness: 12,
      groundType: 1,
      usageIntensity: 1,
      withDrainage: 0,
      withGeotextile: 0,
    });

    it("рулонов = ceil(100 × 1.07 / 0.8) = 134", () => {
      expect(result.totals.rollsCount).toBe(134);
    });

    it("без семян (только рулоны)", () => {
      expect(result.totals.seedKg).toBe(0);
      expect(result.totals.seedPacks).toBe(0);
    });

    it("стимулятор укоренения = 1 канистра 5 л (100 × 25 = 2500 мл < 5000)", () => {
      expect(result.totals.stimulatorMl).toBe(2500);
      expect(result.totals.stimulatorCans).toBe(1);
    });

    it("в материалах рулоны и стимулятор", () => {
      expect(findMaterial(result, "Рулонный газон")).toBeDefined();
      expect(findMaterial(result, "Стимулятор укоренения")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("С дренажом и геотекстилем", () => {
    const result = calc({
      area: 50,
      lawnType: 0,
      soilThickness: 12,
      groundType: 2,
      usageIntensity: 1,
      withDrainage: 1,
      withGeotextile: 1,
    });

    it("дренажный песок = 50 × 0.10 × 1.20 = 6 м³", () => {
      expect(result.totals.drainageSandM3).toBeCloseTo(6, 2);
    });

    it("геотекстиль = ceil(50 × 1.10 / 50) = 2 рулона", () => {
      expect(result.totals.geotextileRolls).toBe(2);
    });

    it("в материалах дренаж и геотекстиль", () => {
      expect(findMaterial(result, "Песок дренажный")).toBeDefined();
      expect(findMaterial(result, "Геотекстиль")).toBeDefined();
    });
  });

  describe("Предупреждения", () => {
    it("глина без дренажа → предупреждение", () => {
      const result = calc({
        area: 50,
        lawnType: 0,
        soilThickness: 12,
        groundType: 2,
        usageIntensity: 1,
        withDrainage: 0,
        withGeotextile: 0,
      });
      expect(result.warnings.some((w) => w.includes("Глинист") || w.includes("дренаж"))).toBe(true);
    });

    it("спортивный + тонкий грунт (12 см) → предупреждение", () => {
      const result = calc({
        area: 50,
        lawnType: 0,
        soilThickness: 12,
        groundType: 1,
        usageIntensity: 2,
        withDrainage: 0,
        withGeotextile: 0,
      });
      expect(result.warnings.some((w) => w.includes("спортивн") || w.includes("15"))).toBe(true);
    });

    it("большая площадь > 200 м² → предупреждение про автополив", () => {
      const result = calc({
        area: 300,
        lawnType: 0,
        soilThickness: 12,
        groundType: 1,
        usageIntensity: 1,
        withDrainage: 0,
        withGeotextile: 0,
      });
      expect(result.warnings.some((w) => w.includes("полив") || w.includes("дождеватели"))).toBe(true);
    });
  });

  describe("Сценарии MIN ≤ REC ≤ MAX", () => {
    const result = calc({
      area: 50,
      lawnType: 0,
      soilThickness: 12,
      groundType: 1,
      usageIntensity: 1,
      withDrainage: 0,
      withGeotextile: 0,
    });

    it("MIN ≤ REC ≤ MAX", () => {
      expect(result.scenarios!.MIN.exact_need).toBeLessThanOrEqual(result.scenarios!.REC.exact_need);
      expect(result.scenarios!.REC.exact_need).toBeLessThanOrEqual(result.scenarios!.MAX.exact_need);
    });
  });

  describe("Граничные значения", () => {
    it("малый газон 5 м² работает", () => {
      const result = calc({
        area: 5,
        lawnType: 0,
        soilThickness: 10,
        groundType: 0,
        usageIntensity: 0,
        withDrainage: 0,
        withGeotextile: 0,
      });
      checkInvariants(result);
    });

    it("большой 2000 м² работает", () => {
      const result = calc({
        area: 2000,
        lawnType: 1,
        soilThickness: 15,
        groundType: 1,
        usageIntensity: 2,
        withDrainage: 1,
        withGeotextile: 1,
      });
      checkInvariants(result);
      expect(result.totals.rollsCount).toBeGreaterThan(2500);
    });
  });
});
