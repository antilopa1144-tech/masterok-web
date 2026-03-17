import { expect } from 'vitest';
import type { CalculatorResult } from "../types";

/** Find a material by partial name match */
export function findMaterial(result: CalculatorResult, namePart: string) {
  return result.materials.find((m) => m.name.includes(namePart));
}

/** Assert basic invariants: materials non-empty, purchaseQty > 0, quantity >= 0.
 * Note: purchaseQty may be < 1 for bulk materials (e.g., 0.7 м³ sand) — that's valid.
 * Note: withReserve and quantity may be in different units so we don't compare them. */
export function checkInvariants(result: CalculatorResult) {
  expect(result.materials.length, "materials must not be empty").toBeGreaterThan(0);
  for (const m of result.materials) {
    expect(m.purchaseQty, `purchaseQty <= 0 for "${m.name}"`).toBeGreaterThan(0);
    expect(m.quantity, `quantity < 0 for "${m.name}"`).toBeGreaterThanOrEqual(0);

    // packageInfo consistency: count × size must equal purchaseQty
    if (m.packageInfo) {
      expect(m.packageInfo.count, `packageInfo.count <= 0 for "${m.name}"`).toBeGreaterThan(0);
      expect(m.packageInfo.size, `packageInfo.size <= 0 for "${m.name}"`).toBeGreaterThan(0);
      expect(m.packageInfo.packageUnit, `packageInfo.packageUnit empty for "${m.name}"`).toBeTruthy();
      const expectedPurchaseQty = m.packageInfo.count * m.packageInfo.size;
      expect(m.purchaseQty, `purchaseQty !== count×size for "${m.name}"`).toBeCloseTo(expectedPurchaseQty, 1);
    }
  }
}
