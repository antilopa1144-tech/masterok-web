import { describe, it, expect } from "vitest";
import { brickDef } from "../formulas/brick";
import { findMaterial, checkInvariants } from "./_helpers";

const calc = brickDef.calculate.bind(brickDef);

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

    it("кирпича 1736 шт (с 5% запасом)", () => {
      const brick = findMaterial(result, "Кирпич");
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

    it("кирпича 819 шт", () => {
      const brick = findMaterial(result, "Кирпич");
      expect(brick?.purchaseQty).toBe(819);
    });

    it("предупреждение о кладке > 15 м²", () => {
      expect(result.warnings.some((w) => w.includes("армирование"))).toBe(true);
    });
  });

  describe("Условия работы", () => {
    it("мороз → предупреждение о противоморозных добавках", () => {
      const result = calc({
        inputMode: 1,
        area: 10,
        brickType: 0,
        wallThickness: 1,
        workingConditions: 3,
      });
      expect(result.warnings.some((w) => w.includes("мороз"))).toBe(true);
    });

    it("жара → предупреждение о смачивании", () => {
      const result = calc({
        inputMode: 1,
        area: 10,
        brickType: 0,
        wallThickness: 1,
        workingConditions: 4,
      });
      expect(result.warnings.some((w) => w.includes("смачив"))).toBe(true);
    });
  });

  describe("Толщина 1.5+ кирпича — гибкие связи", () => {
    it("содержит гибкие связи при 1.5 кирпича", () => {
      const result = calc({
        inputMode: 1,
        area: 10,
        brickType: 0,
        wallThickness: 2,
        workingConditions: 1,
      });
      expect(findMaterial(result, "Гибкие связи")).toBeDefined();
    });
  });
});
