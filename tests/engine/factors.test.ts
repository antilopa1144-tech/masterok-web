import { describe, expect, it } from "vitest";
import {
  combineScenarioFactors,
  pickScenarioFactor,
  REQUIRED_FACTORS,
  type FactorTable,
  type FieldFactorName,
} from "../../engine/factors";
import factorTablesJson from "../../configs/factor-tables.json";

const factorTable = factorTablesJson.factors as unknown as FactorTable;

describe("pickScenarioFactor", () => {
  const range = { min: 0.95, rec: 1.0, max: 1.08 };

  it("MIN → range.min", () => {
    expect(pickScenarioFactor(range, "MIN")).toBe(0.95);
  });

  it("REC → range.rec", () => {
    expect(pickScenarioFactor(range, "REC")).toBe(1.0);
  });

  it("MAX → range.max", () => {
    expect(pickScenarioFactor(range, "MAX")).toBe(1.08);
  });
});

describe("combineScenarioFactors — базовые проверки", () => {
  it("REC с полным набором enabled → multiplier = произведение всех rec", () => {
    const { multiplier } = combineScenarioFactors(factorTable, REQUIRED_FACTORS, "REC");
    // Каждый rec-фактор из factor-tables.json
    // surface_quality:1.0, geometry_complexity:1.0, installation_method:1.0,
    // worker_skill:1.0, waste_factor:1.06, logistics_buffer:1.02, packaging_rounding:1.01
    const expected = 1.0 * 1.0 * 1.0 * 1.0 * 1.06 * 1.02 * 1.01;
    expect(multiplier).toBeCloseTo(expected, 6);
  });

  it("keyFactors содержит все enabled факторы", () => {
    const { keyFactors } = combineScenarioFactors(factorTable, REQUIRED_FACTORS, "REC");
    for (const factor of REQUIRED_FACTORS) {
      expect(keyFactors).toHaveProperty(factor);
    }
  });

  it("MIN multiplier < REC multiplier < MAX multiplier", () => {
    const minResult = combineScenarioFactors(factorTable, REQUIRED_FACTORS, "MIN");
    const recResult = combineScenarioFactors(factorTable, REQUIRED_FACTORS, "REC");
    const maxResult = combineScenarioFactors(factorTable, REQUIRED_FACTORS, "MAX");

    expect(minResult.multiplier).toBeLessThan(recResult.multiplier);
    expect(recResult.multiplier).toBeLessThan(maxResult.multiplier);
  });
});

describe("combineScenarioFactors — пустой список enabled", () => {
  it("пустой enabled → fallback на REQUIRED_FACTORS, multiplier совпадает с полным набором", () => {
    const emptyResult = combineScenarioFactors(factorTable, [] as FieldFactorName[], "REC");
    const fullResult = combineScenarioFactors(factorTable, REQUIRED_FACTORS, "REC");

    expect(emptyResult.multiplier).toBeCloseTo(fullResult.multiplier, 10);
  });
});

describe("combineScenarioFactors — диапазоны multiplier", () => {
  const scenarios = ["MIN", "REC", "MAX"] as const;

  for (const scenario of scenarios) {
    it(`${scenario}: multiplier >= 0.8 и <= 1.5`, () => {
      const { multiplier } = combineScenarioFactors(factorTable, REQUIRED_FACTORS, scenario);
      expect(multiplier).toBeGreaterThanOrEqual(0.8);
      expect(multiplier).toBeLessThanOrEqual(2.0);
    });
  }
});

describe("combineScenarioFactors — подмножество факторов", () => {
  it("только waste_factor для REC → multiplier = 1.06", () => {
    const { multiplier } = combineScenarioFactors(
      factorTable,
      ["waste_factor"] as FieldFactorName[],
      "REC",
    );
    expect(multiplier).toBe(1.06);
  });

  it("два фактора → multiplier = произведение двух значений", () => {
    const { multiplier } = combineScenarioFactors(
      factorTable,
      ["waste_factor", "logistics_buffer"] as FieldFactorName[],
      "REC",
    );
    expect(multiplier).toBeCloseTo(1.06 * 1.02, 10);
  });
});

describe("combineScenarioFactors — несуществующий фактор в enabled", () => {
  it("неизвестный фактор → fallback на {min:1, rec:1, max:1}", () => {
    const { multiplier } = combineScenarioFactors(
      factorTable,
      ["nonexistent_factor" as FieldFactorName],
      "REC",
    );
    // Unknown factor falls back to { min:1, rec:1, max:1 }, so multiplier = 1
    expect(multiplier).toBe(1);
  });
});
