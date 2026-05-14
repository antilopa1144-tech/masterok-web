import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  DrainageCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

/* ─── labels ─── */

const DRAINAGE_TYPE_LABELS: Record<number, string> = {
  0: "Пристенный (по периметру фундамента)",
  1: "Участковый «ёлочка» с боковыми отводами",
  2: "Линейный (одна траншея)",
};

const GROUNDWATER_RISK_LABELS: Record<number, string> = {
  0: "Низкий — сухой участок",
  1: "Средний — глины/суглинки",
  2: "Высокий — близкие грунтовые воды",
};

/* ─── inputs ─── */

interface DrainageInputs {
  length?: number;
  pipeDiameter?: number;
  drainageType?: number;
  groundwaterRisk?: number;
  withCollector?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

/* ─── main ─── */

export function computeCanonicalDrainage(
  spec: DrainageCanonicalSpec,
  inputs: DrainageInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const length = Math.max(5, Math.min(500, inputs.length ?? getInputDefault(spec, "length", 40)));
  const pipeDiameterRaw = inputs.pipeDiameter ?? getInputDefault(spec, "pipeDiameter", 110);
  // Snap to one of supported diameters {110, 160}
  const pipeDiameter = pipeDiameterRaw >= 135 ? 160 : 110;
  const drainageType = Math.max(0, Math.min(2, Math.round(inputs.drainageType ?? getInputDefault(spec, "drainageType", 1))));
  const groundwaterRisk = Math.max(0, Math.min(2, Math.round(inputs.groundwaterRisk ?? getInputDefault(spec, "groundwaterRisk", 1))));
  const withCollector = Math.max(0, Math.min(1, Math.round(inputs.withCollector ?? getInputDefault(spec, "withCollector", 1))));

  const rules = spec.material_rules;

  /* ─── trench geometry ─── */
  const trenchWidth = rules.trench_width_m;
  // Для типа 1 (ёлочка) общая длина трассы умножается на 1.5 — учитываем боковые отводы
  const totalTrenchLength = drainageType === 1 ? roundDisplay(length * 1.5, 3) : roundDisplay(length, 3);

  /* ─── pipe ─── */
  // Труба нужна на всю длину траншеи (включая отводы для ёлочки) с запасом 5% на стыки
  const pipeWithReserveM = roundDisplay(totalTrenchLength * rules.pipe_reserve, 3);

  /* ─── sand bedding ─── */
  const sandM3 = roundDisplay(totalTrenchLength * trenchWidth * rules.sand_bedding_thickness_m * rules.compaction_factor_sand, 3);

  /* ─── gravel obsypka ─── */
  // Сечение обсыпки: ширина траншеи × (нижняя обсыпка 0.10 + верхняя 0.30 = 0.40 м) ≈ 0.30 × 0.40 = 0.12 м²
  // Минус сама труба ≈ π × (D/2)² (110 мм → 0.0095 м², 160 мм → 0.020 м²) — но влияние малое, не учитываем
  const gravelCrossSection = trenchWidth * (rules.gravel_top_thickness_m + rules.gravel_side_thickness_m);
  const gravelM3 = roundDisplay(totalTrenchLength * gravelCrossSection * rules.compaction_factor_gravel, 3);

  /* ─── geotextile ─── */
  const geotextileBaseM2 = totalTrenchLength * rules.geotextile_perimeter_factor;
  const geotextileExtraMult = groundwaterRisk >= spec.warnings_rules.high_groundwater_threshold
    ? rules.extra_geotextile_high_groundwater
    : 1.0;
  const geotextileM2 = roundDisplay(geotextileBaseM2 * geotextileExtraMult * rules.geotextile_reserve, 3);
  const geotextileRolls = Math.ceil(geotextileM2 / rules.geotextile_roll_m2);

  /* ─── wells ─── */
  // Минимум — round(length / well_step) + 1, но не меньше min_well_count из spec.warnings_rules
  const baseWellsByLength = Math.max(1, Math.ceil(length / rules.well_step_m));
  // Для типа 1 (ёлочка) — больше поворотов, добавляем 1 колодец на каждые 30 м боковых отводов
  const branchWells = drainageType === 1 ? Math.ceil((totalTrenchLength - length) / 30) : 0;
  const wellCount = Math.max(spec.warnings_rules.min_well_count, baseWellsByLength + branchWells);

  /* ─── collector well ─── */
  const collectorCount = withCollector === 1 && length >= spec.warnings_rules.min_length_for_collector ? 1 : 0;

  /* ─── fittings ─── */
  let elbowCount = 0;
  if (drainageType === 0) elbowCount = rules.elbow_count_type0;
  else if (drainageType === 1) elbowCount = rules.elbow_count_type1;
  else elbowCount = rules.elbow_count_type2;

  const teeCount = drainageType === 1 ? rules.tee_count_per_branch_type1 : 0;

  /* ─── scenarios — primary unit is pipe length in metres ─── */
  const basePrimaryRaw = pipeWithReserveM;
  const basePrimary = roundDisplay(basePrimaryRaw * accuracyMult, 6);

  const packageOptions = [
    {
      size: rules.pipe_coil_length_m,
      label: `pipe-coil-${rules.pipe_coil_length_m}m`,
      unit: "бухт",
    },
    { size: 1, label: "pipe-m", unit: "м" },
  ];

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
        `pipeDiameter:${pipeDiameter}`,
        `drainageType:${drainageType}`,
        `groundwaterRisk:${groundwaterRisk}`,
        `withCollector:${withCollector}`,
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
  const recPurchasePipeM = Math.ceil(recScenario.purchase_quantity);
  const recBuyPlan = recScenario.buy_plan;
  const pipePackageInfo = recBuyPlan.package_size === rules.pipe_coil_length_m
    ? { count: recBuyPlan.packages_count, size: recBuyPlan.package_size, packageUnit: recBuyPlan.unit }
    : undefined;
  // Информативно: сколько бухт нужно купить, если брать только бухтами
  const pipeCoils = Math.ceil(recPurchasePipeM / rules.pipe_coil_length_m);

  /* ─── materials ─── */
  const drainageLabel = DRAINAGE_TYPE_LABELS[drainageType] ?? DRAINAGE_TYPE_LABELS[1];
  const groundwaterLabel = GROUNDWATER_RISK_LABELS[groundwaterRisk] ?? GROUNDWATER_RISK_LABELS[1];

  const materials: CanonicalMaterialResult[] = [
    {
      name: `Дренажная труба гофрированная Ø${pipeDiameter} мм с фильтром`,
      quantity: roundDisplay(totalTrenchLength, 3),
      unit: "м",
      withReserve: pipeWithReserveM,
      purchaseQty: recPurchasePipeM,
      packageInfo: pipePackageInfo,
      category: "Трубопровод",
    },
    {
      name: "Песок строительный (подсыпка под трубу)",
      quantity: sandM3,
      unit: "м³",
      withReserve: sandM3,
      purchaseQty: Math.ceil(sandM3 * 10) / 10,
      category: "Подготовка",
    },
    {
      name: "Щебень фр. 5-20 мм (обсыпка трубы)",
      quantity: gravelM3,
      unit: "м³",
      withReserve: gravelM3,
      purchaseQty: Math.ceil(gravelM3 * 10) / 10,
      category: "Обсыпка",
    },
    {
      name: `Геотекстиль Дорнит 200 г/м² (${rules.geotextile_roll_m2} м² рулон)`,
      quantity: geotextileM2,
      unit: "м²",
      withReserve: geotextileRolls * rules.geotextile_roll_m2,
      purchaseQty: geotextileRolls * rules.geotextile_roll_m2,
      packageInfo: { count: geotextileRolls, size: rules.geotextile_roll_m2, packageUnit: "рулонов" },
      category: "Изоляция",
    },
    {
      name: `Колодцы смотровые Ø${rules.well_diameter_mm} мм`,
      quantity: wellCount,
      unit: "шт",
      withReserve: wellCount,
      purchaseQty: wellCount,
      category: "Колодцы",
    },
  ];

  if (collectorCount > 0) {
    materials.push({
      name: `Приёмный колодец-накопитель Ø${rules.collector_well_diameter_mm} мм`,
      quantity: collectorCount,
      unit: "шт",
      withReserve: collectorCount,
      purchaseQty: collectorCount,
      category: "Колодцы",
    });
  }

  if (elbowCount > 0) {
    materials.push({
      name: `Отводы дренажные 90°/45° Ø${pipeDiameter}`,
      quantity: elbowCount,
      unit: "шт",
      withReserve: elbowCount,
      purchaseQty: elbowCount,
      category: "Фасонные",
    });
  }

  if (teeCount > 0) {
    materials.push({
      name: `Тройники дренажные Ø${pipeDiameter}`,
      quantity: teeCount,
      unit: "шт",
      withReserve: teeCount,
      purchaseQty: teeCount,
      category: "Фасонные",
    });
  }

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (pipeDiameter === 110 && length > spec.warnings_rules.max_length_d110_m) {
    warnings.push(
      `Длина ${length} м для трубы Ø110 превышает практический лимит ${spec.warnings_rules.max_length_d110_m} м (СП 32.13330.2018). ` +
        "Используйте Ø160 или промежуточный сброс в смотровой колодец.",
    );
  }
  if (groundwaterRisk >= spec.warnings_rules.high_groundwater_threshold) {
    warnings.push(
      "Высокий уровень грунтовых вод — увеличена обмотка геотекстилем и слой щебня. " +
        "Глубина траншеи должна быть ниже отметки УГВ минимум на 0.30 м (СП 104.13330.2016).",
    );
  }
  if (withCollector === 1 && length < spec.warnings_rules.min_length_for_collector) {
    warnings.push(
      `На длине ${length} м (< ${spec.warnings_rules.min_length_for_collector} м) накопительный колодец обычно не нужен — выводите в кювет или дренажную канаву.`,
    );
  }
  if (drainageType === 0 && length < 30) {
    warnings.push(
      "Пристенный дренаж эффективен по периметру всего фундамента — для коротких участков (< 30 м) рассмотрите линейный (тип 2).",
    );
  }

  const practicalNotes: string[] = [];
  practicalNotes.push(`Тип дренажа: ${drainageLabel}`);
  practicalNotes.push(`Грунт: ${groundwaterLabel}`);
  const minSlope = pipeDiameter === 110 ? rules.min_slope_d110 : rules.min_slope_d160;
  practicalNotes.push(
    `Минимальный уклон трубы Ø${pipeDiameter}: ${(minSlope * 1000).toFixed(0)} мм на 1 м (СП 32.13330.2018). ` +
      `Перепад высот по всей трассе: ${roundDisplay(length * minSlope, 3)} м.`,
  );
  practicalNotes.push("Верх щебневой обсыпки от уровня грунта — минимум 0.30 м, иначе перемерзание зимой");
  if (drainageType === 1) {
    practicalNotes.push("Боковые отводы «ёлочки» — под углом 60° к основной трассе, шаг 5-7 м для садовых участков");
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      length: roundDisplay(length, 3),
      pipeDiameter,
      drainageType,
      groundwaterRisk,
      withCollector,
      totalTrenchLength,
      pipeWithReserveM: roundDisplay(pipeWithReserveM, 3),
      sandM3,
      gravelM3,
      geotextileM2,
      geotextileRolls,
      wellCount,
      collectorCount,
      elbowCount,
      teeCount,
      pipeCoils,
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
    accuracyExplanation: applyAccuracyMode(basePrimaryRaw, "generic", accuracyMode).explanation,
  };
}
