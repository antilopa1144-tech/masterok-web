import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import { buildPrimerMaterial } from "./smart-packaging";
import type {
  GypsumBoardCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface GypsumBoardInputs {
  area?: number;
  constructionType?: number;
  layers?: number;
  gklType?: number;
  profileStep?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── constants ─── */

const SHEET_AREA = 3.0;
const SHEET_RESERVE = 1.1;
const PP_STEP_DEFAULT = 600;
const SCREWS_GKL_PER_SHEET = 24;
const SCREWS_PER_KG = 1000;  // 3.5×25 мм
const DUBEL_STEP = 0.5;
const DUBEL_RESERVE = 1.1;
const SERPYANKA_RESERVE = 1.1;
const PUTTY_PER_SERPYANKA = 0.025;
const PUTTY_BAG = 25;
const PRIMER_L_PER_M2 = 0.15;
const PRIMER_RESERVE = 1.15;
const PRIMER_CAN = 10;
const PROFILE_LENGTH = 3;

/* ─── helpers ─── */

function resolveArea(spec: GypsumBoardCanonicalSpec, inputs: GypsumBoardInputs): number {
  return Math.max(1, Math.min(1000, inputs.area ?? getInputDefault(spec, "area", 40)));
}

function resolveConstructionType(spec: GypsumBoardCanonicalSpec, inputs: GypsumBoardInputs): number {
  return Math.max(0, Math.min(2, Math.round(inputs.constructionType ?? getInputDefault(spec, "constructionType", 0))));
}

function resolveLayers(spec: GypsumBoardCanonicalSpec, inputs: GypsumBoardInputs): number {
  const raw = Math.round(inputs.layers ?? getInputDefault(spec, "layers", 1));
  return raw === 2 ? 2 : 1;
}

function resolveGklType(spec: GypsumBoardCanonicalSpec, inputs: GypsumBoardInputs): number {
  return Math.max(0, Math.min(2, Math.round(inputs.gklType ?? getInputDefault(spec, "gklType", 0))));
}

function resolveProfileStep(spec: GypsumBoardCanonicalSpec, inputs: GypsumBoardInputs): number {
  const raw = inputs.profileStep ?? getInputDefault(spec, "profileStep", 600);
  return raw <= 400 ? 400 : 600;
}

/* ─── main ─── */

export function computeCanonicalGypsumBoard(
  spec: GypsumBoardCanonicalSpec,
  inputs: GypsumBoardInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const area = resolveArea(spec, inputs);
  const constructionType = resolveConstructionType(spec, inputs);
  const layers = resolveLayers(spec, inputs);
  const gklType = resolveGklType(spec, inputs);
  const profileStep = resolveProfileStep(spec, inputs);

  const stepM = profileStep / 1000;

  /* Sheets */
  const sheetsOneSide = Math.ceil(area * layers / SHEET_AREA * SHEET_RESERVE);
  const totalSheets = constructionType === 1 ? sheetsOneSide * 2 : sheetsOneSide;
  const sides = constructionType === 1 ? 2 : 1;

  /* Height estimate */
  const height = constructionType === 2
    ? 1
    : Math.max(2.5, Math.min(4, Math.sqrt(area / 1.5)));
  const wallLength = area / height;

  /* PP profiles */
  const ppCount = constructionType === 2
    ? Math.ceil(wallLength / stepM) * Math.ceil(height / stepM)
    : Math.ceil(wallLength / stepM) + 1;
  const ppMeters = ppCount * height;
  const ppPcs = Math.ceil(ppMeters * 1.05 / PROFILE_LENGTH);

  /* PN guide profiles */
  const guideM = constructionType === 1
    ? (wallLength + height) * 2 * 2
    : (wallLength + height) * 2;
  const guidePcs = Math.ceil(guideM * 1.05 / PROFILE_LENGTH);

  /* Screws & dubels */
  const screwsPcs = totalSheets * SCREWS_GKL_PER_SHEET;
  const screwsKg = Math.ceil(screwsPcs / SCREWS_PER_KG * 10) / 10;
  const dubels = Math.ceil(guideM / DUBEL_STEP * 2 * DUBEL_RESERVE);

  /* Serpyanka */
  const jointsM = Math.ceil(totalSheets * height * layers * SERPYANKA_RESERVE);
  const puttyBags = Math.ceil(jointsM / 10 / PUTTY_BAG);

  /* Primer */
  const primerCans = Math.ceil(area * sides * PRIMER_L_PER_M2 * PRIMER_RESERVE / PRIMER_CAN);

  /* ─── scenarios ─── */
  const totalSheetsRaw = totalSheets;
  const totalSheetsAdj = Math.ceil(totalSheets * accuracyMult);

  const packageOptions = [{
    size: spec.packaging_rules.package_size,
    label: `gkl-sheet-${spec.packaging_rules.package_size}`,
    unit: spec.packaging_rules.unit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(totalSheetsAdj * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `constructionType:${constructionType}`,
        `gklType:${gklType}`,
        `layers:${layers}`,
        `profileStep:${profileStep}`,
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

  /* ─── materials ─── */
  const gklTypeLabels: Record<number, string> = {
    0: "ГКЛ стандартный",
    1: "ГКЛВ влагостойкий",
    2: "ГКЛО огнестойкий",
  };

  const materials: CanonicalMaterialResult[] = [
    {
      name: gklTypeLabels[gklType] ?? "ГКЛ",
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "шт",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Основное",
    },
    {
      name: "Профиль ПП 60×27 3м",
      quantity: ppPcs,
      unit: "шт",
      withReserve: ppPcs,
      purchaseQty: ppPcs,
      category: "Каркас",
    },
    {
      name: "Профиль ПН 27×28 3м",
      quantity: guidePcs,
      unit: "шт",
      withReserve: guidePcs,
      purchaseQty: guidePcs,
      category: "Каркас",
    },
    {
      name: "Саморезы для ГКЛ",
      quantity: screwsKg,
      unit: "кг",
      withReserve: screwsKg,
      purchaseQty: Math.ceil(screwsKg),
      category: "Крепёж",
    },
    {
      name: "Дюбели",
      quantity: dubels,
      unit: "шт",
      withReserve: dubels,
      purchaseQty: dubels,
      category: "Крепёж",
    },
    {
      name: "Серпянка",
      quantity: jointsM,
      unit: "м",
      withReserve: jointsM,
      purchaseQty: jointsM,
      category: "Отделка",
    },
    {
      name: "Шпаклёвка 25 кг",
      quantity: puttyBags,
      unit: "мешков",
      withReserve: puttyBags,
      purchaseQty: puttyBags,
      category: "Отделка",
    },
    {
      ...buildPrimerMaterial(area * sides * PRIMER_L_PER_M2, { reserveFactor: PRIMER_RESERVE }),
      category: "Отделка",
    },
  ];

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (area > spec.warnings_rules.large_area_threshold_m2) {
    warnings.push("Большая площадь — рекомендуется профессиональный монтаж");
  }
  if (layers === 2) {
    warnings.push("Второй слой ГКЛ монтируется со смещением швов");
  }

  const practicalNotes: string[] = [];
  practicalNotes.push("Между ГКЛ и полом оставляйте зазор 10 мм — при усадке дома лист не лопнет");
  if (layers === 2) {
    practicalNotes.push("При двух слоях второй крепите саморезами 35 мм, не 25 мм — иначе не дотянете до профиля");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: roundDisplay(area, 3),
      constructionType,
      layers,
      gklType,
      profileStep,
      sides,
      height: roundDisplay(height, 3),
      wallLength: roundDisplay(wallLength, 3),
      sheetsOneSide,
      totalSheets,
      ppCount,
      ppPcs,
      guidePcs,
      guideM: roundDisplay(guideM, 3),
      screws: screwsKg,
      dubels,
      jointsM,
      puttyBags,
      primerCans,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: recScenario.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: recScenario.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(totalSheetsRaw, "generic", accuracyMode).explanation,
  };
}
