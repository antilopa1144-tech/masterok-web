import { describe, expect, it } from "vitest";
import { getRecommendedThicknessMm } from "../insulation-smart";
import { INSULATION_APPLICATION } from "../insulation-application";
import { syncDependentFields } from "../field-sync";
import { insulationDef } from "../formulas/insulation";

describe("insulation-smart × application", () => {
  it("пол: рекомендуемая толщина ниже, чем для стен (центр России)", () => {
    const floor = getRecommendedThicknessMm(1, INSULATION_APPLICATION.FLOOR);
    const wall = getRecommendedThicknessMm(1, INSULATION_APPLICATION.FACADE);
    expect(floor).toBe(100);
    expect(wall).toBe(150);
  });

  it("цоколь: своя шкала толщин", () => {
    expect(getRecommendedThicknessMm(1, INSULATION_APPLICATION.FOUNDATION)).toBe(100);
  });

  it("смена регионального ориентира не подменяет проектную толщину", () => {
    const next = {
      application: INSULATION_APPLICATION.FACADE,
      climateZone: 4,
      materialForm: 0,
      productId: 2,
      thickness: 100,
    };

    syncDependentFields(insulationDef, "climateZone", 4, next);

    expect(next.thickness).toBe(100);
  });

  it("при смене товара выбирает ближайшую доступную толщину, а не зональный ориентир", () => {
    const next = {
      application: INSULATION_APPLICATION.FLOOR,
      climateZone: 4,
      materialForm: 0,
      productId: 5,
      thickness: 150,
    };

    syncDependentFields(insulationDef, "productId", 5, next);

    expect(next.thickness).toBe(100);
  });
});
