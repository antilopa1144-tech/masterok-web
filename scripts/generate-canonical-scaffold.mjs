#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function toParts(value) {
  return value.split(/[-_]/g).filter(Boolean);
}

function toPascalCase(value) {
  return toParts(value)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function toCamelCase(value) {
  const parts = toParts(value);
  return parts
    .map((part, index) => (index === 0 ? part[0].toLowerCase() + part.slice(1) : part[0].toUpperCase() + part.slice(1)))
    .join('');
}

function ensureFile(targetPath, content, force, dryRun, results) {
  const exists = fs.existsSync(targetPath);
  if (exists && !force) {
    results.push({ targetPath, status: 'skipped' });
    return;
  }
  if (!dryRun) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, 'utf8');
  }
  results.push({ targetPath, status: exists ? 'overwritten' : 'created' });
}

function renderWebSpec(calculator, family, formulaVersion) {
  return `{
  "calculator_id": "${calculator}",
  "formula_version": "${formulaVersion}",
  "input_schema": [
    ${family.canonicalInputs.map((key) => `{ "key": "${key}", "default_value": 0 }`).join(',\n    ')}
  ],
  "field_factors": {
    "enabled": []
  },
  "normative_formula": {},
  "packaging_rules": {},
  "material_rules": {},
  "warnings_rules": {},
  "scenario_policy": {
    "contract": "min-rec-max-v1"
  }
}
`;
}

function renderWebEngine(calculator, formulaVersion) {
  const pascal = toPascalCase(calculator);
  return `import type { CanonicalCalculatorResult } from "./canonical";

interface ${pascal}Inputs {
  [key: string]: number | undefined;
}

export function computeCanonical${pascal}(
  _spec: unknown,
  _inputs: ${pascal}Inputs,
  _factorTable: unknown,
): CanonicalCalculatorResult {
  throw new Error("TODO: implement canonical engine for ${calculator} (${formulaVersion})");
}
`;
}

function renderWebFormula(calculator, slug, formulaVersion) {
  const pascal = toPascalCase(calculator);
  const camel = toCamelCase(calculator);
  return `import type { CalculatorDefinition } from "../types";
import factorTables from "../../../../configs/factor-tables.json";
import canonicalSpecJson from "../../../../configs/calculators/${calculator}-canonical.v1.json";
import { computeCanonical${pascal} } from "../../../../engine/${calculator}";

const canonicalSpec = canonicalSpecJson as never;

export const ${camel}Def: CalculatorDefinition = {
  id: "${calculator}",
  slug: "${slug}",
  formulaVersion: "${formulaVersion}",
  title: "TODO",
  h1: "TODO",
  description: "TODO",
  metaTitle: "TODO",
  metaDescription: "TODO",
  category: "interior",
  categorySlug: "otdelka",
  tags: [],
  popularity: 50,
  complexity: 2,
  fields: [],
  calculate(inputs) {
    return computeCanonical${pascal}(canonicalSpec, inputs, factorTables.factors as never);
  },
};
`;
}

function renderWebTest(calculator) {
  const camel = toCamelCase(calculator);
  return `import { expect, it } from "vitest";
import fixture from "../../../../tests/fixtures/${calculator}-canonical-parity.json";
import { ${camel}Def } from "../formulas/${calculator}";
import { runCanonicalParitySuite } from "./canonical-parity";

const calc = ${camel}Def.calculate.bind(${camel}Def);

it("declares formulaVersion", () => {
  expect(${camel}Def.formulaVersion).toBe(fixture.cases[0]?.expected?.formulaVersion ?? "${calculator}-canonical-v1");
});

runCanonicalParitySuite({
  suiteName: "Canonical ${calculator} fixture parity",
  cases: fixture.cases,
  calculate: calc,
  assertCase(result, expected) {
    expect(result.formulaVersion).toBe(expected.formulaVersion);
  },
});
`;
}

function renderWebFixture(formulaVersion) {
  return `{
  "cases": [
    {
      "id": "todo_case",
      "inputs": {},
      "expected": {
        "formulaVersion": "${formulaVersion}"
      }
    }
  ]
}
`;
}

function renderDoc(calculator, family, formulaVersion) {
  return `# ${toPascalCase(calculator)} parity matrix

- Canonical calculator: ${calculator}
- Family: ${family}
- Formula version: ${formulaVersion}

## Canonical inputs
- TODO: replace with real canonical input notes

## Canonical decisions
- TODO: document normative layer
- TODO: document field layer
- TODO: document packaging layer

## Intentional migration notes
- TODO: list legacy mappings and accepted deviations
`;
}

function renderFlutterAdapter(calculator, formulaVersion) {
  const pascal = toPascalCase(calculator);
  const camel = toCamelCase(calculator);
  return `import '../models/canonical_calculator_contract.dart';

const ${camel}CanonicalSpecV1 = null;

bool hasCanonical${pascal}Inputs(Map<String, double> inputs) {
  return false;
}

Map<String, double> normalizeLegacy${pascal}Inputs(Map<String, double> inputs) {
  return Map<String, double>.from(inputs);
}

CanonicalCalculatorContractResult calculateCanonical${pascal}(Map<String, double> inputs) {
  throw UnimplementedError('TODO: implement canonical adapter for ${calculator} (${formulaVersion})');
}
`;
}

function renderFlutterUsecase(calculator, flutterStem) {
  const pascal = toPascalCase(calculator);
  return `import '../../data/models/price_item.dart';
import '../models/canonical_calculator_contract.dart';
import './base_calculator.dart';
import './calculator_usecase.dart';
import './${flutterStem}_canonical_adapter.dart';

class Calculate${pascal} extends BaseCalculator {
  CanonicalCalculatorContractResult calculateCanonical(Map<String, double> inputs) {
    return calculateCanonical${pascal}(inputs);
  }

  @override
  CalculatorResult calculate(Map<String, double> inputs, List<PriceItem> priceList) {
    final contract = calculateCanonical(inputs);
    return createResult(values: {}, norms: [...normativeSources, contract.formulaVersion]);
  }
}
`;
}

function renderFlutterFixture(formulaVersion) {
  return `{
  "cases": [
    {
      "id": "todo_case",
      "inputs": {},
      "expected": {
        "formulaVersion": "${formulaVersion}"
      }
    }
  ]
}
`;
}

function renderFlutterParityTest(calculator, flutterStem) {
  const pascal = toPascalCase(calculator);
  return `import 'package:flutter_test/flutter_test.dart';
import 'package:probrab_ai/domain/usecases/calculate_${flutterStem}.dart';

import '../../helpers/canonical_parity_harness.dart';

void main() {
  final calculator = Calculate${pascal}();

  runCanonicalParitySuite(
    groupName: 'Calculate${pascal} canonical parity',
    fixturePath: 'test/fixtures/${flutterStem}_canonical_parity.json',
    calculate: calculator.calculateCanonical,
    assertCase: (result, expected, _) {
      expect(result.formulaVersion, expected['formulaVersion']);
    },
  );
}
`;
}

const args = parseArgs(process.argv.slice(2));
for (const key of ['family', 'calculator', 'slug']) {
  if (!args[key]) {
    console.error(`Missing --${key}`);
    process.exit(1);
  }
}

const webRoot = path.resolve(args['web-root'] ?? process.cwd());
const flutterRoot = path.resolve(args['flutter-root'] ?? 'C:/probrab1');
const dryRun = args['dry-run'] === 'true';
const force = args.force === 'true';
const calculator = args.calculator;
const slug = args.slug;
const flutterStem = calculator.replace(/-/g, '_');
const formulaVersion = `${calculator}-canonical-v1`;
const registry = JSON.parse(fs.readFileSync(path.join(webRoot, 'configs', 'canonical-family-templates.json'), 'utf8'));
const family = registry.families[args.family];
if (!family) {
  console.error(`Unknown family: ${args.family}`);
  process.exit(1);
}

const results = [];
ensureFile(path.join(webRoot, 'configs', 'calculators', `${calculator}-canonical.v1.json`), renderWebSpec(calculator, family, formulaVersion), force, dryRun, results);
ensureFile(path.join(webRoot, 'engine', `${calculator}.ts`), renderWebEngine(calculator, formulaVersion), force, dryRun, results);
ensureFile(path.join(webRoot, 'src', 'lib', 'calculators', 'formulas', `${calculator}.ts`), renderWebFormula(calculator, slug, formulaVersion), force, dryRun, results);
ensureFile(path.join(webRoot, 'src', 'lib', 'calculators', '__tests__', `${calculator}.test.ts`), renderWebTest(calculator), force, dryRun, results);
ensureFile(path.join(webRoot, 'tests', 'fixtures', `${calculator}-canonical-parity.json`), renderWebFixture(formulaVersion), force, dryRun, results);
ensureFile(path.join(webRoot, 'docs', 'calculators', `${calculator}-parity-matrix.md`), renderDoc(calculator, args.family, formulaVersion), force, dryRun, results);
ensureFile(path.join(flutterRoot, 'lib', 'domain', 'usecases', `${flutterStem}_canonical_adapter.dart`), renderFlutterAdapter(calculator, formulaVersion), force, dryRun, results);
ensureFile(path.join(flutterRoot, 'lib', 'domain', 'usecases', `calculate_${flutterStem}.dart`), renderFlutterUsecase(calculator, flutterStem), force, dryRun, results);
ensureFile(path.join(flutterRoot, 'test', 'fixtures', `${flutterStem}_canonical_parity.json`), renderFlutterFixture(formulaVersion), force, dryRun, results);
ensureFile(path.join(flutterRoot, 'test', 'domain', 'usecases', `calculate_${flutterStem}_canonical_parity_test.dart`), renderFlutterParityTest(calculator, flutterStem), force, dryRun, results);

for (const item of results) {
  console.log(`${item.status.toUpperCase()} ${item.targetPath}`);
}
