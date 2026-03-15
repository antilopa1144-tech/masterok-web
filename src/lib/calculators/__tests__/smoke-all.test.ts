import { describe, it, expect } from "vitest";
import { ALL_CALCULATORS } from "../../calculators";

describe("Smoke test: all calculators execute without errors", () => {
  for (const calc of ALL_CALCULATORS) {
    it(`${calc.id}: returns valid result with default inputs`, () => {
      // Build default inputs from fields
      const inputs: Record<string, number> = {};
      for (const field of calc.fields) {
        inputs[field.key] = field.defaultValue;
      }

      const result = calc.calculate(inputs);

      // Must have materials
      expect(result.materials).toBeDefined();
      expect(result.materials.length).toBeGreaterThan(0);

      // Must have totals
      expect(result.totals).toBeDefined();
      expect(Object.keys(result.totals).length).toBeGreaterThan(0);

      // Warnings must be an array
      expect(Array.isArray(result.warnings)).toBe(true);

      // All materials must have name and unit
      for (const mat of result.materials) {
        expect(mat.name).toBeTruthy();
        expect(mat.unit).toBeTruthy();
        expect(typeof mat.quantity).toBe("number");
        expect(Number.isFinite(mat.quantity)).toBe(true);
      }
    });
  }
});
