import defaultFactorTables from "../configs/factor-tables.json";
import { combineScenarioFactors, type FactorTable, type FieldFactorName } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import { roundDisplay } from "./units";

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

export function computeEstimate(
  config: EngineCalculatorConfig,
  inputs: FormulaInputs,
  factorTable: FactorTable = DEFAULT_TABLE,
): ScenarioBundle {
  const baseExactNeed =
    config.baseFormula === "coating_area_rate"
      ? coatingAreaRateFormula(inputs, config.baseParams.consumption_kg_per_m2_mm)
      : puttyAreaThicknessFormula(inputs, config.baseParams.consumption_kg_per_m2_mm);

  const scenarios = Object.fromEntries(
    SCENARIOS.map((scenario) => {
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

      return [
        scenario,
        {
          exact_need: roundDisplay(exactNeed, 3),
          purchase_quantity: roundDisplay(packaging.purchaseQuantity, 3),
          leftover: roundDisplay(packaging.leftover, 3),
          assumptions: [
            `base_formula:${config.baseFormula}`,
            `consumption_kg_per_m2_mm:${config.baseParams.consumption_kg_per_m2_mm}`,
            `packaging:${packaging.package.label}`,
          ],
          key_factors: {
            ...keyFactors,
            field_multiplier: roundDisplay(multiplier, 6),
          },
          buy_plan: {
            package_label: packaging.package.label,
            package_size: packaging.package.size,
            packages_count: packaging.packageCount,
            unit: packaging.package.unit,
          },
        },
      ];
    }),
  ) as ScenarioBundle;

  return scenarios;
}

