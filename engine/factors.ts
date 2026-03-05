import type { ScenarioName } from "./scenarios";

export type FieldFactorName =
  | "surface_quality"
  | "geometry_complexity"
  | "installation_method"
  | "worker_skill"
  | "waste_factor"
  | "logistics_buffer"
  | "packaging_rounding";

export interface FactorRange {
  min: number;
  rec: number;
  max: number;
}

export type FactorTable = Record<FieldFactorName, FactorRange>;

export const REQUIRED_FACTORS: FieldFactorName[] = [
  "surface_quality",
  "geometry_complexity",
  "installation_method",
  "worker_skill",
  "waste_factor",
  "logistics_buffer",
  "packaging_rounding",
];

export function pickScenarioFactor(range: FactorRange, scenario: ScenarioName): number {
  if (scenario === "MIN") return range.min;
  if (scenario === "MAX") return range.max;
  return range.rec;
}

export function combineScenarioFactors(
  table: FactorTable,
  enabledFactors: FieldFactorName[],
  scenario: ScenarioName,
): { multiplier: number; keyFactors: Record<string, number> } {
  const used = enabledFactors.length > 0 ? enabledFactors : REQUIRED_FACTORS;

  let multiplier = 1;
  const keyFactors: Record<string, number> = {};

  for (const factorName of used) {
    const range = table[factorName] ?? { min: 1, rec: 1, max: 1 };
    const value = pickScenarioFactor(range, scenario);
    multiplier *= value;
    keyFactors[factorName] = value;
  }

  return { multiplier, keyFactors };
}

