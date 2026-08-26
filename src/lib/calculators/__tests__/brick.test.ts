import { describe, it, expect } from "vitest";
import { brickDef } from "../formulas/brick";
import { findMaterial, checkInvariants, withBasicAccuracy } from "./_helpers";

const calc = withBasicAccuracy(brickDef.calculate.bind(brickDef));

describe("Калькулятор кирпича", () => {
  describe("По размерам: 6×2.7 м, одинарный, 1 кирпич, нормальные условия", () => {
    // area = 6*2.7 = 16.2, bricksPerM2 = BRICKS_PER_SQM[0][1] = 102
    // bricksNeeded = ceil(16.2 * 102 * 1.05) = ceil(16.2 * 107.1) = ceil(1735.02) = 1736
    const result = calc({
      inputMode: 0,
      wallWidth: 6,
      wallHeight: 2.7,
      brickType: 0,
      wallThickness: 1,
      workingConditions: 1,
    });

    it("содержит кирпич в материалах", () => {
      const brick = findMaterial(result, "Кирпич");
      expect(brick).toBeDefined();
    });

    it("отделяет чистую потребность, выбранный запас и целую покупку", () => {
      const brick = findMaterial(result, "Кирпич");
      // Чисто: 16.2 × 102 = 1652.4; выбранный запас 5% = 1735.02.
      expect(brick?.quantity).toBeCloseTo(1652.4, 5);
      expect(brick?.withReserve).toBeCloseTo(1735.02, 5);
      expect(brick?.purchaseQty).toBe(1736);
    });

    it("площадь в totals = 16.2 м²", () => {
      expect(result.totals.area).toBeCloseTo(16.2, 1);
    });

    it("содержит цемент", () => {
      expect(findMaterial(result, "Цемент")).toBeDefined();
    });

    it("содержит песок", () => {
      expect(findMaterial(result, "Песок")).toBeDefined();
    });

    it("инварианты", () => {
      checkInvariants(result);
    });
  });

  describe("По площади, полуторный кирпич 0.5 кирпича", () => {
    // bricksPerM2 = BRICKS_PER_SQM[1][0] = 39
    // area = 20, bricksNeeded = ceil(20 * 39 * 1.05) = ceil(819) = 819
    const result = calc({
      inputMode: 1,
      area: 20,
      brickType: 1,
      wallThickness: 0,
      workingConditions: 1,
    });

    it("кирпича 819 шт с выбранным запасом 5%", () => {
      const brick = findMaterial(result, "Кирпич");
      expect(brick?.quantity).toBe(780);
      expect(brick?.withReserve).toBe(819);
      expect(brick?.purchaseQty).toBe(819);
    });

    it("wallThickness=0 → предупреждение о ненесущих перегородках", () => {
      expect(result.warnings.some((w) => w.includes("ненесущих перегородок"))).toBe(true);
    });
  });

  describe("Предупреждения", () => {
    it("wallThickness=0 → толщина 0.5 кирпича только для перегородок", () => {
      const result = calc({
        inputMode: 1,
        area: 10,
        brickType: 0,
        wallThickness: 0,
        workingConditions: 1,
      });
      expect(result.warnings.some((w) => w.includes("ненесущих перегородок"))).toBe(true);
    });

    it("большой объём раствора → предупреждение о бетономешалке", () => {
      const result = calc({
        inputMode: 1,
        area: 40,
        brickType: 0,
        wallThickness: 1,
        workingConditions: 1,
      });
      expect(result.warnings.some((w) => w.includes("бетономешалка"))).toBe(true);
    });
  });

  describe("Армирование и многослойные стены", () => {
    it("не добавляет гибкие связи только из-за толщины кладки", () => {
      const result = calc({
        inputMode: 1,
        area: 10,
        brickType: 0,
        wallThickness: 2,
        workingConditions: 1,
      });
      expect(findMaterial(result, "Гибкие связи")).toBeUndefined();
      expect(result.warnings.some((w) => w.includes("многослойной стены"))).toBe(true);
    });

    it("выдаёт кладочную сетку в погонных метрах, а не в квадратных", () => {
      const result = calc({
        inputMode: 0,
        wallWidth: 6,
        wallHeight: 2.7,
        brickType: 0,
        wallThickness: 1,
        workingConditions: 1,
      });
      const mesh = findMaterial(result, "Кладочная сетка");
      expect(mesh?.unit).toBe("п.м.");
      expect(result.totals.meshLengthM).toBeGreaterThan(0);
    });
  });

  describe("Прозрачный запас", () => {
    it("не добавляет второй скрытый запас режимами точности", () => {
      const inputs = { wallWidth: 5, wallHeight: 3, brickType: 0, wallThickness: 1, wasteMode: 0 };
      const results = ["basic", "realistic", "professional"].map((accuracyMode) =>
        brickDef.calculate({ ...inputs, accuracyMode }),
      );

      for (const r of results) {
        const brick = findMaterial(r, "Кирпич");
        expect(r.scenarios.MIN.exact_need).toBe(1530);
        expect(r.scenarios.REC.exact_need).toBeCloseTo(1606.5, 5);
        expect(r.scenarios.MAX.exact_need).toBe(1683);
        expect(brick?.quantity).toBe(1530);
        expect(brick?.withReserve).toBeCloseTo(1606.5, 5);
        expect(brick?.purchaseQty).toBe(1607);
        expect(r.accuracyExplanation?.combinedMultiplier).toBe(1);
      }
    });

    it("REC следует выбранному запасу, MAX не превышает доступные в форме 10%", () => {
      const minimal = calc({ wallWidth: 5, wallHeight: 3, wasteMode: 2 });
      const reinforced = calc({ wallWidth: 5, wallHeight: 3, wasteMode: 1 });

      expect(minimal.scenarios.REC.exact_need).toBeCloseTo(1530 * 1.03, 5);
      expect(minimal.scenarios.MAX.exact_need).toBe(1683);
      expect(reinforced.scenarios.REC.exact_need).toBe(1683);
      expect(reinforced.scenarios.MAX.exact_need).toBe(1683);
    });
  });
});
