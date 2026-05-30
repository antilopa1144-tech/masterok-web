import { describe, expect, it } from "vitest";
import {
  buildDefaultValuesFromFields,
  mergeCalculatorValues,
  searchCalculators,
} from "./catalog";
import { getCalculatorBySlug } from "@/lib/calculators";

describe("searchCalculators", () => {
  it("находит штукатурку по запросу", () => {
    const hits = searchCalculators("штукатурка", 5);
    expect(hits.some((h) => h.slug === "shtukaturka")).toBe(true);
  });

  it("возвращает популярные при пустом запросе", () => {
    const hits = searchCalculators("", 3);
    expect(hits.length).toBe(3);
  });
});

describe("mergeCalculatorValues", () => {
  it("подставляет дефолты и перекрывает переданные значения", () => {
    const def = getCalculatorBySlug("shtukaturka");
    expect(def).toBeDefined();
    const merged = mergeCalculatorValues(def!.fields, { area: 12, thickness: 10 });
    expect(merged.area).toBe(12);
    expect(merged.thickness).toBe(10);
    expect(merged.length).toBeGreaterThan(0);
  });

  it("buildDefaultValuesFromFields содержит area", () => {
    const def = getCalculatorBySlug("shtukaturka");
    const defaults = buildDefaultValuesFromFields(def!.fields);
    expect(defaults.area).toBeGreaterThan(0);
  });
});
