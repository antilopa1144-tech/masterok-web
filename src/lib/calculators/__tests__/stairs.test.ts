import { describe, it, expect } from "vitest";
import { stairsDef } from "../formulas/stairs";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = stairsDef.calculate.bind(stairsDef);

describe("Калькулятор лестницы", () => {
  describe("Деревянная: высота 2.8 м, ступень 170 мм, проступь 280 мм, ширина 1.0 м", () => {
    // stepCount = round(2.8 / 0.17) = round(16.47) = 16
    // realStepH = 2.8 / 16 = 0.175
    // horizLen = (16 - 1) * 0.28 = 15 * 0.28 = 4.2
    // stringerLen = sqrt(2.8^2 + 4.2^2) = sqrt(25.48) ≈ 5.048
    // railingLen = 4.2 * 2 = 8.4
    const result = calc({
      floorHeight: 2.8,
      stepHeight: 170,
      stepWidth: 280,
      stairWidth: 1.0,
      materialType: 0,
    });

    it("stepCount = 16", () => {
      expect(result.totals.stepCount).toBe(16);
    });

    it("horizLen = 4.2 м", () => {
      // Engine: totals.horizLen
      expect(result.totals.horizLen).toBeCloseTo(4.2, 2);
    });

    it("stringerLen ≈ 5.048 м", () => {
      const expected = Math.sqrt(2.8 * 2.8 + 4.2 * 4.2);
      // Engine: totals.stringerLen
      expect(result.totals.stringerLen).toBeCloseTo(expected, 2);
    });

    it("realStepH = 0.175 м", () => {
      // Engine: totals.realStepH
      expect(result.totals.realStepH).toBeCloseTo(0.175, 3);
    });

    it("тетива/косоур присутствует", () => {
      // Engine: "Тетива/косоур (XYZ)"
      expect(findMaterial(result, "Тетива/косоур")).toBeDefined();
    });

    it("ступени = 16 шт", () => {
      // Engine: "Ступени (XYZ)"
      const tread = findMaterial(result, "Ступени");
      expect(tread?.quantity).toBe(16);
    });

    it("подступенки = 16 шт", () => {
      // Engine: "Подступенки (XYZ)"
      const riser = findMaterial(result, "Подступенки");
      expect(riser?.quantity).toBe(16);
    });

    it("саморезы присутствуют", () => {
      // Engine: "Саморезы"
      expect(findMaterial(result, "Саморезы")).toBeDefined();
    });

    it("перила (поручень) присутствуют", () => {
      // Engine: "Перила (поручень)"
      const railing = findMaterial(result, "Перила");
      expect(railing).toBeDefined();
      // railingLen = 4.2 * 2 = 8.4
      expect(railing?.quantity).toBeCloseTo(8.4, 2);
    });

    it("балясины присутствуют", () => {
      // Engine: "Балясины"
      const bal = findMaterial(result, "Балясины");
      expect(bal).toBeDefined();
      expect(bal?.quantity).toBeGreaterThan(0);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Бетонная лестница (materialType = 1)", () => {
    const result = calc({
      floorHeight: 2.8,
      stepHeight: 170,
      stepWidth: 280,
      stairWidth: 1.0,
      materialType: 1,
    });

    it("бетон М300 присутствует", () => {
      // Engine: "Бетон М300"
      expect(findMaterial(result, "Бетон М300")).toBeDefined();
    });

    it("арматура присутствует", () => {
      // Engine: "Арматура"
      expect(findMaterial(result, "Арматура")).toBeDefined();
    });

    it("нет тетивы/косоура и подступенков (дерево)", () => {
      expect(findMaterial(result, "Тетива/косоур")).toBeUndefined();
      expect(findMaterial(result, "Подступенки")).toBeUndefined();
    });

    it("нет саморезов (бетон)", () => {
      expect(findMaterial(result, "Саморезы")).toBeUndefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Металлокаркас (materialType = 2)", () => {
    const result = calc({
      floorHeight: 2.8,
      stepHeight: 170,
      stepWidth: 280,
      stairWidth: 1.0,
      materialType: 2,
    });

    it("швеллер (каркас) присутствует", () => {
      // Engine: "Швеллер (каркас)"
      expect(findMaterial(result, "Швеллер")).toBeDefined();
    });

    it("болты крепёжные присутствуют", () => {
      // Engine: "Болты крепёжные"
      const bolts = findMaterial(result, "Болты крепёжные");
      expect(bolts).toBeDefined();
      // bolts = stepCount * 4 = 16 * 4 = 64
      expect(bolts?.purchaseQty).toBe(64);
    });

    it("перила (поручень) присутствуют", () => {
      expect(findMaterial(result, "Перила")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("Предупреждения", () => {
    it("высота ступени > порога → предупреждение", () => {
      const result = calc({ floorHeight: 2.8, stepHeight: 200, stepWidth: 280, stairWidth: 1.0, materialType: 0 });
      // Engine: "Высота ступени выше нормы — лестница может быть некомфортной"
      expect(result.warnings.some((w) => w.includes("некомфортной") || w.includes("Высота ступени"))).toBe(true);
    });

    it("много ступеней → предупреждение о площадке", () => {
      const result = calc({ floorHeight: 6.0, stepHeight: 170, stepWidth: 280, stairWidth: 1.0, materialType: 0 });
      // Engine: "Большое количество ступеней — рекомендуется устройство промежуточной площадки"
      expect(result.warnings.some((w) => w.includes("промежуточной площадки"))).toBe(true);
    });
  });

  describe("Минимальная высота (clamped to 2.0)", () => {
    const result = calc({
      floorHeight: 1.0,
      stepHeight: 170,
      stepWidth: 280,
      stairWidth: 1.0,
      materialType: 0,
    });

    it("floorHeight clamped to 2.0, stepCount = round(2.0/0.17) = round(11.76) = 12", () => {
      expect(result.totals.stepCount).toBe(12);
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });
});
