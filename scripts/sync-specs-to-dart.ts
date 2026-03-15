#!/usr/bin/env npx tsx
/**
 * sync-specs-to-dart.ts
 *
 * Reads all configs/calculators/*-canonical.v1.json files and generates
 * a single Dart file with const Maps for each calculator spec.
 *
 * Usage:
 *   npx tsx scripts/sync-specs-to-dart.ts
 *
 * Output:
 *   C:\probrab1\lib\domain\generated\canonical_specs.g.dart
 *
 * Each adapter can then read its spec from the generated map
 * instead of hardcoding constants.
 */

import * as fs from "fs";
import * as path from "path";

const CONFIGS_DIR = path.resolve(__dirname, "../configs/calculators");
const FACTOR_TABLE_PATH = path.resolve(__dirname, "../configs/factor-tables.json");
const OUTPUT_PATH = path.resolve("C:/probrab1/lib/domain/generated/canonical_specs.g.dart");

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function slugToIdentifier(slug: string): string {
  return snakeToCamel(slug.replace(/-/g, "_"));
}

function dartValue(value: unknown, indent: number): string {
  const pad = "  ".repeat(indent);
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return `'${value.replace(/'/g, "\\'")}'`;
  if (typeof value === "number") {
    // Ensure doubles have decimal point
    return Number.isInteger(value) ? `${value}` : `${value}`;
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.map((v) => `${pad}  ${dartValue(v, indent + 1)},`).join("\n");
    return `[\n${items}\n${pad}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    const items = entries
      .map(([k, v]) => `${pad}  '${k}': ${dartValue(v, indent + 1)},`)
      .join("\n");
    return `{\n${items}\n${pad}}`;
  }
  return String(value);
}

function generateDart(): string {
  const files = fs.readdirSync(CONFIGS_DIR)
    .filter((f) => f.endsWith("-canonical.v1.json"))
    .sort();

  const specs: string[] = [];
  const index: string[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(CONFIGS_DIR, file), "utf-8");
    const json = JSON.parse(raw);
    const calcId = json.calculator_id as string;
    const varName = `${slugToIdentifier(calcId)}SpecData`;

    specs.push(`/// Generated from ${file}`);
    specs.push(`const Map<String, dynamic> ${varName} = ${dartValue(json, 0)};`);
    specs.push("");

    index.push(`  '${calcId}': ${varName},`);
  }

  const header = [
    "// GENERATED FILE — DO NOT EDIT MANUALLY",
    "// Source: configs/calculators/*-canonical.v1.json",
    `// Generated: ${new Date().toISOString().split("T")[0]}`,
    "// Run: npx tsx scripts/sync-specs-to-dart.ts",
    "",
    "// ignore_for_file: prefer_single_quotes, lines_longer_than_80_chars",
    "",
  ];

  const indexMap = [
    "/// Index of all canonical specs by calculator_id.",
    "const Map<String, Map<String, dynamic>> allCanonicalSpecs = {",
    ...index,
    "};",
    "",
  ];

  // Generate factor table from configs/factor-tables.json
  const factorTableLines: string[] = [];
  if (fs.existsSync(FACTOR_TABLE_PATH)) {
    const ftRaw = fs.readFileSync(FACTOR_TABLE_PATH, "utf-8");
    const ftJson = JSON.parse(ftRaw);
    const factors = ftJson.factors as Record<string, { min: number; rec: number; max: number }>;

    factorTableLines.push("/// Default factor table from configs/factor-tables.json");
    factorTableLines.push("const Map<String, Map<String, double>> defaultFactorTable = {");
    for (const [name, range] of Object.entries(factors)) {
      factorTableLines.push(`  '${name}': {'MIN': ${range.min}, 'REC': ${range.rec}, 'MAX': ${range.max}},`);
    }
    factorTableLines.push("};");
    factorTableLines.push("");
  }

  return [...header, ...specs, ...indexMap, ...factorTableLines].join("\n");
}

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const dart = generateDart();
fs.writeFileSync(OUTPUT_PATH, dart, "utf-8");

const configCount = fs.readdirSync(CONFIGS_DIR).filter((f) => f.endsWith("-canonical.v1.json")).length;
console.log(`✓ Generated ${OUTPUT_PATH}`);
console.log(`  ${configCount} calculator specs synced`);
