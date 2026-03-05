import { describe, expect, it } from "vitest";
import { computeEstimate, type EngineCalculatorConfig, type FormulaInputs } from "../../engine/compute";
import factorTables from "../../configs/factor-tables.json";
import demoConfigJson from "../../configs/calculators/demo-putty-area-thickness.json";
import fixture from "../fixtures/demo-putty-input.json";

const config = demoConfigJson as EngineCalculatorConfig;
const inputs = fixture.inputs as FormulaInputs;

describe("Unified engine demo: putty by area and thickness", () => {
  const result = computeEstimate(config, inputs, factorTables.factors);

  it("returns MIN/REC/MAX scenarios", () => {
    expect(Object.keys(result)).toEqual(["MIN", "REC", "MAX"]);
  });

  it("includes mandatory contract fields for each scenario", () => {
    for (const scenario of ["MIN", "REC", "MAX"] as const) {
      expect(result[scenario]).toHaveProperty("exact_need");
      expect(result[scenario]).toHaveProperty("purchase_quantity");
      expect(result[scenario]).toHaveProperty("leftover");
      expect(result[scenario]).toHaveProperty("assumptions");
      expect(result[scenario]).toHaveProperty("key_factors");
      expect(result[scenario]).toHaveProperty("buy_plan");
    }
  });

  it("keeps REC between MIN and MAX exact need", () => {
    expect(result.REC.exact_need).toBeGreaterThanOrEqual(result.MIN.exact_need);
    expect(result.REC.exact_need).toBeLessThanOrEqual(result.MAX.exact_need);
  });

  it("applies packaging to 25kg bags", () => {
    for (const scenario of ["MIN", "REC", "MAX"] as const) {
      expect(result[scenario].buy_plan.package_size).toBe(25);
      expect(result[scenario].purchase_quantity).toBeGreaterThanOrEqual(result[scenario].exact_need);
      expect(result[scenario].leftover).toBeGreaterThanOrEqual(0);
      expect(result[scenario].buy_plan.packages_count).toBe(Math.ceil(result[scenario].purchase_quantity / 25));
    }
  });
});
