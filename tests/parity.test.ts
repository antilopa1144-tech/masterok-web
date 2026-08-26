import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";

const FIXTURES_DIR = path.resolve(__dirname, "fixtures/parity");
const CONFIGS_DIR = path.resolve(__dirname, "../configs/calculators");
const ENGINE_DIR = path.resolve(__dirname, "../engine");
const FACTOR_TABLE = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../configs/factor-tables.json"), "utf-8"),
).factors;

// Parity tests verify normative baseline (matching Flutter).
// Accuracy mode "basic" = no practical modifiers = normative parity.
const PARITY_ACCURACY_INPUTS = { accuracyMode: "basic" };
const SCENARIOS = ["MIN", "REC", "MAX"] as const;

function expectNumericRecordToMatch(
  actual: Record<string, number>,
  expected: Record<string, number>,
  context: string,
) {
  for (const [key, expectedValue] of Object.entries(expected)) {
    expect(actual, `${context}: totals.${key} missing`).toHaveProperty(key);
    expect(actual[key], `${context}: totals.${key}`).toBeCloseTo(expectedValue, 6);
  }
}

function getEngineFunctionName(calcId: string): string {
  const pascal = calcId
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `computeCanonical${pascal}`;
}

const fixtureFiles = fs
  .readdirSync(FIXTURES_DIR)
  .filter((f) => f.endsWith(".parity.json"))
  .sort();

describe("Cross-platform parity: TS engine vs fixtures", () => {
  for (const file of fixtureFiles) {
    const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, file), "utf-8"));
    const calcId = fixture.calculator_id;

    describe(calcId, () => {
      for (const testCase of fixture.cases) {
        it(`${testCase.id}: materials count matches`, async () => {
          const configFile = `${calcId}-canonical.v1.json`;
          const config = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, configFile), "utf-8"));
          const enginePath = path.join(ENGINE_DIR, `${calcId}.ts`);
          const engineUrl = new URL(`file:///${enginePath.replace(/\\/g, "/")}`).href;
          const engineModule = await import(engineUrl);
          const fnName = getEngineFunctionName(calcId);
          const result = engineModule[fnName](config, { ...testCase.inputs, ...PARITY_ACCURACY_INPUTS }, FACTOR_TABLE);

          expect(result.materials.length).toBe(testCase.expected_materials_count);
        });

        it(`${testCase.id}: all scenario exact needs and purchases match`, async () => {
          const configFile = `${calcId}-canonical.v1.json`;
          const config = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, configFile), "utf-8"));
          const enginePath = path.join(ENGINE_DIR, `${calcId}.ts`);
          const engineUrl = new URL(`file:///${enginePath.replace(/\\/g, "/")}`).href;
          const engineModule = await import(engineUrl);
          const fnName = getEngineFunctionName(calcId);
          const result = engineModule[fnName](config, { ...testCase.inputs, ...PARITY_ACCURACY_INPUTS }, FACTOR_TABLE);

          for (const scenario of SCENARIOS) {
            expect(result.scenarios[scenario].exact_need, `${scenario}.exact_need`).toBeCloseTo(
              testCase.expected_scenarios[scenario].exact_need,
              4,
            );
            expect(
              result.scenarios[scenario].purchase_quantity,
              `${scenario}.purchase_quantity`,
            ).toBeCloseTo(testCase.expected_scenarios[scenario].purchase_quantity, 4);
          }
        });

        it(`${testCase.id}: totals match`, async () => {
          const configFile = `${calcId}-canonical.v1.json`;
          const config = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, configFile), "utf-8"));
          const enginePath = path.join(ENGINE_DIR, `${calcId}.ts`);
          const engineUrl = new URL(`file:///${enginePath.replace(/\\/g, "/")}`).href;
          const engineModule = await import(engineUrl);
          const fnName = getEngineFunctionName(calcId);
          const result = engineModule[fnName](config, { ...testCase.inputs, ...PARITY_ACCURACY_INPUTS }, FACTOR_TABLE);

          expectNumericRecordToMatch(result.totals, testCase.expected_totals, `${calcId}/${testCase.id}`);
        });

        it(`${testCase.id}: material names and order match`, async () => {
          const configFile = `${calcId}-canonical.v1.json`;
          const config = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, configFile), "utf-8"));
          const enginePath = path.join(ENGINE_DIR, `${calcId}.ts`);
          const engineUrl = new URL(`file:///${enginePath.replace(/\\/g, "/")}`).href;
          const engineModule = await import(engineUrl);
          const fnName = getEngineFunctionName(calcId);
          const result = engineModule[fnName](config, { ...testCase.inputs, ...PARITY_ACCURACY_INPUTS }, FACTOR_TABLE);

          expect(result.materials.map((material: { name: string }) => material.name)).toEqual(
            testCase.expected_material_names,
          );
        });

        it(`${testCase.id}: warnings match`, async () => {
          const configFile = `${calcId}-canonical.v1.json`;
          const config = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, configFile), "utf-8"));
          const enginePath = path.join(ENGINE_DIR, `${calcId}.ts`);
          const engineUrl = new URL(`file:///${enginePath.replace(/\\/g, "/")}`).href;
          const engineModule = await import(engineUrl);
          const fnName = getEngineFunctionName(calcId);
          const result = engineModule[fnName](config, { ...testCase.inputs, ...PARITY_ACCURACY_INPUTS }, FACTOR_TABLE);

          expect(result.warnings.length).toBe(testCase.expected_warnings_count);
          expect(result.warnings).toEqual(testCase.expected_warnings);
        });
      }
    });
  }
});
