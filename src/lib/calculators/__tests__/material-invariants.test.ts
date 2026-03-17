import { describe, it, expect } from "vitest";
import { ALL_CALCULATORS } from "../../calculators";

/**
 * Cross-cutting material invariant tests for all 65 calculators.
 * Validates purchaseQty, packageInfo, and withReserve consistency.
 */

function buildDefaultInputs(calc: (typeof ALL_CALCULATORS)[number]): Record<string, number> {
  const inputs: Record<string, number> = {};
  for (const field of calc.fields) {
    inputs[field.key] = field.defaultValue;
  }
  return inputs;
}

describe("Material invariants — all calculators", () => {
  for (const calc of ALL_CALCULATORS) {
    describe(calc.id, () => {
      const inputs = buildDefaultInputs(calc);
      const result = calc.calculate(inputs);

      it("all materials have finite purchaseQty > 0", () => {
        for (const m of result.materials) {
          expect(Number.isFinite(m.purchaseQty), `${m.name}: purchaseQty not finite`).toBe(true);
          expect(m.purchaseQty, `${m.name}: purchaseQty <= 0`).toBeGreaterThan(0);
        }
      });

      it("purchaseQty >= quantity for all materials", () => {
        for (const m of result.materials) {
          if (m.purchaseQty != null && m.quantity != null) {
            expect(
              m.purchaseQty,
              `${m.name}: purchaseQty (${m.purchaseQty}) < quantity (${m.quantity})`,
            ).toBeGreaterThanOrEqual(m.quantity - 0.01); // tolerance for float rounding
          }
        }
      });

      it("packageInfo.count × packageInfo.size ≈ purchaseQty", () => {
        for (const m of result.materials) {
          if (m.packageInfo) {
            const expected = m.packageInfo.count * m.packageInfo.size;
            expect(
              m.purchaseQty,
              `${m.name}: purchaseQty (${m.purchaseQty}) !== count×size (${expected})`,
            ).toBeCloseTo(expected, 0);
            expect(m.packageInfo.count, `${m.name}: packageInfo.count <= 0`).toBeGreaterThan(0);
            expect(m.packageInfo.size, `${m.name}: packageInfo.size <= 0`).toBeGreaterThan(0);
            expect(m.packageInfo.packageUnit, `${m.name}: packageUnit empty`).toBeTruthy();
          }
        }
      });

      it("withReserve >= quantity when both defined", () => {
        for (const m of result.materials) {
          if (m.withReserve != null && m.quantity != null && m.withReserve !== m.quantity) {
            expect(
              m.withReserve,
              `${m.name}: withReserve (${m.withReserve}) < quantity (${m.quantity})`,
            ).toBeGreaterThanOrEqual(m.quantity - 0.01);
          }
        }
      });

      it("no NaN or Infinity in material fields", () => {
        for (const m of result.materials) {
          expect(Number.isFinite(m.quantity), `${m.name}: quantity not finite`).toBe(true);
          if (m.withReserve != null) {
            expect(Number.isFinite(m.withReserve), `${m.name}: withReserve not finite`).toBe(true);
          }
          if (m.purchaseQty != null) {
            expect(Number.isFinite(m.purchaseQty), `${m.name}: purchaseQty not finite`).toBe(true);
          }
        }
      });
    });
  }
});
