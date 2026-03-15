#!/usr/bin/env npx tsx
/**
 * generate-parity-fixtures.ts
 *
 * For each canonical calculator, runs the TS engine with default inputs
 * and writes the output to a JSON fixture file.
 *
 * Flutter tests then run the same inputs through Dart adapters
 * and compare results — ensuring cross-platform parity.
 *
 * Usage:
 *   npx tsx scripts/generate-parity-fixtures.ts
 *
 * Output:
 *   tests/fixtures/parity/<calculator-id>.parity.json
 */

import * as fs from "fs";
import * as path from "path";

const CONFIGS_DIR = path.resolve(__dirname, "../configs/calculators");
const ENGINE_DIR = path.resolve(__dirname, "../engine");
const FACTOR_TABLE_PATH = path.resolve(__dirname, "../configs/factor-tables.json");
const OUTPUT_DIR = path.resolve(__dirname, "../tests/fixtures/parity");
const FLUTTER_OUTPUT_DIR = path.resolve("C:/probrab1/test/parity_fixtures");

// Mapping from calculator_id to engine module export name
function getEngineFunctionName(calcId: string): string {
  const pascal = calcId
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `computeCanonical${pascal}`;
}

function getEngineFileName(calcId: string): string {
  return calcId + ".ts";
}

interface ParityFixture {
  calculator_id: string;
  formula_version: string;
  generated_at: string;
  cases: Array<{
    id: string;
    description: string;
    inputs: Record<string, number>;
    expected_totals: Record<string, number>;
    expected_materials_count: number;
    expected_material_names: string[];
    expected_warnings_count: number;
    expected_warnings: string[];
    expected_scenarios: {
      MIN: { exact_need: number; purchase_quantity: number };
      REC: { exact_need: number; purchase_quantity: number };
      MAX: { exact_need: number; purchase_quantity: number };
    };
  }>;
}

async function generateFixtures() {
  const factorTable = JSON.parse(fs.readFileSync(FACTOR_TABLE_PATH, "utf-8")).factors;

  const configFiles = fs.readdirSync(CONFIGS_DIR)
    .filter((f) => f.endsWith("-canonical.v1.json"))
    .sort();

  // Ensure output dirs exist
  for (const dir of [OUTPUT_DIR, FLUTTER_OUTPUT_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  let generated = 0;
  let skipped = 0;

  for (const configFile of configFiles) {
    const config = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, configFile), "utf-8"));
    const calcId = config.calculator_id as string;
    const engineFile = getEngineFileName(calcId);
    const enginePath = path.join(ENGINE_DIR, engineFile);

    if (!fs.existsSync(enginePath)) {
      console.log(`  ⚠ Skipping ${calcId}: no engine file ${engineFile}`);
      skipped++;
      continue;
    }

    try {
      // Dynamic import of the engine module (Windows needs file:// URL)
      const engineUrl = new URL(`file:///${enginePath.replace(/\\/g, "/")}`).href;
      const engineModule = await import(engineUrl);
      const fnName = getEngineFunctionName(calcId);
      const computeFn = engineModule[fnName];

      if (typeof computeFn !== "function") {
        console.log(`  ⚠ Skipping ${calcId}: no export ${fnName}`);
        skipped++;
        continue;
      }

      // Build default inputs from input_schema
      const defaultInputs: Record<string, number> = {};
      for (const field of config.input_schema) {
        defaultInputs[field.key] = field.default_value;
      }

      // Run engine with defaults
      const result = computeFn(config, defaultInputs, factorTable);

      const fixture: ParityFixture = {
        calculator_id: calcId,
        formula_version: config.formula_version,
        generated_at: new Date().toISOString(),
        cases: [
          {
            id: "defaults",
            description: `Default inputs for ${calcId}`,
            inputs: defaultInputs,
            expected_totals: result.totals,
            expected_materials_count: result.materials.length,
            expected_material_names: result.materials.map((m: any) => m.name),
            expected_warnings_count: result.warnings.length,
            expected_warnings: result.warnings,
            expected_scenarios: {
              MIN: {
                exact_need: result.scenarios.MIN.exact_need,
                purchase_quantity: result.scenarios.MIN.purchase_quantity,
              },
              REC: {
                exact_need: result.scenarios.REC.exact_need,
                purchase_quantity: result.scenarios.REC.purchase_quantity,
              },
              MAX: {
                exact_need: result.scenarios.MAX.exact_need,
                purchase_quantity: result.scenarios.MAX.purchase_quantity,
              },
            },
          },
        ],
      };

      const outName = `${calcId}.parity.json`;
      fs.writeFileSync(path.join(OUTPUT_DIR, outName), JSON.stringify(fixture, null, 2), "utf-8");
      fs.writeFileSync(path.join(FLUTTER_OUTPUT_DIR, outName), JSON.stringify(fixture, null, 2), "utf-8");
      generated++;
    } catch (err: any) {
      console.log(`  ⚠ Skipping ${calcId}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n✓ Generated ${generated} parity fixtures`);
  if (skipped > 0) {
    console.log(`  ${skipped} calculators skipped (no engine or errors)`);
  }
  console.log(`  Web: ${OUTPUT_DIR}/`);
  console.log(`  Flutter: ${FLUTTER_OUTPUT_DIR}/`);
}

generateFixtures();
