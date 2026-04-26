import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  LawnCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";

/* ─── labels ─── */

const LAWN_TYPE_LABELS: Record<number, string> = {
  0: "Посевной (семенами)",
  1: "Рулонный (готовая дернина)",
};

const GROUND_TYPE_LABELS: Record<number, string> = {
  0: "Песчаный/супесчаный — естественный дренаж",
  1: "Суглинок — средняя фильтрация",
  2: "Глина — нужен дренажный слой",
};

const USAGE_INTENSITY_LABELS: Record<number, string> = {
  0: "Декоративный (партерный, минимальная нагрузка)",
  1: "Обычный (садовый, умеренная ходьба)",
  2: "Спортивный (детская площадка, активная нагрузка)",
};

/* ─── inputs ─── */

interface LawnInputs {
  area?: number;
  lawnType?: number;
  soilThickness?: number;
  groundType?: number;
  usageIntensity?: number;
  withDrainage?: number;
  withGeotextile?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── helpers ─── */

function getInputDefault(spec: LawnCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalLawn(
  spec: LawnCanonicalSpec,
  inputs: LawnInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const area = Math.max(5, Math.min(2000, inputs.area ?? getInputDefault(spec, "area", 50)));
  const lawnType = Math.max(0, Math.min(1, Math.round(inputs.lawnType ?? getInputDefault(spec, "lawnType", 0))));
  const soilThickness = Math.max(8, Math.min(25, inputs.soilThickness ?? getInputDefault(spec, "soilThickness", 12)));
  const groundType = Math.max(0, Math.min(2, Math.round(inputs.groundType ?? getInputDefault(spec, "groundType", 1))));
  const usageIntensity = Math.max(0, Math.min(2, Math.round(inputs.usageIntensity ?? getInputDefault(spec, "usageIntensity", 1))));
  const withDrainage = Math.max(0, Math.min(1, Math.round(inputs.withDrainage ?? getInputDefault(spec, "withDrainage", 0))));
  const withGeotextile = Math.max(0, Math.min(1, Math.round(inputs.withGeotextile ?? getInputDefault(spec, "withGeotextile", 0))));

  const rules = spec.material_rules;

  /* ─── topsoil ─── */
  const topsoilM3 = roundDisplay(area * (soilThickness / 100) * rules.topsoil_compaction_factor, 3);

  /* ─── drainage layer ─── */
  let drainageSandM3 = 0;
  if (withDrainage === 1) {
    drainageSandM3 = roundDisplay(area * rules.drainage_sand_layer_m * rules.drainage_sand_compaction, 3);
  }

  /* ─── geotextile ─── */
  let geotextileRolls = 0;
  if (withGeotextile === 1) {
    geotextileRolls = Math.ceil((area * rules.geotextile_reserve) / rules.geotextile_roll_m2);
  }

  /* ─── fertilizer ─── */
  const fertilizerKg = (area * rules.fertilizer_starter_g_per_m2 * rules.fertilizer_reserve) / 1000;
  const fertilizerPacks = Math.ceil(fertilizerKg / rules.fertilizer_pack_kg);

  /* ─── seeds (lawnType=0) ─── */
  let seedRatePerM2 = 0;
  if (usageIntensity === 0) seedRatePerM2 = rules.seed_rate_g_per_m2_decor;
  else if (usageIntensity === 1) seedRatePerM2 = rules.seed_rate_g_per_m2_normal;
  else seedRatePerM2 = rules.seed_rate_g_per_m2_sport;

  const seedKg = lawnType === 0
    ? (area * seedRatePerM2 * rules.seed_reserve) / 1000
    : 0;
  const seedPacks = lawnType === 0 ? Math.ceil(seedKg / rules.seed_pack_kg) : 0;

  /* ─── rolls (lawnType=1) ─── */
  const rollsCount = lawnType === 1
    ? Math.ceil((area * rules.roll_reserve) / rules.roll_size_m2)
    : 0;

  /* ─── rooting stimulator (rolls only) ─── */
  const stimulatorMl = lawnType === 1 ? area * rules.rooting_stimulator_ml_per_m2 : 0;
  const stimulatorCans = lawnType === 1
    ? Math.ceil(stimulatorMl / (rules.rooting_stimulator_can_l * 1000))
    : 0;

  /* ─── scenarios — primary unit is m² (seeds OR rolls) ─── */
  const basePrimaryRaw = area;
  const basePrimary = roundDisplay(basePrimaryRaw * accuracyMult, 6);

  const packageOptions = [{
    size: 1,
    label: lawnType === 0 ? "lawn-seed-m2" : "lawn-roll-m2",
    unit: "м²",
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
        `lawnType:${lawnType}`,
        `usageIntensity:${usageIntensity}`,
        `groundType:${groundType}`,
        `withDrainage:${withDrainage}`,
        `withGeotextile:${withGeotextile}`,
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
  const lawnLabel = LAWN_TYPE_LABELS[lawnType] ?? LAWN_TYPE_LABELS[0];
  const groundLabel = GROUND_TYPE_LABELS[groundType] ?? GROUND_TYPE_LABELS[1];
  const usageLabel = USAGE_INTENSITY_LABELS[usageIntensity] ?? USAGE_INTENSITY_LABELS[1];

  const materials: CanonicalMaterialResult[] = [];

  if (lawnType === 0) {
    materials.push({
      name: `Семена газона (${seedRatePerM2} г/м², пачка ${rules.seed_pack_kg} кг)`,
      quantity: roundDisplay(seedKg, 2),
      unit: "кг",
      withReserve: roundDisplay(seedKg, 2),
      purchaseQty: seedPacks * rules.seed_pack_kg,
      packageInfo: { count: seedPacks, size: rules.seed_pack_kg, packageUnit: "пачек" },
      category: "Покрытие",
    });
  } else {
    materials.push({
      name: `Рулонный газон (рулон ${rules.roll_size_m2} м²)`,
      quantity: rollsCount,
      unit: "рулонов",
      withReserve: rollsCount,
      purchaseQty: rollsCount,
      category: "Покрытие",
    });
  }

  materials.push({
    name: "Плодородный грунт (растительная земля)",
    quantity: topsoilM3,
    unit: "м³",
    withReserve: topsoilM3,
    purchaseQty: Math.ceil(topsoilM3 * 10) / 10,
    category: "Основание",
  });

  if (drainageSandM3 > 0) {
    materials.push({
      name: "Песок дренажный",
      quantity: drainageSandM3,
      unit: "м³",
      withReserve: drainageSandM3,
      purchaseQty: Math.ceil(drainageSandM3 * 10) / 10,
      category: "Дренаж",
    });
  }

  if (geotextileRolls > 0) {
    materials.push({
      name: `Геотекстиль Дорнит 150 г/м² (${rules.geotextile_roll_m2} м² рулон)`,
      quantity: geotextileRolls,
      unit: "рулонов",
      withReserve: geotextileRolls,
      purchaseQty: geotextileRolls,
      category: "Дренаж",
    });
  }

  materials.push({
    name: `Удобрение стартовое NPK (${rules.fertilizer_pack_kg} кг)`,
    quantity: fertilizerPacks,
    unit: "пачек",
    withReserve: fertilizerPacks,
    purchaseQty: fertilizerPacks,
    category: "Удобрение",
  });

  if (lawnType === 1 && stimulatorCans > 0) {
    materials.push({
      name: `Стимулятор укоренения (${rules.rooting_stimulator_can_l} л канистра)`,
      quantity: stimulatorCans,
      unit: "канистр",
      withReserve: stimulatorCans,
      purchaseQty: stimulatorCans,
      category: "Удобрение",
    });
  }

  materials.push({
    name: "Каток для прикатывания газона (50-75 кг)",
    quantity: rules.lawn_roller_min_pieces,
    unit: "шт",
    withReserve: rules.lawn_roller_min_pieces,
    purchaseQty: rules.lawn_roller_min_pieces,
    category: "Инструмент",
  });

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (soilThickness < spec.warnings_rules.min_topsoil_thickness_cm) {
    warnings.push(
      `Толщина плодородного грунта ${soilThickness} см меньше минимума ${spec.warnings_rules.min_topsoil_thickness_cm} см (СП 82.13330.2016). Корни не смогут развиться.`,
    );
  }
  if (usageIntensity === 2 && soilThickness < spec.warnings_rules.thin_topsoil_for_sport_cm) {
    warnings.push(
      `Для спортивного газона грунт ≥ ${spec.warnings_rules.thin_topsoil_for_sport_cm} см обязателен — иначе газон вытаптывается за сезон.`,
    );
  }
  if (groundType >= spec.warnings_rules.clay_ground_needs_drainage && withDrainage === 0) {
    warnings.push(
      "Глинистый грунт без дренажного слоя приведёт к застою воды и выпреванию газона. Включите дренаж (песок 100 мм).",
    );
  }
  if (area > spec.warnings_rules.large_area_needs_irrigation_m2) {
    warnings.push(
      `На площади > ${spec.warnings_rules.large_area_needs_irrigation_m2} м² ручной полив непрактичен — нужна автоматическая система полива (дождеватели + контроллер).`,
    );
  }
  if (lawnType === 0 && usageIntensity === 2) {
    warnings.push(
      "Спортивный газон из семян достигнет проектной нагрузки только через 1.5-2 года. Для быстрого результата — рулонный.",
    );
  }

  const practicalNotes: string[] = [];
  practicalNotes.push(`Тип газона: ${lawnLabel}`);
  practicalNotes.push(`Грунт: ${groundLabel}`);
  practicalNotes.push(`Назначение: ${usageLabel}`);
  if (lawnType === 0) {
    practicalNotes.push("Оптимальный сезон посева — конец апреля – начало мая или конец августа – начало сентября");
    practicalNotes.push("После посева — лёгкое прикатывание катком и регулярный полив до всходов (10-14 дней)");
  } else {
    practicalNotes.push("Рулоны укладывать в день доставки — за 24 часа в скрученном виде дернина начинает желтеть");
    practicalNotes.push("Стыки рулонов смещать в шахматном порядке (как кладку кирпича) — иначе видны полосы");
  }
  practicalNotes.push("Первая стрижка не раньше чем трава достигнет 8-10 см, высота среза 4-5 см");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area: roundDisplay(area, 3),
      lawnType,
      soilThickness,
      groundType,
      usageIntensity,
      withDrainage,
      withGeotextile,
      seedRatePerM2,
      seedKg: roundDisplay(seedKg, 3),
      seedPacks,
      rollsCount,
      topsoilM3,
      drainageSandM3,
      geotextileRolls,
      fertilizerKg: roundDisplay(fertilizerKg, 2),
      fertilizerPacks,
      stimulatorMl: roundDisplay(stimulatorMl, 0),
      stimulatorCans,
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
