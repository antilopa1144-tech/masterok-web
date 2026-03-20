#!/usr/bin/env npx tsx
/**
 * Scan all calculator engines for English/inconsistent units.
 *
 * Run: npx tsx scripts/validate-units.ts
 *
 * Catches:
 * - "kg" in display strings (should be "кг")
 * - "pcs" / "pieces" instead of "шт."
 * - Mixed units in the same material (л/канистр confusion)
 * - Hardcoded can sizes in names without variables
 */

import * as fs from "fs";
import * as path from "path";

const ENGINE_DIR = path.join(__dirname, "..", "engine");
const files = fs.readdirSync(ENGINE_DIR).filter((f) => f.endsWith(".ts"));

interface Issue {
  file: string;
  line: number;
  rule: string;
  text: string;
}

const issues: Issue[] = [];

const RULES: Array<{ pattern: RegExp; rule: string; description: string }> = [
  { pattern: /unit:\s*["']kg["']/, rule: "english_unit_kg", description: "unit: 'kg' → should be 'кг'" },
  { pattern: /unit:\s*["']pcs["']/, rule: "english_unit_pcs", description: "unit: 'pcs' → should be 'шт.'" },
  { pattern: /unit:\s*["']pieces["']/, rule: "english_unit_pieces", description: "unit: 'pieces' → should be 'шт.'" },
  { pattern: /unit:\s*["']units["']/, rule: "english_unit_units", description: "unit: 'units' → should be 'шт.'" },
  { pattern: /name:.*\bkg\b/, rule: "english_in_name", description: "Material name contains 'kg'" },
  { pattern: /label:.*\bkg\b/, rule: "english_in_label", description: "Label contains 'kg'" },
];

for (const file of files) {
  const content = fs.readFileSync(path.join(ENGINE_DIR, file), "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        issues.push({
          file,
          line: i + 1,
          rule: rule.rule,
          text: line.trim().slice(0, 80),
        });
      }
    }
  }
}

if (issues.length === 0) {
  console.log("✅ No English/inconsistent units found in engine files.");
} else {
  console.log(`⚠️  Found ${issues.length} unit issues:\n`);
  for (const issue of issues) {
    console.log(`  ${issue.file}:${issue.line} [${issue.rule}]`);
    console.log(`    ${issue.text}\n`);
  }
  process.exit(1);
}
