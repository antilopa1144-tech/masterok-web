import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";

const FIXTURES_DIR = path.resolve(__dirname, "fixtures/parity");
const CONFIGS_DIR = path.resolve(__dirname, "../configs/calculators");
const ENGINE_DIR = path.resolve(__dirname, "../engine");
const FACTOR_TABLE = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../configs/factor-tables.json"), "utf-8"),
).factors;

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
          const result = engineModule[fnName](config, testCase.inputs, FACTOR_TABLE);

          expect(result.materials.length).toBe(testCase.expected_materials_count);
        });

        it(`${testCase.id}: scenario REC exact_need matches`, async () => {
          const configFile = `${calcId}-canonical.v1.json`;
          const config = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, configFile), "utf-8"));
          const enginePath = path.join(ENGINE_DIR, `${calcId}.ts`);
          const engineUrl = new URL(`file:///${enginePath.replace(/\\/g, "/")}`).href;
          const engineModule = await import(engineUrl);
          const fnName = getEngineFunctionName(calcId);
          const result = engineModule[fnName](config, testCase.inputs, FACTOR_TABLE);

          expect(result.scenarios.REC.exact_need).toBeCloseTo(
            testCase.expected_scenarios.REC.exact_need,
            4,
          );
        });

        it(`${testCase.id}: warnings count matches`, async () => {
          const configFile = `${calcId}-canonical.v1.json`;
          const config = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, configFile), "utf-8"));
          const enginePath = path.join(ENGINE_DIR, `${calcId}.ts`);
          const engineUrl = new URL(`file:///${enginePath.replace(/\\/g, "/")}`).href;
          const engineModule = await import(engineUrl);
          const fnName = getEngineFunctionName(calcId);
          const result = engineModule[fnName](config, testCase.inputs, FACTOR_TABLE);

          expect(result.warnings.length).toBe(testCase.expected_warnings_count);
        });
      }
    });
  }
});
