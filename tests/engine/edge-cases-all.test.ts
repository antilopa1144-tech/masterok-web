/**
 * Universal edge-case tests for ALL calculators.
 *
 * Automatically discovers all canonical spec JSON files and corresponding
 * engine modules, then runs the same battery of tests on each:
 *
 * 1. Empty inputs {} — no crash, valid structure
 * 2. All-zero inputs — no NaN/Infinity, purchaseQty >= 0
 * 3. Very large inputs — no crash, finite results
 * 4. MIN <= REC <= MAX scenarios
 * 5. Accuracy mode: basic <= realistic <= professional
 */

import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";
import type { CanonicalCalculatorResult } from "../../engine/canonical";
import type { FactorTable } from "../../engine/factors";

const CONFIGS_DIR = path.resolve(__dirname, "../../configs/calculators");
const ENGINE_DIR = path.resolve(__dirname, "../../engine");
const FACTOR_TABLE = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../configs/factor-tables.json"), "utf-8"),
).factors as FactorTable;

// ── Discover all calculators ────────────────────────────────────────────────

function getEngineFunctionName(calcId: string): string {
  const pascal = calcId
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `computeCanonical${pascal}`;
}

const specFiles = fs
  .readdirSync(CONFIGS_DIR)
  .filter((f) => f.endsWith("-canonical.v1.json"))
  .sort();

const calculatorIds = specFiles.map((f) => f.replace("-canonical.v1.json", ""));

// Filter to only calculators that have a matching engine file
const validCalcIds = calculatorIds.filter((id) => {
  const enginePath = path.join(ENGINE_DIR, `${id}.ts`);
  return fs.existsSync(enginePath);
});

// ── Test inputs ─────────────────────────────────────────────────────────────

const ZERO_INPUTS: Record<string, number> = {
  area: 0, length: 0, width: 0, height: 0, thickness: 0,
  inputMode: 0, wallWidth: 0, wallHeight: 0, roomLength: 0,
  roomWidth: 0, roomHeight: 0, floorArea: 0, roomPerimeter: 0,
  concreteVolume: 0, volume: 0, perimeter: 0, layers: 0,
};

const LARGE_INPUTS: Record<string, number> = {
  area: 9999, length: 999, width: 999, height: 10, thickness: 999,
  inputMode: 0, wallWidth: 999, wallHeight: 10, roomLength: 999,
  roomWidth: 999, roomHeight: 10, floorArea: 9999, roomPerimeter: 999,
  concreteVolume: 999, volume: 999, perimeter: 999, layers: 3,
};

// ── Helper to compute ────────────────────────────────────────────────────────

async function compute(
  calcId: string,
  inputs: Record<string, unknown>,
): Promise<CanonicalCalculatorResult> {
  const configFile = `${calcId}-canonical.v1.json`;
  const config = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, configFile), "utf-8"));
  const enginePath = path.join(ENGINE_DIR, `${calcId}.ts`);
  const engineUrl = new URL(`file:///${enginePath.replace(/\\/g, "/")}`).href;
  const engineModule = await import(engineUrl);
  const fnName = getEngineFunctionName(calcId);
  return engineModule[fnName](config, inputs, FACTOR_TABLE);
}

function isFiniteNumber(v: unknown): boolean {
  return typeof v === "number" && Number.isFinite(v);
}

function assertValidResult(result: CanonicalCalculatorResult, label: string) {
  // Structure
  expect(result, `${label}: result exists`).toBeDefined();
  expect(result.materials, `${label}: materials`).toBeDefined();
  expect(result.scenarios, `${label}: scenarios`).toBeDefined();
  expect(result.scenarios.MIN, `${label}: MIN`).toBeDefined();
  expect(result.scenarios.REC, `${label}: REC`).toBeDefined();
  expect(result.scenarios.MAX, `${label}: MAX`).toBeDefined();

  // No NaN/Infinity in scenarios
  for (const key of ["MIN", "REC", "MAX"] as const) {
    expect(isFiniteNumber(result.scenarios[key].exact_need), `${label}: ${key}.exact_need finite`).toBe(true);
    expect(isFiniteNumber(result.scenarios[key].purchase_quantity), `${label}: ${key}.purchase_quantity finite`).toBe(true);
    expect(isFiniteNumber(result.scenarios[key].leftover), `${label}: ${key}.leftover finite`).toBe(true);
  }

  // No NaN/Infinity in materials
  for (let i = 0; i < result.materials.length; i++) {
    const mat = result.materials[i];
    expect(isFiniteNumber(mat.quantity), `${label}: materials[${i}].quantity finite`).toBe(true);
    if (mat.purchaseQty !== undefined) {
      expect(isFiniteNumber(mat.purchaseQty), `${label}: materials[${i}].purchaseQty finite`).toBe(true);
      expect(mat.purchaseQty, `${label}: materials[${i}].purchaseQty >= 0`).toBeGreaterThanOrEqual(0);
    }
  }

  // No NaN/Infinity in totals
  for (const [key, value] of Object.entries(result.totals)) {
    if (typeof value === "number") {
      expect(Number.isFinite(value), `${label}: totals.${key} finite`).toBe(true);
    }
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe(`Universal edge-cases: ${validCalcIds.length} calculators`, () => {
  // ── 1. Empty inputs — no crash ──

  describe("Empty inputs {} — no crash", () => {
    for (const calcId of validCalcIds) {
      it(calcId, async () => {
        const result = await compute(calcId, { accuracyMode: "basic" });
        assertValidResult(result, `${calcId}/empty`);
      });
    }
  });

  // ── 2. All-zero inputs — no NaN/Infinity ──

  describe("All-zero inputs — no NaN/Infinity", () => {
    for (const calcId of validCalcIds) {
      it(calcId, async () => {
        const result = await compute(calcId, { ...ZERO_INPUTS, accuracyMode: "basic" });
        assertValidResult(result, `${calcId}/zeros`);
      });
    }
  });

  // ── 3. Very large inputs — no crash ──

  describe("Very large inputs — no crash", () => {
    for (const calcId of validCalcIds) {
      it(calcId, async () => {
        const result = await compute(calcId, { ...LARGE_INPUTS, accuracyMode: "basic" });
        assertValidResult(result, `${calcId}/large`);
      });
    }
  });

  // ── 4. MIN <= REC <= MAX for all scenarios ──

  describe("MIN <= REC <= MAX (exact_need)", () => {
    for (const calcId of validCalcIds) {
      it(calcId, async () => {
        const result = await compute(calcId, { accuracyMode: "basic" });
        expect(
          result.scenarios.MIN.exact_need,
          `${calcId}: MIN.exact_need <= REC`,
        ).toBeLessThanOrEqual(result.scenarios.REC.exact_need + 0.001);
        expect(
          result.scenarios.REC.exact_need,
          `${calcId}: REC.exact_need <= MAX`,
        ).toBeLessThanOrEqual(result.scenarios.MAX.exact_need + 0.001);
      });
    }
  });

  describe("MIN <= REC <= MAX (purchase_quantity)", () => {
    for (const calcId of validCalcIds) {
      it(calcId, async () => {
        const result = await compute(calcId, { accuracyMode: "basic" });
        expect(
          result.scenarios.MIN.purchase_quantity,
          `${calcId}: MIN.purchase <= REC`,
        ).toBeLessThanOrEqual(result.scenarios.REC.purchase_quantity);
        expect(
          result.scenarios.REC.purchase_quantity,
          `${calcId}: REC.purchase <= MAX`,
        ).toBeLessThanOrEqual(result.scenarios.MAX.purchase_quantity);
      });
    }
  });

  // ── 5. Accuracy mode: basic result <= realistic <= professional ──

  describe("Accuracy mode: basic <= realistic <= professional (REC.exact_need)", () => {
    for (const calcId of validCalcIds) {
      it(calcId, async () => {
        const [basic, realistic, professional] = await Promise.all([
          compute(calcId, { accuracyMode: "basic" }),
          compute(calcId, { accuracyMode: "realistic" }),
          compute(calcId, { accuracyMode: "professional" }),
        ]);

        // basic <= realistic <= professional (with small tolerance for rounding)
        expect(
          basic.scenarios.REC.exact_need,
          `${calcId}: basic <= realistic`,
        ).toBeLessThanOrEqual(realistic.scenarios.REC.exact_need + 0.01);
        expect(
          realistic.scenarios.REC.exact_need,
          `${calcId}: realistic <= professional`,
        ).toBeLessThanOrEqual(professional.scenarios.REC.exact_need + 0.01);
      });
    }
  });
});
