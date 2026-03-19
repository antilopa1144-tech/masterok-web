import defaultFactorTables from "../configs/factor-tables.json";
import { combineScenarioFactors, type FactorTable, type FieldFactorName } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import { roundDisplay } from "./units";
import {
  type AccuracyMode,
  type MaterialCategory,
  DEFAULT_ACCURACY_MODE,
  getPrimaryMultiplier,
} from "./accuracy";

export interface EnginePackagingConfig {
  unit: string;
  options: Array<{ size: number; label: string }>;
}

export interface EngineCalculatorConfig {
  id: string;
  title: string;
  baseFormula: "putty_area_thickness" | "coating_area_rate";
  baseParams: {
    consumption_kg_per_m2_mm: number;
  };
  enabledFactors: FieldFactorName[];
  packaging: EnginePackagingConfig;
}

export interface FormulaInputs {
  area_m2: number;
  thickness_mm: number;
}

const DEFAULT_TABLE = defaultFactorTables.factors as FactorTable;

function puttyAreaThicknessFormula(inputs: FormulaInputs, consumptionKgPerM2Mm: number): number {
  const area = Math.max(0, inputs.area_m2 ?? 0);
  const thickness = Math.max(0, inputs.thickness_mm ?? 0);
  return area * thickness * consumptionKgPerM2Mm;
}

function coatingAreaRateFormula(inputs: FormulaInputs, consumptionPerM2: number): number {
  const area = Math.max(0, inputs.area_m2 ?? 0);
  return area * consumptionPerM2;
}

export interface AccuracyModeOption {
  mode?: AccuracyMode;
  materialCategory?: MaterialCategory;
}

export function computeEstimate(
  config: EngineCalculatorConfig,
  inputs: FormulaInputs,
  factorTable: FactorTable = DEFAULT_TABLE,
  accuracyOption?: AccuracyModeOption,
): ScenarioBundle {
  const rawBaseExactNeed =
    config.baseFormula === "coating_area_rate"
      ? coatingAreaRateFormula(inputs, config.baseParams.consumption_kg_per_m2_mm)
      : puttyAreaThicknessFormula(inputs, config.baseParams.consumption_kg_per_m2_mm);

  // Apply accuracy mode multiplier to base need (before scenario factors)
  const accuracyMode = accuracyOption?.mode ?? DEFAULT_ACCURACY_MODE;
  const materialCategory = accuracyOption?.materialCategory ?? "generic";
  const accuracyMultiplier = getPrimaryMultiplier(materialCategory, accuracyMode);
  const baseExactNeed = rawBaseExactNeed * accuracyMultiplier;

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, config.enabledFactors, scenario);
    const exactNeed = baseExactNeed * multiplier;

    const packaging = optimizePackaging(
      exactNeed,
      config.packaging.options.map((option) => ({
        size: option.size,
        label: option.label,
        unit: config.packaging.unit,
      })),
    );

    acc[scenario] = {
      exact_need: roundDisplay(exactNeed, 3),
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 3),
      leftover: roundDisplay(packaging.leftover, 3),
      assumptions: [
        `base_formula:${config.baseFormula}`,
        `consumption_kg_per_m2_mm:${config.baseParams.consumption_kg_per_m2_mm}`,
        `accuracy_mode:${accuracyMode}`,
        `accuracy_multiplier:${roundDisplay(accuracyMultiplier, 6)}`,
        `packaging:${packaging.package.label}`,
      ],
      key_factors: {
        ...keyFactors,
        accuracy_multiplier: roundDisplay(accuracyMultiplier, 6),
        field_multiplier: roundDisplay(multiplier, 6),
      },
      buy_plan: {
        package_label: packaging.package.label,
        package_size: packaging.package.size,
        packages_count: packaging.packageCount,
        unit: packaging.package.unit,
      },
    };

    return acc;
  }, {} as ScenarioBundle);

  return scenarios;
}

