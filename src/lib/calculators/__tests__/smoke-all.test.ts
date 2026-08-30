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

      // Большинство калькуляторов всегда формируют закупку. Вентиляция намеренно
      // ждёт явную длину трассы и ведомость, чтобы не выдумывать материалы по площади.
      expect(result.materials).toBeDefined();
      if (calc.id === "engineering_ventilation") {
        expect(result.materials).toHaveLength(0);
        expect(result.warnings.some((warning) => warning.includes("длину трассы"))).toBe(true);
      } else {
        expect(result.materials.length).toBeGreaterThan(0);
      }

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
        expect(item?.leftover, `${calc.slug}: ${scenario} leftover != purchase - exact`).toBeCloseTo(
          (item?.purchase_quantity ?? 0) - (item?.exact_need ?? 0),
          5,
        );
        expect(item?.assumptions.length, `${calc.slug}: ${scenario} assumptions empty`).toBeGreaterThan(0);
        expect(Object.keys(item?.key_factors ?? {}).length, `${calc.slug}: ${scenario} key_factors empty`).toBeGreaterThan(0);

        const buyPlan = item?.buy_plan;
        expect(buyPlan?.package_label, `${calc.slug}: ${scenario} package_label empty`).toBeTruthy();
        expect(buyPlan?.unit, `${calc.slug}: ${scenario} buy_plan unit empty`).toBeTruthy();
        expect(buyPlan?.package_size, `${calc.slug}: ${scenario} package_size invalid`).toBeGreaterThan(0);
        expect(buyPlan?.packages_count, `${calc.slug}: ${scenario} packages_count invalid`).toBeGreaterThanOrEqual(0);
        if ((buyPlan?.packages_count ?? 0) > 0) {
          expect(
            (buyPlan?.packages_count ?? 0) * (buyPlan?.package_size ?? 0),
            `${calc.slug}: ${scenario} buy_plan does not reproduce purchase_quantity`,
          ).toBeCloseTo(item?.purchase_quantity ?? 0, 5);
        }
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
