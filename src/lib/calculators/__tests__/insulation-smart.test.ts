import { describe, expect, it } from "vitest";
import { buildProductSelectOptions, INSULATION_FORM_ROLLS, INSULATION_FORM_SPRAY } from "../insulation-catalog";
import {
  getRecommendedThicknessMm,
  snapThicknessMm,
  thicknessForClimateAndProduct,
} from "../insulation-smart";
import { insulationDef } from "../formulas/insulation";

describe("insulation-smart", () => {
  it("рекомендуемая толщина по зоне: Центр = 150 мм", () => {
    expect(getRecommendedThicknessMm(1)).toBe(150);
    expect(getRecommendedThicknessMm(0)).toBe(100);
    expect(getRecommendedThicknessMm(4)).toBe(250);
  });

  it("линейки рулонов не содержат плит Rockwool", () => {
    const opts = buildProductSelectOptions(INSULATION_FORM_ROLLS);
    const labels = opts.map((o) => o.label).join(" ");
    expect(labels).toContain("Техно 37");
    expect(labels).toContain("Тепло Roll");
    expect(labels).not.toContain("Лайт Баттс");
    expect(labels).not.toContain("Пеноплэкс");
  });

  it("линейки напыления — только эковата", () => {
    const opts = buildProductSelectOptions(INSULATION_FORM_SPRAY);
    expect(opts.some((o) => o.label.includes("Эковата"))).toBe(true);
    expect(opts.some((o) => o.label.includes("Rockwool"))).toBe(false);
  });

  it("snapThicknessMm подбирает ближайшую из линейки Пеноплэкс", () => {
    expect(snapThicknessMm(150, 5, [])).toBe(100);
    expect(snapThicknessMm(30, 5, [])).toBe(30);
  });

  it("thicknessForClimateAndProduct: Сибирь + Роклайт → 150 мм", () => {
    expect(
      thicknessForClimateAndProduct(3, 3, insulationDef.fields),
    ).toBe(150);
  });
});
