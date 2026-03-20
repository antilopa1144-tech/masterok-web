#!/usr/bin/env npx tsx
/**
 * Validate smart packaging algorithm against real-world scenarios.
 *
 * Run: npx tsx scripts/validate-packaging.ts
 *
 * Ensures:
 * - Max 2 different container types per material
 * - Display names are human-readable
 * - No wasteful combinations (e.g., 4×1L instead of 1×5L)
 * - Coverage: purchased ≥ needed
 */

import { pickOptimalContainers, PRIMER_CONTAINERS, PAINT_CONTAINERS } from "../engine/smart-packaging";

interface TestCase {
  name: string;
  needed: number;
  containers: typeof PRIMER_CONTAINERS;
  maxContainerTypes: number;
  maxWastePercent: number;
}

const testCases: TestCase[] = [
  // Primer scenarios (real rooms)
  { name: "Грунтовка: туалет 2м²", needed: 0.3, containers: PRIMER_CONTAINERS, maxContainerTypes: 1, maxWastePercent: 999 },
  { name: "Грунтовка: ванная 6м²", needed: 0.9, containers: PRIMER_CONTAINERS, maxContainerTypes: 1, maxWastePercent: 999 },
  { name: "Грунтовка: комната 15м²", needed: 2.25, containers: PRIMER_CONTAINERS, maxContainerTypes: 1, maxWastePercent: 150 },
  { name: "Грунтовка: зал 25м²", needed: 3.75, containers: PRIMER_CONTAINERS, maxContainerTypes: 1, maxWastePercent: 40 },
  { name: "Грунтовка: квартира 50м²", needed: 7.5, containers: PRIMER_CONTAINERS, maxContainerTypes: 1, maxWastePercent: 35 },
  { name: "Грунтовка: квартира 80м² (2 слоя)", needed: 24, containers: PRIMER_CONTAINERS, maxContainerTypes: 2, maxWastePercent: 25 },
  { name: "Грунтовка: дом 200м²", needed: 30, containers: PRIMER_CONTAINERS, maxContainerTypes: 1, maxWastePercent: 15 },
  { name: "Грунтовка: большой объект 500м²", needed: 75, containers: PRIMER_CONTAINERS, maxContainerTypes: 2, maxWastePercent: 10 },

  // Paint scenarios
  { name: "Краска: 1 стена 10м²", needed: 2, containers: PAINT_CONTAINERS, maxContainerTypes: 1, maxWastePercent: 30 },
  { name: "Краска: комната 40м²", needed: 8, containers: PAINT_CONTAINERS, maxContainerTypes: 1, maxWastePercent: 25 },
  { name: "Краска: квартира 120м²", needed: 24, containers: PAINT_CONTAINERS, maxContainerTypes: 2, maxWastePercent: 10 },

  // Edge cases
  { name: "Ровно 10 л", needed: 10, containers: PRIMER_CONTAINERS, maxContainerTypes: 1, maxWastePercent: 0 },
  { name: "Ровно 5 л", needed: 5, containers: PRIMER_CONTAINERS, maxContainerTypes: 1, maxWastePercent: 0 },
  { name: "0.1 л (почти ничего)", needed: 0.1, containers: PRIMER_CONTAINERS, maxContainerTypes: 1, maxWastePercent: 999 },
];

let passed = 0;
let failed = 0;

console.log("📦 Validating packaging algorithm\n");
console.log("Нужно    │ Покупаем  │ Тара                  │ Отход  │ Статус");
console.log("─────────┼───────────┼───────────────────────┼────────┼───────");

for (const tc of testCases) {
  const result = pickOptimalContainers(tc.needed, tc.containers);
  const wastePercent = tc.needed > 0 ? ((result.totalVolume - tc.needed) / tc.needed) * 100 : 0;
  const containerTypes = result.breakdown.filter((b) => b.count > 0).length;

  const issues: string[] = [];

  // Check coverage
  if (result.totalVolume < tc.needed) {
    issues.push(`purchased (${result.totalVolume}) < needed (${tc.needed})`);
  }

  // Check max container types
  if (containerTypes > tc.maxContainerTypes) {
    issues.push(`${containerTypes} types (max ${tc.maxContainerTypes})`);
  }

  // Check waste
  if (wastePercent > tc.maxWastePercent) {
    issues.push(`waste ${wastePercent.toFixed(0)}% > ${tc.maxWastePercent}%`);
  }

  // Check display sanity (no more than 2 different sizes in name)
  const plusCount = (result.displayName.match(/\+/g) || []).length;
  if (plusCount > 1) {
    issues.push(`display has ${plusCount + 1} parts: "${result.displayName}"`);
  }

  const status = issues.length === 0 ? "✅" : "❌";
  if (issues.length === 0) passed++; else failed++;

  const neededStr = `${tc.needed.toFixed(1)} л`.padEnd(8);
  const boughtStr = `${result.totalVolume.toFixed(1)} л`.padEnd(9);
  const displayStr = result.displayName.padEnd(21);
  const wasteStr = `${wastePercent.toFixed(0)}%`.padEnd(6);

  console.log(`${neededStr} │ ${boughtStr} │ ${displayStr} │ ${wasteStr} │ ${status}`);
  if (issues.length > 0) {
    for (const issue of issues) {
      console.log(`         │           │                       │        │   ↳ ${issue}`);
    }
  }
}

console.log(`\n📊 ${passed}/${passed + failed} scenarios passed`);
if (failed > 0) process.exit(1);
