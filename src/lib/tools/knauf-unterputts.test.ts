import { describe, expect, it } from "vitest";
import { calculateUnterputtsPurchase } from "./knauf-unterputts";

describe("расход КНАУФ-Унтерпутц", () => {
  it("показывает норму на 10 мм без запаса и отдельно округляет мешки", () => {
    expect(calculateUnterputtsPurchase(20, 10)).toEqual({
      baseNeedKg: 340,
      requiredNeedKg: 340,
      packages: 14,
      purchaseKg: 350,
      leftoverKg: 10,
    });
  });

  it("масштабирует норму по средней толщине, в том числе дробной", () => {
    expect(calculateUnterputtsPurchase(12.5, 12.5)).toMatchObject({
      baseNeedKg: 265.625, packages: 11, purchaseKg: 275, leftoverKg: 9.375,
    });
    expect(calculateUnterputtsPurchase(20, 35)).toMatchObject({
      baseNeedKg: 1190, packages: 48, purchaseKg: 1200,
    });
  });

  it("сохраняет целое число мешков на точной границе фасовки", () => {
    expect(calculateUnterputtsPurchase(25, 10)).toMatchObject({ packages: 17, leftoverKg: 0 });
    expect(calculateUnterputtsPurchase(25.0001, 10)).toMatchObject({ packages: 18, leftoverKg: 24.9983 });
  });
});
