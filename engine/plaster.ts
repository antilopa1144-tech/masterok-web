import { computeEstimate, type EngineCalculatorConfig, type AccuracyModeOption } from "./compute";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  PlasterCanonicalSpec,
  PlasterEvennessSpec,
  PlasterSubstrateSpec,
  PlasterTypeSpec,
} from "./canonical";
import type { FactorTable } from "./factors";
import { roundDisplay } from "./units";
import {
  type AccuracyMode,
  DEFAULT_ACCURACY_MODE,
  applyAccuracyMode,
  getPrimaryMultiplier,
} from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface PlasterInputs {
  inputMode?: number;
  length?: number;
  width?: number;
  height?: number;
  area?: number;
  openingsArea?: number;
  plasterType?: number;
  thickness?: number;
  bagWeight?: number;
  substrateType?: number;
  wallEvenness?: number;
  accuracyMode?: AccuracyMode;
}

interface WorkAreaResolution {
  wallArea: number;
  netArea: number;
  inputMode: number;
  roomHeight: number;
}

const PLASTER_FACTOR_TABLE: FactorTable = {
  surface_quality: { min: 0.99, rec: 1, max: 1.05 },
  geometry_complexity: { min: 0.99, rec: 1, max: 1.06 },
  installation_method: { min: 0.99, rec: 1, max: 1.04 },
  worker_skill: { min: 0.98, rec: 1, max: 1.03 },
  waste_factor: { min: 0.98, rec: 1, max: 1.08 },
  logistics_buffer: { min: 1, rec: 1, max: 1.04 },
  packaging_rounding: { min: 1, rec: 1, max: 1.02 },
};

function resolveWorkArea(spec: PlasterCanonicalSpec, rawInputs: PlasterInputs): WorkAreaResolution {
  const inputMode = Math.round(rawInputs.inputMode ?? getInputDefault(spec, "inputMode", 0));
  const openingsArea = Math.max(0, rawInputs.openingsArea ?? getInputDefault(spec, "openingsArea", 5));

  if (inputMode === 0) {
    const length = Math.max(1, rawInputs.length ?? getInputDefault(spec, "length", 5));
    const width = Math.max(1, rawInputs.width ?? getInputDefault(spec, "width", 4));
    const height = Math.max(2, rawInputs.height ?? getInputDefault(spec, "height", 2.7));
    const wallArea = 2 * (length + width) * height;
    return {
      wallArea: roundDisplay(wallArea, 3),
      netArea: roundDisplay(Math.max(0, wallArea - openingsArea), 3),
      inputMode: 0,
      roomHeight: roundDisplay(height, 3),
    };
  }

  const wallArea = Math.max(0.1, rawInputs.area ?? getInputDefault(spec, "area", 50));
  return {
    wallArea: roundDisplay(wallArea, 3),
    netArea: roundDisplay(Math.max(0, wallArea - openingsArea), 3),
    inputMode: 1,
    roomHeight: roundDisplay(getInputDefault(spec, "height", 2.7), 3),
  };
}

function resolvePlasterType(spec: PlasterCanonicalSpec, rawType: number | undefined): PlasterTypeSpec {
  const plasterType = Math.max(0, Math.min(2, Math.round(rawType ?? getInputDefault(spec, "plasterType", 0))));
  return spec.normative_formula.plaster_types.find((item) => item.id === plasterType) ?? spec.normative_formula.plaster_types[0];
}

function resolveSubstrate(spec: PlasterCanonicalSpec, rawType: number | undefined): PlasterSubstrateSpec {
  const substrateType = Math.max(1, Math.min(5, Math.round(rawType ?? getInputDefault(spec, "substrateType", 1))));
  return spec.normative_formula.substrate_types.find((item) => item.id === substrateType) ?? spec.normative_formula.substrate_types[0];
}

function resolveEvenness(spec: PlasterCanonicalSpec, rawType: number | undefined): PlasterEvennessSpec {
  const evennessType = Math.max(1, Math.min(3, Math.round(rawType ?? getInputDefault(spec, "wallEvenness", 1))));
  return spec.normative_formula.wall_evenness_profiles.find((item) => item.id === evennessType) ?? spec.normative_formula.wall_evenness_profiles[0];
}

function resolveThickness(spec: PlasterCanonicalSpec, rawThickness: number | undefined): number {
  return Math.max(5, Math.min(100, rawThickness ?? getInputDefault(spec, "thickness", 15)));
}

function resolveBagWeight(spec: PlasterCanonicalSpec, plasterType: PlasterTypeSpec, rawBagWeight: number | undefined): number {
  const requested = Math.max(25, rawBagWeight ?? plasterType.default_bag_weight);
  return plasterType.allowed_bag_weights.includes(requested) ? requested : plasterType.default_bag_weight;
}

function toEngineConfig(spec: PlasterCanonicalSpec, bagWeight: number, consumptionKgPerM2Mm: number): EngineCalculatorConfig {
  return {
    id: spec.calculator_id,
    title: spec.calculator_id,
    baseFormula: "putty_area_thickness",
    baseParams: {
      consumption_kg_per_m2_mm: consumptionKgPerM2Mm,
    },
    enabledFactors: spec.field_factors.enabled,
    packaging: {
      unit: spec.packaging_rules.unit,
      options: [{ size: bagWeight, label: `plaster-bag-${bagWeight}${spec.packaging_rules.unit}` }],
    },
  };
}

function buildMaterials(
  spec: PlasterCanonicalSpec,
  plasterType: PlasterTypeSpec,
  substrate: PlasterSubstrateSpec,
  work: WorkAreaResolution,
  thickness: number,
  totalKg: number,
  bagWeight: number,
  bags: number,
): CanonicalMaterialResult[] {
  const primerRate = substrate.primer_type === 2 ? spec.material_rules.contact_primer_kg_per_m2 : spec.material_rules.deep_primer_l_per_m2;
  const primerNeed = roundDisplay(work.netArea * primerRate * spec.material_rules.reserve_factor, 3);
  const primerPackages = primerNeed > 0 ? Math.ceil(primerNeed / spec.material_rules.primer_package_size) : 0;
  const meshArea = thickness > spec.warnings_rules.mesh_threshold_mm ? roundDisplay(work.netArea * spec.material_rules.mesh_overlap_factor, 3) : 0;
  const beacons = Math.max(2, Math.ceil(work.netArea / spec.material_rules.beacons_area_m2_per_piece));
  const beaconSize = thickness < spec.material_rules.thin_beacon_threshold_mm ? spec.material_rules.beacon_thin_size_mm : spec.material_rules.beacon_standard_size_mm;
  const cornerProfiles = work.inputMode === 0
    ? Math.ceil((work.roomHeight * spec.material_rules.corner_profile_count / spec.material_rules.corner_profile_length_m) * spec.material_rules.reserve_factor)
    : 0;

  return [
    {
      name: `${plasterType.label} (мешки ${bagWeight} кг)`,
      quantity: roundDisplay(totalKg / bagWeight, 3),
      unit: "мешков",
      withReserve: bags,
      purchaseQty: bags,
      category: "Основное",
    },
    {
      name: substrate.primer_type === 2 ? `Грунтовка бетоноконтакт (${spec.material_rules.primer_package_size} кг)` : `Грунтовка (${spec.material_rules.primer_package_size} л)`,
      quantity: primerNeed,
      unit: substrate.primer_type === 2 ? "кг" : "л",
      withReserve: roundDisplay(primerPackages * spec.material_rules.primer_package_size, 3),
      purchaseQty: roundDisplay(primerPackages * spec.material_rules.primer_package_size, 3),
      packageInfo: { count: primerPackages, size: spec.material_rules.primer_package_size, packageUnit: substrate.primer_type === 2 ? "вёдер" : "канистр" },
      category: "Подготовка",
    },
    ...(meshArea > 0 ? [{
      name: "Стеклосетка армировочная (50×50 мм)",
      quantity: meshArea,
      unit: "м²",
      withReserve: Math.ceil(meshArea),
      purchaseQty: Math.ceil(meshArea),
      category: "Армирование",
    } satisfies CanonicalMaterialResult] : []),
    {
      name: `Маяки штукатурные (${beaconSize} мм)`,
      quantity: beacons,
      unit: "шт",
      withReserve: beacons,
      purchaseQty: beacons,
      category: "Вспомогательное",
    },
    {
      name: `Правило алюминиевое (${spec.material_rules.rule_size_m} м)`,
      quantity: spec.material_rules.rule_count,
      unit: "шт",
      withReserve: spec.material_rules.rule_count,
      purchaseQty: spec.material_rules.rule_count,
      category: "Инструмент",
    },
    {
      name: "Шпатель фасадный (450-600 мм)",
      quantity: spec.material_rules.spatulas_count,
      unit: "шт",
      withReserve: spec.material_rules.spatulas_count,
      purchaseQty: spec.material_rules.spatulas_count,
      category: "Инструмент",
    },
    {
      name: "Ведро строительное (20 л)",
      quantity: spec.material_rules.buckets_count,
      unit: "шт",
      withReserve: spec.material_rules.buckets_count,
      purchaseQty: spec.material_rules.buckets_count,
      category: "Инструмент",
    },
    {
      name: "Миксер для дрели (насадка)",
      quantity: spec.material_rules.mixer_count,
      unit: "шт",
      withReserve: spec.material_rules.mixer_count,
      purchaseQty: spec.material_rules.mixer_count,
      category: "Инструмент",
    },
    {
      name: "Перчатки прорезиненные",
      quantity: spec.material_rules.gloves_pairs,
      unit: "пары",
      withReserve: spec.material_rules.gloves_pairs,
      purchaseQty: spec.material_rules.gloves_pairs,
      category: "Расходники",
    },
    ...(cornerProfiles > 0 ? [{
      name: "Угловой профиль перфорированный 25×25 мм (3 м)",
      quantity: cornerProfiles,
      unit: "шт",
      withReserve: cornerProfiles,
      purchaseQty: cornerProfiles,
      category: "Вспомогательное",
    } satisfies CanonicalMaterialResult] : []),
  ];
}

export function computeCanonicalPlaster(
  spec: PlasterCanonicalSpec,
  inputs: PlasterInputs,
  factorTable: FactorTable = PLASTER_FACTOR_TABLE,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const work = resolveWorkArea(spec, inputs);
  const plasterType = resolvePlasterType(spec, inputs.plasterType);
  const substrate = resolveSubstrate(spec, inputs.substrateType);
  const evenness = resolveEvenness(spec, inputs.wallEvenness);
  const thickness = resolveThickness(spec, inputs.thickness);
  const bagWeight = resolveBagWeight(spec, plasterType, inputs.bagWeight);
  const consumptionKgPerM2Mm = (plasterType.base_kg_per_m2_10mm / 10) * substrate.multiplier * evenness.multiplier * spec.material_rules.reserve_factor;
  const accuracyOpt: AccuracyModeOption = { mode: accuracyMode, materialCategory: "plaster" };
  const scenarios = computeEstimate(
    toEngineConfig(spec, bagWeight, consumptionKgPerM2Mm),
    {
      area_m2: work.netArea,
      thickness_mm: thickness,
    },
    factorTable,
    accuracyOpt,
  );
  const recScenario = scenarios.REC;
  const totalKg = roundDisplay(recScenario.exact_need, 3);
  const meshArea = thickness > spec.warnings_rules.mesh_threshold_mm ? roundDisplay(work.netArea * spec.material_rules.mesh_overlap_factor, 3) : 0;
  const beacons = Math.max(2, Math.ceil(work.netArea / spec.material_rules.beacons_area_m2_per_piece));
  const beaconSize = thickness < spec.material_rules.thin_beacon_threshold_mm ? spec.material_rules.beacon_thin_size_mm : spec.material_rules.beacon_standard_size_mm;
  const primerRate = substrate.primer_type === 2 ? spec.material_rules.contact_primer_kg_per_m2 : spec.material_rules.deep_primer_l_per_m2;
  const primerNeed = Math.ceil(work.netArea * primerRate * spec.material_rules.reserve_factor);
  const warningThickLayer = thickness > spec.warnings_rules.thick_layer_warning_threshold_mm ? 1 : 0;
  const tipObryzg = spec.warnings_rules.obryzg_tip_substrate_ids.includes(substrate.id) && spec.warnings_rules.obryzg_tip_evenness_ids.includes(evenness.id) ? 1 : 0;

  const warnings: string[] = [];
  if (plasterType.id === 0 && thickness > spec.warnings_rules.gypsum_two_layer_threshold_mm) {
    warnings.push("Гипсовую штукатурку толщиной > 20 мм наносят в 2 слоя с армирующей сеткой");
  }
  if (thickness > spec.warnings_rules.mesh_threshold_mm) {
    warnings.push("При толщине > 30 мм обязательно армирование стекловолоконной сеткой");
  }
  if (work.netArea < spec.warnings_rules.small_area_threshold_m2) {
    warnings.push("Маленькая площадь — лучше использовать готовую шпаклёвку из ведра");
  }


  const practicalNotes: string[] = [];
  if (thickness > 30) {
    practicalNotes.push(`Слой ${roundDisplay(thickness, 0)} мм — ставьте маяки и наносите в 2-3 захода с просушкой`);
  }
  practicalNotes.push("На стыке разных материалов (кирпич/бетон) — обязательно армирующая сетка");

  // Build accuracy explanation
  const { explanation } = applyAccuracyMode(work.netArea * consumptionKgPerM2Mm * thickness, "plaster", accuracyMode);

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: buildMaterials(spec, plasterType, substrate, work, thickness, totalKg, bagWeight, recScenario.buy_plan.packages_count),
    totals: {
      wallArea: roundDisplay(work.wallArea, 3),
      netArea: roundDisplay(work.netArea, 3),
      thickness: roundDisplay(thickness, 3),
      totalKg,
      plasterType: plasterType.id,
      substrateType: substrate.id,
      wallEvenness: evenness.id,
      bagWeight,
      primerNeed,
      primerType: substrate.primer_type,
      meshArea,
      beacons,
      beaconSize,
      ruleSize: spec.material_rules.rule_size_m,
      warningThickLayer,
      tipObryzg,
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
