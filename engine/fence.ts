import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  FenceCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

/* ─── constants ─── */

const POST_BURIAL_M = 0.9;
const PROFNASTIL_USEFUL_WIDTH = 1.15;
const PROFNASTIL_RESERVE = 1.02;
const PROFNASTIL_SCREWS_PER_SHEET = 7;
const ROOF_SCREWS_PER_KG = 250;  // 4.8×35 мм (кровельные)
const PRIMER_SPRAY_M_PER_CAN = 20;
const POST_CONCRETE_M3 = 0.03;
const CAPS_RESERVE = 1.05;
const RABICA_ROLL_M = 10;
const TENSION_WIRE_RESERVE = 1.05;
const SLAT_WIDTH = 0.1;
const SLAT_GAP = 0.03;
const SLAT_RESERVE = 1.05;
const ANTISEPTIC_L_PER_M2 = 0.15;
const ANTISEPTIC_CAN_L = 5;
const GATE_WIDTH = 4;
const WICKET_WIDTH = 1;

/* ─── labels ─── */

const FENCE_TYPE_LABELS: Record<number, string> = {
  0: "Профнастил",
  1: "Сетка-рабица",
  2: "Деревянный штакетник",
};

/* ─── inputs ─── */

interface FenceInputs {
  fenceLength?: number;
  fenceHeight?: number;
  fenceType?: number;
  postStep?: number;
  gatesCount?: number;
  wicketsCount?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

/* ─── main ─── */

export function computeCanonicalFence(
  spec: FenceCanonicalSpec,
  inputs: FenceInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const fenceLength = Math.max(5, Math.min(500, inputs.fenceLength ?? getInputDefault(spec, "fenceLength", 50)));
  const fenceHeight = Math.max(1, Math.min(3, inputs.fenceHeight ?? getInputDefault(spec, "fenceHeight", 2)));
  const fenceType = Math.max(0, Math.min(2, Math.round(inputs.fenceType ?? getInputDefault(spec, "fenceType", 0))));
  const postStep = Math.max(2.0, Math.min(3.0, inputs.postStep ?? getInputDefault(spec, "postStep", 2.5)));
  const gatesCount = Math.max(0, Math.min(5, Math.round(inputs.gatesCount ?? getInputDefault(spec, "gatesCount", 1))));
  const wicketsCount = Math.max(0, Math.min(5, Math.round(inputs.wicketsCount ?? getInputDefault(spec, "wicketsCount", 1))));

  /* ─── common geometry ─── */
  const netLength = Math.max(1, fenceLength - gatesCount * GATE_WIDTH - wicketsCount * WICKET_WIDTH);
  const postsCount = Math.ceil(netLength / postStep) + 1 + gatesCount * 2 + wicketsCount * 2;
  const lagsPerSpan = fenceHeight > 2 ? 3 : 2;
  const lagSpans = Math.ceil(netLength / postStep);
  const lagsCount = lagSpans * lagsPerSpan;
  const postLength = roundDisplay(fenceHeight + POST_BURIAL_M, 2);

  /* ─── concrete for posts ─── */
  const concrete = roundDisplay(postsCount * POST_CONCRETE_M3, 3);

  /* ─── caps for posts ─── */
  const caps = Math.ceil(postsCount * CAPS_RESERVE);

  /* ─── type-specific covering ─── */
  let sheets = 0;
  let screws = 0;
  let screwPacks = 0;
  let primerCans = 0;
  let rolls = 0;
  let wireLength = 0;
  let slats = 0;
  let antisepticCans = 0;

  if (fenceType === 0) {
    /* profnastil */
    sheets = Math.ceil(netLength / PROFNASTIL_USEFUL_WIDTH * PROFNASTIL_RESERVE);
    screws = Math.ceil(sheets * PROFNASTIL_SCREWS_PER_SHEET);
    screwPacks = Math.ceil(screws / ROOF_SCREWS_PER_KG * 10) / 10; // now kg
    primerCans = Math.ceil(fenceLength / PRIMER_SPRAY_M_PER_CAN);
  } else if (fenceType === 1) {
    /* rabica */
    rolls = Math.ceil(netLength / RABICA_ROLL_M);
    wireLength = roundDisplay(netLength * lagsPerSpan * TENSION_WIRE_RESERVE, 2);
  } else {
    /* wooden slats */
    slats = Math.ceil(netLength / (SLAT_WIDTH + SLAT_GAP) * SLAT_RESERVE);
    antisepticCans = Math.ceil(netLength * fenceHeight * 2 * ANTISEPTIC_L_PER_M2 / ANTISEPTIC_CAN_L);
  }

  /* ─── scenarios ─── */
  const basePrimaryRaw = fenceType === 0 ? sheets : fenceType === 1 ? rolls : slats;
  const basePrimary = Math.ceil(basePrimaryRaw * accuracyMult);
  const packageUnit = fenceType === 0 ? "шт" : fenceType === 1 ? "рулонов" : "шт";
  const packageLabel = fenceType === 0
    ? "profnastil-sheet"
    : fenceType === 1
      ? "rabica-roll-10m"
      : "wooden-slat";

  const packageOptions = [{
    size: 1,
    label: packageLabel,
    unit: packageUnit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(basePrimary * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `fenceType:${fenceType}`,
        `postStep:${postStep}`,
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
  const materials: CanonicalMaterialResult[] = [
    {
      name: `Столбы 60×60 мм (${postLength} м)`,
      quantity: postsCount,
      unit: "шт",
      withReserve: postsCount,
      purchaseQty: postsCount,
      category: "Каркас",
    },
    {
      name: "Лаги 40×20 мм",
      quantity: lagsCount,
      unit: "шт",
      withReserve: lagsCount,
      purchaseQty: lagsCount,
      category: "Каркас",
    },
  ];

  if (fenceType === 0) {
    materials.push(
      {
        name: `${FENCE_TYPE_LABELS[0]} (${fenceHeight} м)`,
        quantity: roundDisplay(recScenario.exact_need, 6),
        unit: "шт",
        withReserve: Math.ceil(recScenario.exact_need),
        purchaseQty: Math.ceil(recScenario.exact_need),
        category: "Покрытие",
      },
      {
        name: "Саморезы кровельные",
        quantity: screwPacks,
        unit: "кг",
        withReserve: screwPacks,
        purchaseQty: Math.ceil(screwPacks),
        category: "Крепёж",
      },
      {
        name: "Грунт-спрей для срезов",
        quantity: primerCans,
        unit: "баллонов",
        withReserve: primerCans,
        purchaseQty: primerCans,
        category: "Защита",
      },
    );
  } else if (fenceType === 1) {
    materials.push(
      {
        name: `${FENCE_TYPE_LABELS[1]} (${fenceHeight} м, рулон ${RABICA_ROLL_M} м)`,
        quantity: roundDisplay(recScenario.exact_need, 6),
        unit: "рулонов",
        withReserve: Math.ceil(recScenario.exact_need),
        purchaseQty: Math.ceil(recScenario.exact_need),
        category: "Покрытие",
      },
      {
        name: "Проволока натяжная",
        quantity: wireLength,
        unit: "м",
        withReserve: wireLength,
        purchaseQty: Math.ceil(wireLength),
        category: "Крепёж",
      },
    );
  } else {
    materials.push(
      {
        name: `${FENCE_TYPE_LABELS[2]} (${fenceHeight} м)`,
        quantity: roundDisplay(recScenario.exact_need, 6),
        unit: "шт",
        withReserve: Math.ceil(recScenario.exact_need),
        purchaseQty: Math.ceil(recScenario.exact_need),
        category: "Покрытие",
      },
      {
        name: `Антисептик (${ANTISEPTIC_CAN_L} л)`,
        quantity: antisepticCans,
        unit: "канистр",
        withReserve: antisepticCans,
        purchaseQty: antisepticCans,
        category: "Защита",
      },
    );
  }

  materials.push(
    {
      name: "Бетон для столбов",
      quantity: concrete,
      unit: "м³",
      withReserve: concrete,
      purchaseQty: Math.ceil(concrete * 10) / 10,
      category: "Бетон",
    },
    {
      name: "Заглушки для столбов",
      quantity: caps,
      unit: "шт",
      withReserve: caps,
      purchaseQty: caps,
      category: "Каркас",
    },
  );

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (gatesCount > 0) {
    warnings.push("При наличии ворот рекомендуются усиленные столбы 80×80 или 100×100 мм");
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("Столбы бетонируйте ниже глубины промерзания — в средней полосе это 1.2-1.5 м");
  if (postsCount > 20) {
    practicalNotes.push(`При ${postsCount} столбах — замешивайте бетон порциями и устанавливайте по 5-6 столбов в день`);
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      fenceLength: roundDisplay(fenceLength, 3),
      fenceHeight: roundDisplay(fenceHeight, 3),
      fenceType,
      postStep: roundDisplay(postStep, 2),
      gatesCount,
      wicketsCount,
      netLength: roundDisplay(netLength, 3),
      postsCount,
      lagsPerSpan,
      lagSpans,
      lagsCount,
      postLength,
      concrete,
      caps,
      sheets,
      screws,
      screwPacks,
      primerCans,
      rolls,
      wireLength,
      slats,
      antisepticCans,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: recScenario.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: recScenario.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(basePrimaryRaw, "generic", accuracyMode).explanation,
    warnings,
    practicalNotes,
    scenarios,
  };
}
