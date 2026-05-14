import { computeEstimate, type EngineCalculatorConfig, type AccuracyModeOption } from './compute';
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  ScreedCanonicalSpec,
  ScreedTypeSpec,
} from './canonical';
import type { FactorTable } from './factors';
import { roundDisplay } from './units';
import {
  type AccuracyMode,
  DEFAULT_ACCURACY_MODE,
  applyAccuracyMode,
  getPrimaryMultiplier,
} from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface ScreedInputs {
  inputMode?: number;
  length?: number;
  width?: number;
  area?: number;
  thickness?: number;
  screedType?: number;
  accuracyMode?: AccuracyMode;
}

/* ─── defaults (fallback if spec.material_rules is missing a field) ─── */
const DEFAULTS = {
  // Глобальный fallback. Обновлено 2026-04-24 с 1.08 на 1.15 — это значение
  // безопасно для худшего сценария (ручной замес ЦПС 1:3 с 15% усадки).
  // Per-type значения хранятся в screed_types[].volume_multiplier и имеют
  // приоритет над этим fallback'ом.
  volume_multiplier: 1.15,
  cement_density: 1300,
  cement_fraction: 0.25,
  sand_fraction: 0.75,
  sand_density: 1.6,
  water_per_m3: 200,
  cps_density_ready: 2000,
  cps_density_semidry: 1800,
  fiber_kg_per_m2: 0.6,
  mesh_margin: 1.15,
  film_margin: 1.1,
  damper_tape_reserve: 1.05,
  beacons_area_per_piece: 2,
};

function mr<T>(spec: ScreedCanonicalSpec, key: string, fallback: T): T {
  const rules = spec.material_rules as unknown as Record<string, unknown> | undefined;
  return (rules?.[key] as T) ?? fallback;
}

const SCREED_FACTOR_TABLE: FactorTable = {
  surface_quality: { min: 1, rec: 1, max: 1 },
  geometry_complexity: { min: 0.98, rec: 1, max: 1.08 },
  installation_method: { min: 1, rec: 1, max: 1 },
  worker_skill: { min: 0.95, rec: 1, max: 1.1 },
  waste_factor: { min: 0.98, rec: 1, max: 1.08 },
  logistics_buffer: { min: 1, rec: 1, max: 1 },
  packaging_rounding: { min: 1, rec: 1, max: 1 },
};

function estimatePerimeter(area: number): number {
  if (area <= 0) return 0;
  return 4 * Math.sqrt(area);
}

function resolveArea(spec: ScreedCanonicalSpec, inputs: ScreedInputs) {
  const inputMode = Math.round(inputs.inputMode ?? getInputDefault(spec, 'inputMode', 0));
  if (inputMode === 0) {
    const length = Math.max(0.1, inputs.length ?? getInputDefault(spec, 'length', 5));
    const width = Math.max(0.1, inputs.width ?? getInputDefault(spec, 'width', 4));
    return {
      inputMode: 0,
      area: roundDisplay(length * width, 3),
      perimeter: roundDisplay(2 * (length + width), 3),
    };
  }

  const area = Math.max(0.1, inputs.area ?? getInputDefault(spec, 'area', 20));
  return {
    inputMode: 1,
    area: roundDisplay(area, 3),
    perimeter: roundDisplay(estimatePerimeter(area), 3),
  };
}

function resolveScreedType(spec: ScreedCanonicalSpec, rawType: number | undefined): ScreedTypeSpec {
  const screedType = Math.max(0, Math.min(2, Math.round(rawType ?? getInputDefault(spec, 'screedType', 0))));
  return spec.normative_formula.screed_types.find((item) => item.id === screedType) ?? spec.normative_formula.screed_types[0];
}

function toEngineConfig(spec: ScreedCanonicalSpec, bagWeight: number, consumptionKgPerM2Mm: number): EngineCalculatorConfig {
  return {
    id: spec.calculator_id,
    title: spec.calculator_id,
    baseFormula: 'putty_area_thickness',
    baseParams: {
      consumption_kg_per_m2_mm: consumptionKgPerM2Mm,
    },
    enabledFactors: spec.field_factors.enabled,
    packaging: {
      unit: spec.packaging_rules.unit,
      options: [{ size: bagWeight, label: `screed-bag-${bagWeight}${spec.packaging_rules.unit}` }],
    },
  };
}

function buildMaterialsType0(
  volume: number,
  area: number,
  thickness: number,
  perimeter: number,
  bags50Cement: number,
  cementKg: number,
  sandTons: number,
  waterL: number,
  meshArea: number,
  filmArea: number,
  beacons: number,
  damperTapeM: number,
): CanonicalMaterialResult[] {
  const materials: CanonicalMaterialResult[] = [
    {
      name: 'Цемент М400 (мешки 50 кг)',
      quantity: roundDisplay(cementKg, 3),
      unit: 'кг',
      withReserve: bags50Cement * 50,
      purchaseQty: bags50Cement * 50,
      packageInfo: { count: bags50Cement, size: 50, packageUnit: "мешков" },
      category: 'Основное',
    },
    {
      name: 'Песок строительный',
      quantity: sandTons,
      unit: 'т',
      withReserve: sandTons,
      purchaseQty: Math.ceil(sandTons),
      category: 'Основное',
    },
    {
      name: 'Вода',
      quantity: roundDisplay(waterL, 3),
      unit: 'л',
      withReserve: roundDisplay(waterL, 3),
      purchaseQty: Math.ceil(waterL),
      category: 'Основное',
    },
    {
      name: 'Плёнка ПЭ',
      quantity: filmArea,
      unit: 'м²',
      withReserve: filmArea,
      purchaseQty: filmArea,
      category: 'Подготовка',
    },
  ];

  if (meshArea > 0) {
    materials.push({
      name: 'Сетка армирующая',
      quantity: meshArea,
      unit: 'м²',
      withReserve: meshArea,
      purchaseQty: meshArea,
      category: 'Армирование',
    });
  }

  materials.push(
    {
      name: 'Маячковый профиль',
      quantity: beacons,
      unit: 'шт',
      withReserve: beacons,
      purchaseQty: beacons,
      category: 'Разметка',
    },
    {
      name: 'Демпферная лента',
      quantity: damperTapeM,
      unit: 'м',
      withReserve: damperTapeM,
      purchaseQty: damperTapeM,
      category: 'Подготовка',
    },
  );

  return materials;
}

function buildMaterialsType1(
  volume: number,
  area: number,
  thickness: number,
  perimeter: number,
  cpsKg: number,
  bags50: number,
  bags40: number,
  meshArea: number,
  filmArea: number,
  beacons: number,
  damperTapeM: number,
): CanonicalMaterialResult[] {
  const materials: CanonicalMaterialResult[] = [
    {
      name: 'Готовая ЦПС М150 (мешки 50 кг)',
      quantity: roundDisplay(cpsKg, 3),
      unit: 'кг',
      withReserve: bags50 * 50,
      purchaseQty: bags50 * 50,
      packageInfo: { count: bags50, size: 50, packageUnit: "мешков" },
      category: 'Основное',
    },
    {
      name: 'Плёнка ПЭ',
      quantity: filmArea,
      unit: 'м²',
      withReserve: filmArea,
      purchaseQty: filmArea,
      category: 'Подготовка',
    },
  ];

  if (meshArea > 0) {
    materials.push({
      name: 'Сетка армирующая',
      quantity: meshArea,
      unit: 'м²',
      withReserve: meshArea,
      purchaseQty: meshArea,
      category: 'Армирование',
    });
  }

  materials.push(
    {
      name: 'Маячковый профиль',
      quantity: beacons,
      unit: 'шт',
      withReserve: beacons,
      purchaseQty: beacons,
      category: 'Разметка',
    },
    {
      name: 'Демпферная лента',
      quantity: damperTapeM,
      unit: 'м',
      withReserve: damperTapeM,
      purchaseQty: damperTapeM,
      category: 'Подготовка',
    },
  );

  return materials;
}

function buildMaterialsType2(
  volume: number,
  area: number,
  thickness: number,
  perimeter: number,
  cpsKg: number,
  bags50: number,
  fiberKg: number,
  filmArea: number,
  damperTapeM: number,
): CanonicalMaterialResult[] {
  return [
    {
      name: 'ЦПС полусухая (мешки 50 кг)',
      quantity: roundDisplay(cpsKg, 3),
      unit: 'кг',
      withReserve: bags50 * 50,
      purchaseQty: bags50 * 50,
      packageInfo: { count: bags50, size: 50, packageUnit: "мешков" },
      category: 'Основное',
    },
    {
      name: 'Фиброволокно ПП',
      quantity: roundDisplay(fiberKg, 3),
      unit: 'кг',
      withReserve: roundDisplay(fiberKg, 3),
      purchaseQty: Math.ceil(fiberKg),
      category: 'Армирование',
    },
    {
      name: 'Плёнка ПЭ',
      quantity: filmArea,
      unit: 'м²',
      withReserve: filmArea,
      purchaseQty: filmArea,
      category: 'Подготовка',
    },
    {
      name: 'Демпферная лента',
      quantity: damperTapeM,
      unit: 'м',
      withReserve: damperTapeM,
      purchaseQty: damperTapeM,
      category: 'Подготовка',
    },
  ];
}

export function computeCanonicalScreed(
  spec: ScreedCanonicalSpec,
  inputs: ScreedInputs,
  factorTable: FactorTable = SCREED_FACTOR_TABLE,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  // Read constants from spec, fallback to defaults
  const GLOBAL_VOLUME_MULTIPLIER = mr(spec, "volume_multiplier", DEFAULTS.volume_multiplier);
  const CEMENT_DENSITY = mr(spec, "cement_density", DEFAULTS.cement_density);
  const CEMENT_FRACTION = mr(spec, "cement_fraction", DEFAULTS.cement_fraction);
  const SAND_FRACTION = mr(spec, "sand_fraction", DEFAULTS.sand_fraction);
  const SAND_DENSITY = mr(spec, "sand_density", DEFAULTS.sand_density);
  const WATER_PER_M3 = mr(spec, "water_per_m3", DEFAULTS.water_per_m3);
  const CPS_DENSITY_READY = mr(spec, "cps_density_ready", DEFAULTS.cps_density_ready);
  const CPS_DENSITY_SEMIDRY = mr(spec, "cps_density_semidry", DEFAULTS.cps_density_semidry);
  const FIBER_KG_PER_M2 = mr(spec, "fiber_kg_per_m2", DEFAULTS.fiber_kg_per_m2);
  const MESH_MARGIN = mr(spec, "mesh_margin", DEFAULTS.mesh_margin);
  const FILM_MARGIN = mr(spec, "film_margin", DEFAULTS.film_margin);
  const DAMPER_TAPE_RESERVE = mr(spec, "damper_tape_reserve", DEFAULTS.damper_tape_reserve);
  const BEACONS_AREA_PER_PIECE = mr(spec, "beacons_area_per_piece", DEFAULTS.beacons_area_per_piece);

  const work = resolveArea(spec, inputs);
  const thickness = Math.max(
    spec.material_rules.min_thickness_mm,
    Math.min(spec.material_rules.max_thickness_mm, inputs.thickness ?? getInputDefault(spec, 'thickness', 50)),
  );
  const screedType = resolveScreedType(spec, inputs.screedType);

  // Per-type усадочный множитель имеет приоритет над глобальным fallback'ом.
  // Реальная усадка зависит от типа смеси: ЦПС 1:3 ручной — ~15%, готовая ЦПС
  // М150 — ~10%, полусухая стяжка — ~7%. См. assumption_notes в spec.
  const VOLUME_MULTIPLIER = screedType.volume_multiplier ?? GLOBAL_VOLUME_MULTIPLIER;

  const area = work.area;
  const perimeter = work.perimeter;
  const volume = roundDisplay(area * (thickness / 1000) * VOLUME_MULTIPLIER, 6);

  // Determine the effective consumption for the engine (kg per m2 per mm)
  // We compute the total kg directly, then derive an effective consumption for the scenario engine
  let primaryKg: number;
  let effectiveConsumptionKgPerM2Mm: number;

  if (screedType.id === 0) {
    // ЦПС 1:3 — total volume based
    primaryKg = roundDisplay(volume * CEMENT_FRACTION * CEMENT_DENSITY, 3); // cement kg
    effectiveConsumptionKgPerM2Mm = (CEMENT_FRACTION * CEMENT_DENSITY * VOLUME_MULTIPLIER) / 1000;
  } else if (screedType.id === 1) {
    primaryKg = roundDisplay(volume * CPS_DENSITY_READY, 3);
    effectiveConsumptionKgPerM2Mm = (CPS_DENSITY_READY * VOLUME_MULTIPLIER) / 1000;
  } else {
    primaryKg = roundDisplay(volume * CPS_DENSITY_SEMIDRY, 3);
    effectiveConsumptionKgPerM2Mm = (CPS_DENSITY_SEMIDRY * VOLUME_MULTIPLIER) / 1000;
  }

  const bagWeight = 50;

  const accuracyOpt: AccuracyModeOption = { mode: accuracyMode, materialCategory: "concrete" };
  const scenarios = computeEstimate(
    toEngineConfig(spec, bagWeight, effectiveConsumptionKgPerM2Mm),
    {
      area_m2: area,
      thickness_mm: thickness,
    },
    factorTable,
    accuracyOpt,
  );

  const recScenario = scenarios.REC;

  // Compute ancillary quantities
  const cementKg = roundDisplay(volume * CEMENT_FRACTION * CEMENT_DENSITY, 3);
  const bags50Cement = Math.ceil(cementKg / 50);
  const sandTons = roundDisplay(Math.ceil(volume * SAND_FRACTION * SAND_DENSITY * 10) / 10, 3);
  const waterL = roundDisplay(volume * WATER_PER_M3, 3);

  const cpsKgReady = roundDisplay(volume * CPS_DENSITY_READY, 3);
  const bags50Ready = Math.ceil(cpsKgReady / 50);
  const bags40Ready = Math.ceil(cpsKgReady / 40);

  const cpsKgSemidry = roundDisplay(volume * CPS_DENSITY_SEMIDRY, 3);
  const bags50Semidry = Math.ceil(cpsKgSemidry / 50);
  const fiberKg = roundDisplay(area * FIBER_KG_PER_M2, 3);

  const meshArea = thickness >= spec.material_rules.mesh_thickness_threshold_mm
    ? Math.ceil(area * MESH_MARGIN)
    : 0;
  const filmArea = Math.ceil(area * FILM_MARGIN);
  const beacons = Math.ceil(area / BEACONS_AREA_PER_PIECE);
  const damperTapeM = Math.ceil(perimeter * DAMPER_TAPE_RESERVE);

  // Build materials list per type
  let materials: CanonicalMaterialResult[];
  if (screedType.id === 0) {
    materials = buildMaterialsType0(volume, area, thickness, perimeter, bags50Cement, cementKg, sandTons, waterL, meshArea, filmArea, beacons, damperTapeM);
  } else if (screedType.id === 1) {
    materials = buildMaterialsType1(volume, area, thickness, perimeter, cpsKgReady, bags50Ready, bags40Ready, meshArea, filmArea, beacons, damperTapeM);
  } else {
    materials = buildMaterialsType2(volume, area, thickness, perimeter, cpsKgSemidry, bags50Semidry, fiberKg, filmArea, damperTapeM);
  }

  // Warnings
  const warnings: string[] = [];
  if (thickness < spec.warnings_rules.thin_threshold_mm) {
    warnings.push('Толщина менее 30 мм — слишком тонкая для выравнивания пола');
  }
  if (thickness > spec.warnings_rules.thick_threshold_mm) {
    warnings.push('При толщине более 100 мм рекомендуется разделить заливку на слои');
  }
  if (screedType.id === 0 && area > spec.warnings_rules.large_area_cps_threshold_m2) {
    warnings.push('При площади более 50 м² рекомендуется использовать готовую ЦПС');
  }

  const practicalNotes: string[] = [];
  if (thickness >= 80) {
    practicalNotes.push(`Стяжка ${roundDisplay(thickness, 0)} мм — обязательно армирование сеткой ВР-1, иначе потрескается`);
  }
  if (area > 30) {
    practicalNotes.push(`На ${roundDisplay(area, 0)} м² ставьте маяки через 1.2-1.5 м — ровнее не будет, а переделывать дороже`);
  }
  if (screedType.id === 2) {
    practicalNotes.push(`Полусухая стяжка — затирочная машина обязательна, ручная затирка на ${roundDisplay(area, 0)} м² нереальна`);
  }

  // Build accuracy explanation
  const { explanation } = applyAccuracyMode(area * effectiveConsumptionKgPerM2Mm * thickness, "concrete", accuracyMode);

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      area,
      perimeter,
      inputMode: work.inputMode,
      thickness: roundDisplay(thickness, 3),
      screedType: screedType.id,
      volume: roundDisplay(volume, 6),
      cementKg: screedType.id === 0 ? cementKg : 0,
      bags50Cement: screedType.id === 0 ? bags50Cement : 0,
      sandTons: screedType.id === 0 ? sandTons : 0,
      waterL: screedType.id === 0 ? waterL : 0,
      cpsKg: screedType.id === 1 ? cpsKgReady : screedType.id === 2 ? cpsKgSemidry : 0,
      bags50: screedType.id === 1 ? bags50Ready : screedType.id === 2 ? bags50Semidry : 0,
      bags40: screedType.id === 1 ? bags40Ready : 0,
      fiberKg: screedType.id === 2 ? fiberKg : 0,
      meshArea,
      filmArea,
      beacons,
      damperTapeM,
      minExactNeedKg: scenarios.MIN.exact_need,
      recExactNeedKg: recScenario.exact_need,
      maxExactNeedKg: scenarios.MAX.exact_need,
      minPurchaseKg: scenarios.MIN.purchase_quantity,
      recPurchaseKg: recScenario.purchase_quantity,
      maxPurchaseKg: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: explanation,
  };
}
