import { computeEstimate, type EngineCalculatorConfig, type AccuracyModeOption } from "../../../engine/compute";
import type { FactorTable, FieldFactorName } from "../../../engine/factors";
import type { CalculatorScenarios } from "./types";
import { type AccuracyMode, type MaterialCategory, DEFAULT_ACCURACY_MODE } from "../../../engine/accuracy";

const ENABLED_FACTORS: FieldFactorName[] = [
  "surface_quality",
  "geometry_complexity",
  "installation_method",
  "worker_skill",
  "waste_factor",
  "logistics_buffer",
  "packaging_rounding",
];

const NATIVE_FACTOR_TABLE: FactorTable = {
  surface_quality: { min: 0.99, rec: 1, max: 1.05 },
  geometry_complexity: { min: 0.99, rec: 1, max: 1.06 },
  installation_method: { min: 0.99, rec: 1, max: 1.04 },
  worker_skill: { min: 0.98, rec: 1, max: 1.03 },
  waste_factor: { min: 0.98, rec: 1, max: 1.08 },
  logistics_buffer: { min: 1, rec: 1, max: 1.04 },
  packaging_rounding: { min: 1, rec: 1, max: 1.02 },
};

interface BuildNativeScenariosParams {
  id: string;
  title: string;
  exactNeed: number;
  unit: string;
  packageSizes: number[];
  packageLabelPrefix: string;
  accuracyMode?: AccuracyMode;
  materialCategory?: MaterialCategory;
}

export function buildNativeScenarios(params: BuildNativeScenariosParams): CalculatorScenarios {
  const exactNeed = Math.max(0, params.exactNeed);
  const uniqueSizes = Array.from(new Set(params.packageSizes.filter((size) => size > 0)));

  const options = uniqueSizes.length > 0 ? uniqueSizes : [1];

  const config: EngineCalculatorConfig = {
    id: params.id,
    title: params.title,
    baseFormula: "coating_area_rate",
    baseParams: {
      consumption_kg_per_m2_mm: 1,
    },
    enabledFactors: ENABLED_FACTORS,
    packaging: {
      unit: params.unit,
      options: options.map((size) => ({
        size,
        label: `${params.packageLabelPrefix}-${size}${params.unit}`,
      })),
    },
  };

  const accuracyOpt: AccuracyModeOption = {
    mode: params.accuracyMode ?? DEFAULT_ACCURACY_MODE,
    materialCategory: params.materialCategory ?? "generic",
  };

  return computeEstimate(
    config,
    {
      area_m2: exactNeed,
      thickness_mm: 1,
    },
    NATIVE_FACTOR_TABLE,
    accuracyOpt,
  );
}

