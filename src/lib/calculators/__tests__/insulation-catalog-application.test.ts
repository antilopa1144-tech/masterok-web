import { describe, expect, it } from "vitest";
import {
  buildProductSelectOptions,
  filterProductsForContext,
  getDefaultProductIdForApplication,
  productMatchesApplication,
} from "../insulation-catalog";
import { INSULATION_APPLICATION } from "../insulation-application";
import { getInsulationProduct } from "../insulation-catalog";

describe("insulation-catalog × application", () => {
  it("пол: по умолчанию ЭППС (пеноплекс), не лёгкая минвата", () => {
    expect(getDefaultProductIdForApplication(INSULATION_APPLICATION.FLOOR, 0)).toBe(5);
  });

  it("пол: лёгкая Rockwool Light Batt не в списке плит", () => {
    const opts = buildProductSelectOptions(0, INSULATION_APPLICATION.FLOOR);
    expect(opts.some((o) => o.value === 1)).toBe(false);
    expect(opts.some((o) => o.value === 5)).toBe(true);
    expect(opts.some((o) => o.value === 11)).toBe(true);
  });

  it("пол: рулоны доступны, напыление — нет", () => {
    const rolls = filterProductsForContext(1, INSULATION_APPLICATION.FLOOR);
    expect(rolls.length).toBeGreaterThan(0);
    expect(rolls.every((p) => p.form === "rolls")).toBe(true);
  });

  it("фасад: только фасадные плиты", () => {
    const opts = buildProductSelectOptions(0, INSULATION_APPLICATION.FACADE);
    expect(opts.some((o) => o.value === 2)).toBe(true);
    expect(opts.some((o) => o.value === 5)).toBe(false);
  });

  it("productMatchesApplication учитывает applications", () => {
    const light = getInsulationProduct(1)!;
    expect(productMatchesApplication(light, INSULATION_APPLICATION.FLOOR)).toBe(false);
    expect(productMatchesApplication(light, INSULATION_APPLICATION.INTERNAL)).toBe(true);
  });
});
