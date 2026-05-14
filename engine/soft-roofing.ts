import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  SoftRoofingCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

/* ─── constants ─── */

const PACK_AREA = 3.0;           // m²
const PACK_RESERVE = 1.05;
const UNDERLAYMENT_ROLL = 15;    // m²
const UNDERLAYMENT_FULL_RESERVE = 1.15;
const SLOPE_THRESHOLD = 18;     // degrees
const CRITICAL_ZONE_WIDTH = 1.0; // m
const VALLEY_ROLL = 10;         // m
const VALLEY_RESERVE = 1.15;
const MASTIC_LINEAR_RATE = 0.1; // kg/m
const MASTIC_AREA_RATE = 0.1;   // kg/m²
const MASTIC_BUCKET = 3;        // kg
const NAILS_PER_M2 = 80;
const NAILS_PER_KG = 400;
const NAIL_RESERVE = 1.05;
const EAVE_STRIP_LENGTH = 2;    // m
const EAVE_RESERVE = 1.05;
const WIND_STRIP_RATIO = 0.4;
const RIDGE_SHINGLE_STEP = 0.5; // m
const RIDGE_RESERVE = 1.05;
const OSB_SHEET = 3.125;        // m²
const OSB_RESERVE = 1.05;
const VENT_PER_AREA = 25;       // m²

/* ─── inputs ─── */

interface SoftRoofingInputs {
  roofArea?: number;
  slope?: number;
  ridgeLength?: number;
  eaveLength?: number;
  valleyLength?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

/* ─── main ─── */

export function computeCanonicalSoftRoofing(
  spec: SoftRoofingCanonicalSpec,
  inputs: SoftRoofingInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const roofArea = Math.max(10, Math.min(500, inputs.roofArea ?? getInputDefault(spec, "roofArea", 80)));
  const slope = Math.max(12, Math.min(60, inputs.slope ?? getInputDefault(spec, "slope", 30)));
  const ridgeLength = Math.max(0, Math.min(50, inputs.ridgeLength ?? getInputDefault(spec, "ridgeLength", 8)));
  const eaveLength = Math.max(0, Math.min(100, inputs.eaveLength ?? getInputDefault(spec, "eaveLength", 20)));
  const valleyLength = Math.max(0, Math.min(30, inputs.valleyLength ?? getInputDefault(spec, "valleyLength", 0)));

  /* ─── formulas ─── */
  const packsRaw = Math.ceil(roofArea / PACK_AREA * PACK_RESERVE);
  const packs = Math.ceil(packsRaw * accuracyMult);

  // Underlayment.
  // При slope < 18° (SLOPE_THRESHOLD) по СП 17.13330.2017 п. 5.5.2 подкладочный
  // ковёр укладывается по всей площади. Иначе — полосами вдоль критических зон
  // (карниз, ендова, конёк) с разной шириной по нормам:
  //   карниз: 1.0 м (полоса от карниза вверх по скату)
  //   ендова: 1.5 м (по 0.75 м с каждой стороны оси)
  //   конёк:  1.0 м (по 0.5 м с каждой стороны конька)
  let underlaymentRolls: number;
  if (slope < SLOPE_THRESHOLD) {
    underlaymentRolls = Math.ceil(roofArea * UNDERLAYMENT_FULL_RESERVE / UNDERLAYMENT_ROLL);
  } else {
    const eaveBandW = spec.material_rules.eave_band_width_m ?? CRITICAL_ZONE_WIDTH;
    const valleyBandW = spec.material_rules.valley_band_width_m ?? CRITICAL_ZONE_WIDTH;
    const ridgeBandW = spec.material_rules.ridge_band_width_m ?? CRITICAL_ZONE_WIDTH;
    const criticalArea =
      (eaveLength * eaveBandW + valleyLength * valleyBandW + ridgeLength * ridgeBandW) *
      UNDERLAYMENT_FULL_RESERVE;
    underlaymentRolls = Math.ceil(criticalArea / UNDERLAYMENT_ROLL);
  }

  // Valley
  const valleyRolls = valleyLength > 0 ? Math.ceil(valleyLength * VALLEY_RESERVE / VALLEY_ROLL) : 0;

  // Mastic
  const masticKg = (ridgeLength + eaveLength + valleyLength) * MASTIC_LINEAR_RATE + roofArea * MASTIC_AREA_RATE;
  const masticBuckets = Math.ceil(masticKg / MASTIC_BUCKET);

  // Nails
  const nailsKg = Math.ceil(roofArea * NAILS_PER_M2 / NAILS_PER_KG * NAIL_RESERVE);

  // Eave strips
  const eaveStrips = Math.ceil(eaveLength / EAVE_STRIP_LENGTH * EAVE_RESERVE);

  // Wind strips
  const windStrips = Math.ceil(eaveLength * WIND_STRIP_RATIO / EAVE_STRIP_LENGTH * EAVE_RESERVE);

  // Ridge shingles
  const ridgeShingles = Math.ceil(ridgeLength / RIDGE_SHINGLE_STEP * RIDGE_RESERVE);

  // OSB sheets
  const osbSheets = Math.ceil(roofArea / OSB_SHEET * OSB_RESERVE);

  // Vent outputs
  const ventOutputs = Math.ceil(roofArea / VENT_PER_AREA);

  /* ─── scenarios ─── */
  const packageOptions = [{
    size: 1,
    label: "shingle-pack",
    unit: "упаковок",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(packs * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `slope:${slope}`,
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
      name: `Гибкая черепица (${PACK_AREA} м²/уп)`,
      quantity: roundDisplay(recScenario.exact_need, 6),
      unit: "упаковок",
      withReserve: Math.ceil(recScenario.exact_need),
      purchaseQty: Math.ceil(recScenario.exact_need),
      category: "Основное",
    },
    {
      name: `Подкладочный ковёр (${UNDERLAYMENT_ROLL} м²)`,
      quantity: underlaymentRolls,
      unit: "рулонов",
      withReserve: underlaymentRolls,
      purchaseQty: underlaymentRolls,
      category: "Подкладка",
    },
  ];

  if (valleyRolls > 0) {
    materials.push({
      name: `Ендовный ковёр (${VALLEY_ROLL} м)`,
      quantity: valleyRolls,
      unit: "рулонов",
      withReserve: valleyRolls,
      purchaseQty: valleyRolls,
      category: "Подкладка",
    });
  }

  materials.push(
    {
      name: `Мастика (ведро ${MASTIC_BUCKET} кг)`,
      quantity: masticBuckets,
      unit: "вёдер",
      withReserve: masticBuckets,
      purchaseQty: masticBuckets,
      category: "Монтаж",
    },
    {
      name: "Гвозди кровельные",
      quantity: nailsKg,
      unit: "кг",
      withReserve: nailsKg,
      purchaseQty: nailsKg,
      category: "Крепёж",
    },
    {
      name: `Карнизные планки (${EAVE_STRIP_LENGTH} м)`,
      quantity: eaveStrips,
      unit: "шт",
      withReserve: eaveStrips,
      purchaseQty: eaveStrips,
      category: "Доборные",
    },
    {
      name: `Ветровые планки (${EAVE_STRIP_LENGTH} м)`,
      quantity: windStrips,
      unit: "шт",
      withReserve: windStrips,
      purchaseQty: windStrips,
      category: "Доборные",
    },
    {
      name: "Коньково-карнизная черепица",
      quantity: ridgeShingles,
      unit: "шт",
      withReserve: ridgeShingles,
      purchaseQty: ridgeShingles,
      category: "Доборные",
    },
    {
      name: `ОСП (${OSB_SHEET} м²)`,
      quantity: osbSheets,
      unit: "листов",
      withReserve: osbSheets,
      purchaseQty: osbSheets,
      category: "Основание",
    },
    {
      name: "Вентиляционные выходы",
      quantity: ventOutputs,
      unit: "шт",
      withReserve: ventOutputs,
      purchaseQty: ventOutputs,
      category: "Вентиляция",
    },
  );

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (slope < SLOPE_THRESHOLD) {
    warnings.push("Уклон менее 18° — подкладочный ковёр укладывается по всей площади");
  }
  if (valleyLength > 0) {
    warnings.push("Ендовы — наиболее уязвимые места, рекомендуется усиленная гидроизоляция");
  }


  const practicalNotes: string[] = [];
  if (slope < 18) {
    practicalNotes.push(`Уклон ${roundDisplay(slope, 0)}° — нужен сплошной подкладочный ковёр по всей площади`);
  }
  practicalNotes.push("Мягкую кровлю монтируйте при температуре выше +5°C — на морозе гонты становятся хрупкими");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      roofArea: roundDisplay(roofArea, 3),
      slope,
      ridgeLength: roundDisplay(ridgeLength, 3),
      eaveLength: roundDisplay(eaveLength, 3),
      valleyLength: roundDisplay(valleyLength, 3),
      packs,
      underlaymentRolls,
      valleyRolls,
      masticKg: roundDisplay(masticKg, 3),
      masticBuckets,
      nailsKg,
      eaveStrips,
      windStrips,
      ridgeShingles,
      osbSheets,
      ventOutputs,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: recScenario.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: recScenario.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(packsRaw, "generic", accuracyMode).explanation,
    warnings,
    practicalNotes,
    scenarios,
  };
}
