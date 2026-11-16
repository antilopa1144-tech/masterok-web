import { describe, expect, it } from "vitest";
import { calculateFugenPurchase } from "./knauf-fugen";

describe("расход КНАУФ-Фуген", () => {
  it("считает оба значения расхода для сплошного слоя и округляет мешки отдельно", () => {
    const { lower, upper } = calculateFugenPurchase({
      work: "surface", areaM2: 25, thicknessMm: 1, bagWeightKg: 10,
    });
    expect(lower).toEqual({ baseNeedKg: 20, requiredNeedKg: 20, packages: 2, purchaseKg: 20, leftoverKg: 0 });
    expect(upper).toEqual({ baseNeedKg: 25, requiredNeedKg: 25, packages: 3, purchaseKg: 30, leftoverKg: 5 });
  });

  it("использует дробную толщину и одинаковую фасовку для обеих оценок", () => {
    const { lower, upper } = calculateFugenPurchase({
      work: "surface", areaM2: 20.5, thicknessMm: 2.5, bagWeightKg: 25,
    });
    expect(lower).toMatchObject({ baseNeedKg: 41, packages: 2, purchaseKg: 50 });
    expect(upper).toMatchObject({ baseNeedKg: 51.25, packages: 3, purchaseKg: 75 });
  });

  it.each([
    ["gkl", 6, 6, 2, 2],
    ["gvl", 7.2, 14.4, 2, 3],
    ["gklWide", 14.4, 14.4, 3, 3],
  ] as const)("считает стыки %s от площади обшивки", (work, minimum, maximum, minBags, maxBags) => {
    const { lower, upper } = calculateFugenPurchase({ work, areaM2: 24, bagWeightKg: 5 });
    expect(lower).toMatchObject({ baseNeedKg: minimum, requiredNeedKg: minimum, packages: minBags });
    expect(upper).toMatchObject({ baseNeedKg: maximum, requiredNeedKg: maximum, packages: maxBags });
  });
});
