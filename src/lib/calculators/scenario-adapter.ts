import type { CalculateFn, CalculatorResult, MaterialResult, CalculatorScenarios, ScenarioName } from "./types";
import factorTables from "../../../configs/factor-tables.json";
import { combineScenarioFactors, REQUIRED_FACTORS, type FactorTable } from "../../../engine/factors";
import { roundDisplay } from "../../../engine/units";

const PRIMARY_CATEGORY_PRIORITY = [
  "Основное",
  "Финишная",
  "Стартовая",
  "Компоненты",
  "Раствор",
  "Кабель",
  "Греющий элемент",
  "Труба",
] as const;

const SCENARIO_NAMES: ScenarioName[] = ["MIN", "REC", "MAX"];
const DEFAULT_FACTOR_TABLE = factorTables.factors as FactorTable;

function decimalPlaces(value: number): number {
  const text = value.toString();
  const dotIndex = text.indexOf(".");
  if (dotIndex === -1) return 0;
  return Math.min(3, text.length - dotIndex - 1);
}

function roundPurchaseLikeBaseline(value: number, baselinePurchase: number): number {
  const baseDecimals = decimalPlaces(baselinePurchase);

  if (baseDecimals === 0) {
    return Math.ceil(value);
  }

  const step = 10 ** baseDecimals;
  return Math.ceil(value * step) / step;
}

function pickPrimaryMaterial(materials: MaterialResult[]): MaterialResult | undefined {
  if (materials.length === 0) return undefined;

  for (const category of PRIMARY_CATEGORY_PRIORITY) {
    const byCategory = materials.find((m) => m.category === category);
    if (byCategory) return byCategory;
  }

  return materials[0];
}

function getFallbackExactNeed(result: CalculatorResult): number {
  const firstPositiveTotal = Object.values(result.totals).find((v) => typeof v === "number" && Number.isFinite(v) && v > 0);
  if (firstPositiveTotal) return firstPositiveTotal;
  return 0;
}

function hasCompleteScenarios(result: CalculatorResult): boolean {
  if (!result.scenarios) return false;
  return SCENARIO_NAMES.every((name) => {
    const scenario = result.scenarios?.[name];
    return Boolean(
      scenario
      && Number.isFinite(scenario.exact_need)
      && Number.isFinite(scenario.purchase_quantity)
      && Array.isArray(scenario.assumptions)
      && scenario.buy_plan,
    );
  });
}

function buildScenariosFromPrimary(
  slug: string,
  result: CalculatorResult,
  primary: MaterialResult | undefined,
): CalculatorScenarios {
  const baseExact = Math.max(0, primary?.quantity ?? getFallbackExactNeed(result));
  const basePurchaseRaw = primary?.purchaseQty ?? primary?.withReserve ?? baseExact;
  const basePurchase = Math.max(baseExact, basePurchaseRaw);
  const purchaseRatio = baseExact > 0 ? basePurchase / baseExact : 1;

  const packageSize = decimalPlaces(basePurchase) === 0 ? 1 : 1 / (10 ** decimalPlaces(basePurchase));
  const packageLabel = primary?.name ?? `legacy-${slug}`;
  const packageUnit = primary?.unit ?? "unit";

  return SCENARIO_NAMES.reduce((acc, scenarioName) => {
    const { multiplier, keyFactors } = combineScenarioFactors(DEFAULT_FACTOR_TABLE, REQUIRED_FACTORS, scenarioName);
    const exactNeed = roundDisplay(baseExact * multiplier, 3);
    const purchase = roundPurchaseLikeBaseline(exactNeed * purchaseRatio, basePurchase);
    const purchaseQuantity = Math.max(exactNeed, roundDisplay(purchase, 3));
    const leftover = roundDisplay(Math.max(0, purchaseQuantity - exactNeed), 3);

    const assumptions = [
      `legacy_adapter:${slug}`,
      `primary_material:${packageLabel}`,
    ];

    acc[scenarioName] = {
      exact_need: exactNeed,
      purchase_quantity: purchaseQuantity,
      leftover,
      assumptions,
      key_factors: {
        ...keyFactors,
        field_multiplier: roundDisplay(multiplier, 6),
      },
      buy_plan: {
        package_label: packageLabel,
        package_size: packageSize,
        packages_count: Math.max(1, Math.ceil(purchaseQuantity / packageSize)),
        unit: packageUnit,
      },
    };

    return acc;
  }, {} as CalculatorScenarios);
}

export function ensureScenarioContract(slug: string, result: CalculatorResult): CalculatorResult {
  if (hasCompleteScenarios(result)) return result;

  const primary = pickPrimaryMaterial(result.materials);
  const scenarios = buildScenariosFromPrimary(slug, result, primary);

  return {
    ...result,
    scenarios,
  };
}

export function withScenarioContract(slug: string, calculate: CalculateFn): CalculateFn {
  return (inputs) => {
    const result = calculate(inputs);
    return ensureScenarioContract(slug, result);
  };
}

