import { describe, expect, it } from "vitest";
import { calculateVetonitLrPlus, type VetonitBagWeight } from "./vetonit-lr-plus";

describe("расход Vetonit LR+", () => {
  it.each<[VetonitBagWeight, number, number, number]>([
    [5, 5, 25, 1],
    [20, 2, 40, 16],
  ])("считает 20 м² со слоем 1 мм для фасовки %i кг", (weight, packages, purchaseKg, leftoverKg) => {
    expect(calculateVetonitLrPlus(20, 1, weight)).toEqual({
      baseNeedKg: 24,
      requiredNeedKg: 24,
      packages,
      purchaseKg,
      leftoverKg,
    });
  });

  it("округляет фасовку только при нехватке целых мешков", () => {
    expect(calculateVetonitLrPlus(10, 5, 20)).toMatchObject({ packages: 3, leftoverKg: 0 });
    expect(calculateVetonitLrPlus(10.01, 5, 20)).toMatchObject({ packages: 4, leftoverKg: 19.94 });
  });
});
