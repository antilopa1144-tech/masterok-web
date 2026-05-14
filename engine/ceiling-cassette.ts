import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CeilingCassetteCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface CeilingCassetteInputs {
  area?: number;
  cassetteSize?: number;
  roomLength?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── constants ─── */

const CASSETTE_AREAS: Record<number, number> = { 0: 0.354, 1: 0.36, 2: 0.09 };
const CASSETTE_SIZES: Record<number, number> = { 0: 0.595, 1: 0.6, 2: 0.3 };
const CASSETTE_RESERVE = 1.1;
const MAIN_PROFILE_SPACING = 1.2;
const CROSS_PROFILE_SPACING = 0.6;
const HANGER_SPACING = 1.2;
const WALL_PROFILE_LENGTH = 3;
const WALL_PROFILE_RESERVE = 1.05;

/* ─── helpers ─── */

function resolveArea(spec: CeilingCassetteCanonicalSpec, inputs: CeilingCassetteInputs): number {
  return Math.max(1, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 30)));
}

function resolveCassetteSize(spec: CeilingCassetteCanonicalSpec, inputs: CeilingCassetteInputs): number {
  return Math.max(0, Math.min(2, Math.round(inputs.cassetteSize ?? getInputDefault(spec, "cassetteSize", 0))));
}

function resolveRoomLength(spec: CeilingCassetteCanonicalSpec, inputs: CeilingCassetteInputs): number {
  return Math.max(2, Math.min(50, inputs.roomLength ?? getInputDefault(spec, "roomLength", 6)));
}

/* ─── main ─── */

export function computeCanonicalCeilingCassette(
  spec: CeilingCassetteCanonicalSpec,
  inputs: CeilingCassetteInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const area = resolveArea(spec, inputs);
  const cassetteSize = resolveCassetteSize(spec, inputs);
  const roomLength = resolveRoomLength(spec, inputs);

  const roomWidth = area / roomLength;
  const cassetteDim = CASSETTE_SIZES[cassetteSize] ?? 0.595;

  /* Cassettes */
  const cassPerRow = Math.ceil(roomLength / cassetteDim);
  const rows = Math.ceil(roomWidth / cassetteDim);
  const totalCassRaw = Math.ceil(rows * cassPerRow * CASSETTE_RESERVE);
  const totalCass = Math.ceil(totalCassRaw * accuracyMult);

  /* Main profiles (T-bar) */
  const mainRows = Math.ceil(roomWidth / MAIN_PROFILE_SPACING) + 1;
  const mainProfiles = Math.ceil(mainRows * roomLength / MAIN_PROFILE_SPACING);

  /* Cross profiles */
  const crossPerRow = Math.ceil(roomLength / CROSS_PROFILE_SPACING);
  const crossProfiles = mainRows * crossPerRow;

  /* Hangers */
  const hangers = Math.ceil((roomLength / HANGER_SPACING) + 1) * mainRows;

  /* Wall angle profiles */
  const wallProfilePcs = Math.ceil((roomLength + roomWidth) * 2 * WALL_PROFILE_RESERVE / WALL_PROFILE_LENGTH);

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: spec.packaging_rules.package_size,
    label: `cassette-${cassetteSize}`,
    unit: spec.packaging_rules.unit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(totalCass * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `cassetteSize:${cassetteSize}`,
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
    };

    return acc;
  }, {} as ScenarioBundle);

  const recScenario = scenarios.REC;

  const cassetteLabels: Record<number, string> = {
    0: "595×595 мм",
    1: "600×600 мм",
    2: "300×300 мм",
  };

  /* ─── materials ─── */
  const materials: CanonicalMaterialResult[] = [
    {
      name: `Кассета ${cassetteLabels[cassetteSize] ?? "595×595 мм"}`,
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Основное",
    },
    {
      name: "Главный профиль Т-образный",
      quantity: mainProfiles,
      unit: "шт",
      withReserve: mainProfiles,
      purchaseQty: mainProfiles,
      category: "Каркас",
    },
    {
      name: "Поперечный профиль",
      quantity: crossProfiles,
      unit: "шт",
      withReserve: crossProfiles,
      purchaseQty: crossProfiles,
      category: "Каркас",
    },
    {
      name: "Подвес",
      quantity: hangers,
      unit: "шт",
      withReserve: hangers,
      purchaseQty: hangers,
      category: "Крепёж",
    },
    {
      name: "Угловой профиль 3м",
      quantity: wallProfilePcs,
      unit: "шт",
      withReserve: wallProfilePcs,
      purchaseQty: wallProfilePcs,
      category: "Каркас",
    },
  ];

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (area > spec.warnings_rules.large_area_threshold_m2) {
    warnings.push("Большая площадь — рекомендуется профессиональный монтаж");
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("Кассетный потолок — оставьте доступ к коммуникациям, не зашивайте наглухо");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: roundDisplay(area, 3),
      cassetteSize,
      roomLength: roundDisplay(roomLength, 3),
      roomWidth: roundDisplay(roomWidth, 3),
      cassPerRow,
      rows,
      totalCass,
      mainRows,
      mainProfiles,
      crossPerRow,
      crossProfiles,
      hangers,
      wallProfilePcs,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: recScenario.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: recScenario.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(totalCassRaw, "generic", accuracyMode).explanation,
    warnings,
    practicalNotes,
    scenarios,
  };
}
