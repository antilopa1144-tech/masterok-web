import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  RoofingCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface RoofingInputs {
  roofingType?: number;
  area?: number;
  slope?: number;
  ridgeLength?: number;
  sheetWidth?: number;
  sheetLength?: number;
  complexity?: number;
  accuracyMode?: AccuracyMode;
}

/* --- constants --- */

const COMPLEXITY_COEFFS = [1.05, 1.15, 1.25];

const ROOFING_TYPE_LABELS: Record<number, string> = {
  0: "Металлочерепица",
  1: "Мягкая кровля",
  2: "Профнастил",
  3: "Ондулин",
  4: "Шифер",
  5: "Керамическая черепица",
};

/* --- helpers --- */

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clampFloat(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/* --- main --- */

export function computeCanonicalRoofing(
  spec: RoofingCanonicalSpec,
  inputs: RoofingInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const roofingType = clampInt(inputs.roofingType ?? getInputDefault(spec, "roofingType", 0), 0, 5);
  const area = clampFloat(inputs.area ?? getInputDefault(spec, "area", 80), 10, 500);
  const slope = clampFloat(inputs.slope ?? getInputDefault(spec, "slope", 30), 5, 60);
  const ridgeLength = clampFloat(inputs.ridgeLength ?? getInputDefault(spec, "ridgeLength", 8), 1, 30);
  const sheetWidth = clampFloat(inputs.sheetWidth ?? getInputDefault(spec, "sheetWidth", 1.18), 0.8, 1.5);
  const sheetLength = clampFloat(inputs.sheetLength ?? getInputDefault(spec, "sheetLength", 2.5), 1, 8);
  const complexity = clampInt(inputs.complexity ?? getInputDefault(spec, "complexity", 0), 0, 2);

  const complexityCoeff = COMPLEXITY_COEFFS[complexity] ?? 1.05;
  const slopeFactor = 1 / Math.cos(slope * Math.PI / 180);
  const realArea = area * slopeFactor;
  const perimeterEst = 4 * Math.sqrt(area);

  const materials: CanonicalMaterialResult[] = [];
  const warnings: string[] = [];

  /* primary material quantity -- used for scenario packaging */
  let primaryQuantity = 0;
  let primaryUnit = "шт";
  let primaryLabel = "";

  if (roofingType === 0) {
    /* ── METAL TILE ── */
    const effectiveWidth = sheetWidth - 0.08;
    const sheetArea = effectiveWidth * (sheetLength - 0.15);
    const sheetsNeeded = Math.ceil(realArea / sheetArea * complexityCoeff);
    const ridgePieces = Math.ceil(ridgeLength / 2 * 1.05);
    const snowGuards = Math.ceil(perimeterEst / 3);
    const screws = Math.ceil(realArea * 9);
    const waterproofingM2 = Math.ceil(realArea * 1.15);
    const waterproofingRolls = Math.ceil(waterproofingM2 / 75);

    // Шаг обрешётки зависит от уклона (СП 17.13330.2017 п. 5.5.5):
    // при slope < solid_sheathing_slope_threshold_deg обрешётка должна быть
    // сплошной (доски впритык, ~100 мм шаг), иначе листы прогнутся под снегом.
    // Дефолтный порог — 15°, дефолтный шаг сплошной — 0.1 м.
    const solidThresholdDeg = spec.material_rules.solid_sheathing_slope_threshold_deg ?? 15;
    const solidStepM = spec.material_rules.solid_sheathing_step_m ?? 0.1;
    const effectiveBattenStep = slope < solidThresholdDeg
      ? solidStepM
      : spec.material_rules.metal_tile_batten_step_m;
    const battens = Math.ceil(realArea / effectiveBattenStep * 1.1);
    const counterBattens = Math.ceil(realArea / 1.0 * 1.1);

    primaryQuantity = sheetsNeeded;
    primaryUnit = "листов";
    primaryLabel = "metal-tile-sheet";

    materials.push({
      name: `${ROOFING_TYPE_LABELS[0]} (${sheetWidth}×${sheetLength} м)`,
      quantity: sheetsNeeded,
      unit: "листов",
      withReserve: sheetsNeeded,
      purchaseQty: sheetsNeeded,
      category: "Основное",
    });
    materials.push({
      name: "Коньковые элементы (2 м)",
      quantity: ridgePieces,
      unit: "шт",
      withReserve: ridgePieces,
      purchaseQty: ridgePieces,
      category: "Доборные",
    });
    materials.push({
      name: "Снегозадержатели",
      quantity: snowGuards,
      unit: "шт",
      withReserve: snowGuards,
      purchaseQty: snowGuards,
      category: "Безопасность",
    });
    materials.push({
      name: "Кровельные саморезы",
      quantity: screws,
      unit: "шт",
      withReserve: screws,
      purchaseQty: screws,
      category: "Крепёж",
    });
    materials.push({
      name: "Гидроизоляция (рулон 75 м²)",
      quantity: waterproofingM2,
      unit: "м²",
      withReserve: waterproofingRolls * 75,
      purchaseQty: waterproofingRolls * 75,
      packageInfo: { count: waterproofingRolls, size: 75, packageUnit: "рулонов" },
      category: "Изоляция",
    });
    materials.push({
      name: "Обрешётка (доска 25×100, шаг ~350 мм)",
      quantity: battens,
      unit: "шт",
      withReserve: battens,
      purchaseQty: battens,
      category: "Каркас",
    });
    materials.push({
      name: "Контробрешётка (брусок 50×50)",
      quantity: counterBattens,
      unit: "шт",
      withReserve: counterBattens,
      purchaseQty: counterBattens,
      category: "Каркас",
    });
  } else if (roofingType === 1) {
    /* ── SOFT ROOFING ── */
    const packs = Math.ceil(realArea / 3.0 * complexityCoeff);

    let underlaymentRolls: number;
    if (slope < 18) {
      underlaymentRolls = Math.ceil(realArea * 1.15 / 15);
    } else {
      const criticalLinear = perimeterEst + ridgeLength;
      const criticalArea = criticalLinear * 1.0 * 1.15;
      underlaymentRolls = Math.ceil(criticalArea / 15);
    }

    const masticKg = (perimeterEst + ridgeLength) * 0.1 + realArea * 0.1;
    const masticBuckets = Math.ceil(masticKg / 3);
    const nailsKg = Math.ceil(realArea * 80 / 400 * 1.05);
    const ridgeShingles = Math.ceil(ridgeLength / 0.5 * 1.05);
    const osbSheets = Math.ceil(realArea / 3.125 * 1.05);
    const ventOutputs = Math.ceil(realArea / 25);

    primaryQuantity = packs;
    primaryUnit = "упаковок";
    primaryLabel = "soft-roofing-pack-3m2";

    materials.push({
      name: `${ROOFING_TYPE_LABELS[1]} (упаковка 3 м²)`,
      quantity: packs,
      unit: "упаковок",
      withReserve: packs,
      purchaseQty: packs,
      category: "Основное",
    });
    materials.push({
      name: "Подкладочный ковёр (рулон 15 м²)",
      quantity: underlaymentRolls,
      unit: "рулонов",
      withReserve: underlaymentRolls,
      purchaseQty: underlaymentRolls,
      category: "Изоляция",
    });
    materials.push({
      name: "Мастика битумная (ведро 3 кг)",
      quantity: roundDisplay(masticKg, 3),
      unit: "кг",
      withReserve: masticBuckets * 3,
      purchaseQty: masticBuckets * 3,
      packageInfo: { count: masticBuckets, size: 3, packageUnit: "вёдер" },
      category: "Клей",
    });
    materials.push({
      name: "Кровельные гвозди",
      quantity: nailsKg,
      unit: "кг",
      withReserve: nailsKg,
      purchaseQty: nailsKg,
      category: "Крепёж",
    });
    materials.push({
      name: "Коньково-карнизная черепица",
      quantity: ridgeShingles,
      unit: "шт",
      withReserve: ridgeShingles,
      purchaseQty: ridgeShingles,
      category: "Доборные",
    });
    materials.push({
      name: "Плиты ОСП (1250×2500=3.125 м²)",
      quantity: osbSheets,
      unit: "листов",
      withReserve: osbSheets,
      purchaseQty: osbSheets,
      category: "Каркас",
    });
    materials.push({
      name: "Вентиляционные выходы",
      quantity: ventOutputs,
      unit: "шт",
      withReserve: ventOutputs,
      purchaseQty: ventOutputs,
      category: "Вентиляция",
    });
  } else {
    /* ── GENERIC: profnastil (2), ondulin (3), shale (4), ceramic (5) ── */
    const typeIdx = roofingType - 2; // 0..3
    let unitSheetArea: number;
    let unitLabel: string;
    let unitName: string;

    if (roofingType === 2) {
      // profnastil
      const effectiveW = sheetWidth - 0.05;
      unitSheetArea = effectiveW * (sheetLength - 0.1);
      unitLabel = `profnastil-${sheetWidth}x${sheetLength}`;
      unitName = `${ROOFING_TYPE_LABELS[2]} (${sheetWidth}×${sheetLength} м)`;
    } else if (roofingType === 3) {
      // ondulin: sheet 0.95x2.0, effective 0.83x1.85
      unitSheetArea = 0.83 * 1.85; // 1.5355
      unitLabel = "ondulin-0.95x2.0";
      unitName = `${ROOFING_TYPE_LABELS[3]} (лист 0.95×2.0 м)`;
    } else if (roofingType === 4) {
      // shale: sheet 1.13x1.75, effective 0.98x1.55
      unitSheetArea = 0.98 * 1.55; // 1.519
      unitLabel = "shale-1.13x1.75";
      unitName = `${ROOFING_TYPE_LABELS[4]} (лист 1.13×1.75 м)`;
    } else {
      // ceramic: 1 tile = 0.03 m², ~13 tiles/m²
      unitSheetArea = 1 / 13; // ~0.07692
      unitLabel = "ceramic-tile";
      unitName = `${ROOFING_TYPE_LABELS[5]} (~13 шт/м²)`;
    }

    const sheetsOrTiles = Math.ceil(realArea / unitSheetArea * complexityCoeff);
    const ridgePieces = Math.ceil(ridgeLength / 0.33 * 1.05);

    const fastenerRates = [10, 20, 4, 4];
    const fastenersNeeded = Math.ceil(realArea * fastenerRates[typeIdx]);
    const waterproofingRolls = Math.ceil(realArea * 1.15 / 75);

    const tileUnit = roofingType === 5 ? "шт" : "листов";

    primaryQuantity = sheetsOrTiles;
    primaryUnit = tileUnit;
    primaryLabel = unitLabel;

    materials.push({
      name: unitName,
      quantity: sheetsOrTiles,
      unit: tileUnit,
      withReserve: sheetsOrTiles,
      purchaseQty: sheetsOrTiles,
      category: "Основное",
    });
    materials.push({
      name: "Коньковые элементы (0.33 м)",
      quantity: ridgePieces,
      unit: "шт",
      withReserve: ridgePieces,
      purchaseQty: ridgePieces,
      category: "Доборные",
    });
    materials.push({
      name: roofingType === 3 ? "Гвозди кровельные" : "Крепёж кровельный",
      quantity: fastenersNeeded,
      unit: "шт",
      withReserve: fastenersNeeded,
      purchaseQty: fastenersNeeded,
      category: "Крепёж",
    });
    materials.push({
      name: "Гидроизоляция (рулон 75 м²)",
      quantity: Math.ceil(realArea * 1.15),
      unit: "м²",
      withReserve: waterproofingRolls * 75,
      purchaseQty: waterproofingRolls * 75,
      packageInfo: { count: waterproofingRolls, size: 75, packageUnit: "рулонов" },
      category: "Изоляция",
    });
  }

  /* ── accuracy mode adjustment ── */
  const primaryQuantityRaw = primaryQuantity;
  primaryQuantity = Math.ceil(primaryQuantity * accuracyMult);

  /* ── scenarios (primary material used for packaging) ── */
  const packageOptions = [{
    size: 1,
    label: primaryLabel,
    unit: primaryUnit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(primaryQuantity * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `roofingType:${roofingType}`,
        `complexity:${complexity}`,
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

  /* ── warnings ── */
  if (slope < spec.warnings_rules.metal_tile_min_slope && roofingType === 0) {
    warnings.push("Уклон менее 14° — слишком пологий для металлочерепицы");
  }
  if (slope < spec.warnings_rules.soft_roofing_min_slope && roofingType === 1) {
    warnings.push("Уклон менее 12° — слишком пологий для мягкой кровли");
  }
  // Сплошная обрешётка при пологом уклоне для металлочерепицы.
  // По СП 17.13330.2017 п. 5.5.5: при slope < 15° обрешётка под
  // металлочерепицу должна быть сплошной — листы прогнутся под снегом
  // на редкой обрешётке. Шаг обрешётки уже скорректирован в расчёте,
  // но пользователю важно увидеть пояснение.
  if (roofingType === 0) {
    const solidThresholdDeg = spec.material_rules.solid_sheathing_slope_threshold_deg ?? 15;
    if (slope < solidThresholdDeg) {
      warnings.push(
        `Уклон ${roundDisplay(slope, 0)}° < ${solidThresholdDeg}° — по СП 17.13330.2017 ` +
          `обрешётка под металлочерепицу должна быть сплошной (доска впритык). ` +
          `Расчёт обрешётки скорректирован под этот режим.`,
      );
    }
  }
  if (complexity === 2) {
    warnings.push("Сложная геометрия крыши — рекомендуется профессиональный монтаж");
  }
  if (realArea > spec.warnings_rules.large_roof_area_threshold) {
    warnings.push("Большая площадь крыши — рекомендуется доставка краном");
  }


  const practicalNotes: string[] = [];
  if (slope < 15) {
    practicalNotes.push(`Уклон ${roundDisplay(slope, 0)}° — критически мало для металлочерепицы, минимум 14° по СП`);
  }
  practicalNotes.push("Не экономьте на гидроизоляции подкровельного пространства — протечка на чердаке обойдётся дороже рулона мембраны");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      roofingType,
      area: roundDisplay(area, 3),
      slope: roundDisplay(slope, 3),
      ridgeLength: roundDisplay(ridgeLength, 3),
      sheetWidth: roundDisplay(sheetWidth, 3),
      sheetLength: roundDisplay(sheetLength, 3),
      complexity,
      slopeFactor: roundDisplay(slopeFactor, 6),
      realArea: roundDisplay(realArea, 3),
      perimeterEst: roundDisplay(perimeterEst, 3),
      complexityCoeff,
      primaryQuantity,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: scenarios.REC.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: scenarios.REC.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(primaryQuantityRaw, "generic", accuracyMode).explanation,
    warnings,
    practicalNotes,
    scenarios,
  };
}
