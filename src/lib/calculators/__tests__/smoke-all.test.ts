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

      expect(result.scenarios, `${calc.slug}: scenarios missing`).toBeDefined();
      for (const scenario of ["MIN", "REC", "MAX"] as const) {
        const item = result.scenarios?.[scenario];
        expect(item, `${calc.slug}: ${scenario} missing`).toBeDefined();
        expect(item?.exact_need, `${calc.slug}: ${scenario} exact_need invalid`).toBeGreaterThanOrEqual(0);
        expect(item?.purchase_quantity, `${calc.slug}: ${scenario} purchase < exact`).toBeGreaterThanOrEqual(item?.exact_need ?? 0);
        expect(item?.leftover, `${calc.slug}: ${scenario} leftover negative`).toBeGreaterThanOrEqual(-0.01);
        expect(item?.assumptions.length, `${calc.slug}: ${scenario} assumptions empty`).toBeGreaterThan(0);
        expect(Object.keys(item?.key_factors ?? {}).length, `${calc.slug}: ${scenario} key_factors empty`).toBeGreaterThan(0);
      }

      expect(result.scenarios!.MIN.exact_need, `${calc.slug}: MIN > REC`).toBeLessThanOrEqual(result.scenarios!.REC.exact_need);
      expect(result.scenarios!.REC.exact_need, `${calc.slug}: REC > MAX`).toBeLessThanOrEqual(result.scenarios!.MAX.exact_need);

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
