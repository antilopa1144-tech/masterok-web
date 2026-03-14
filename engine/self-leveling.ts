import { computeEstimate, type EngineCalculatorConfig } from './compute';
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  SelfLevelingCanonicalSpec,
  SelfLevelingMixtureTypeSpec,
} from './canonical';
import type { FactorTable } from './factors';
import { roundDisplay } from './units';

interface SelfLevelingInputs {
  inputMode?: number;
  length?: number;
  width?: number;
  area?: number;
  thickness?: number;
  mixtureType?: number;
  consumptionOverride?: number;
  bagWeight?: number;
}

const SELF_LEVELING_FACTOR_TABLE: FactorTable = {
  surface_quality: { min: 1, rec: 1, max: 1 },
  geometry_complexity: { min: 0.98, rec: 1, max: 1.08 },
  installation_method: { min: 1, rec: 1, max: 1 },
  worker_skill: { min: 1, rec: 1, max: 1 },
  waste_factor: { min: 0.98, rec: 1, max: 1.08 },
  logistics_buffer: { min: 1, rec: 1, max: 1.03 },
  packaging_rounding: { min: 1, rec: 1, max: 1.02 },
};

function getInputDefault(spec: SelfLevelingCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

function estimatePerimeter(area: number) {
  if (area <= 0) return 0;
  return 4 * Math.sqrt(area);
}

function resolveArea(spec: SelfLevelingCanonicalSpec, inputs: SelfLevelingInputs) {
  const inputMode = Math.round(inputs.inputMode ?? getInputDefault(spec, 'inputMode', 0));
  if (inputMode === 0) {
    const length = Math.max(1, inputs.length ?? getInputDefault(spec, 'length', 5));
    const width = Math.max(1, inputs.width ?? getInputDefault(spec, 'width', 4));
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

function resolveMixtureType(spec: SelfLevelingCanonicalSpec, rawType: number | undefined): SelfLevelingMixtureTypeSpec {
  const mixtureType = Math.max(0, Math.min(2, Math.round(rawType ?? getInputDefault(spec, 'mixtureType', 0))));
  return spec.normative_formula.mixture_types.find((item) => item.id === mixtureType) ?? spec.normative_formula.mixture_types[0];
}

function resolveBagWeight(spec: SelfLevelingCanonicalSpec, rawBagWeight: number | undefined): number {
  const bagWeight = rawBagWeight ?? getInputDefault(spec, 'bagWeight', 25);
  return bagWeight <= 20 ? 20 : 25;
}

function resolveConsumption(spec: SelfLevelingCanonicalSpec, mixtureType: SelfLevelingMixtureTypeSpec, rawConsumption: number | undefined): number {
  const override = Math.max(0, rawConsumption ?? getInputDefault(spec, 'consumptionOverride', 0));
  return override > 0 ? override : mixtureType.base_kg_per_m2_mm;
}

function toEngineConfig(spec: SelfLevelingCanonicalSpec, bagWeight: number, consumptionKgPerM2Mm: number): EngineCalculatorConfig {
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
      options: [{ size: bagWeight, label: `self-leveling-bag-${bagWeight}${spec.packaging_rules.unit}` }],
    },
  };
}

function buildMaterials(
  spec: SelfLevelingCanonicalSpec,
  mixtureType: SelfLevelingMixtureTypeSpec,
  totalKg: number,
  bagWeight: number,
  bags: number,
  primerLiters: number,
  primerCans: number,
  tapeLength: number,
  tapeRolls: number,
): CanonicalMaterialResult[] {
  return [
    {
      name: `${mixtureType.label} (мешки ${bagWeight} кг)`,
      quantity: roundDisplay(totalKg / bagWeight, 3),
      unit: 'мешков',
      withReserve: bags,
      purchaseQty: bags,
      category: 'Основное',
    },
    {
      name: `Грунтовка глубокого проникновения (${spec.packaging_rules.primer_can_l} л)`,
      quantity: primerLiters,
      unit: 'л',
      withReserve: roundDisplay(primerCans * spec.packaging_rules.primer_can_l, 3),
      purchaseQty: primerCans,
      category: 'Подготовка',
    },
    {
      name: `Демпферная лента (рулон ${spec.packaging_rules.tape_roll_m} м)`,
      quantity: roundDisplay(tapeLength / spec.packaging_rules.tape_roll_m, 3),
      unit: 'рулонов',
      withReserve: tapeRolls,
      purchaseQty: tapeRolls,
      category: 'Подготовка',
    },
  ];
}

export function computeCanonicalSelfLeveling(
  spec: SelfLevelingCanonicalSpec,
  inputs: SelfLevelingInputs,
  factorTable: FactorTable = SELF_LEVELING_FACTOR_TABLE,
): CanonicalCalculatorResult {
  const work = resolveArea(spec, inputs);
  const thickness = Math.max(3, Math.min(100, inputs.thickness ?? getInputDefault(spec, 'thickness', 10)));
  const mixtureType = resolveMixtureType(spec, inputs.mixtureType);
  const bagWeight = resolveBagWeight(spec, inputs.bagWeight);
  const consumptionKgPerM2Mm = resolveConsumption(spec, mixtureType, inputs.consumptionOverride) * spec.material_rules.reserve_factor;
  const scenarios = computeEstimate(
    toEngineConfig(spec, bagWeight, consumptionKgPerM2Mm),
    {
      area_m2: work.area,
      thickness_mm: thickness,
    },
    factorTable,
  );
  const recScenario = scenarios.REC;
  const totalKg = roundDisplay(recScenario.exact_need, 3);
  const primerLiters = roundDisplay(work.area * spec.material_rules.primer_l_per_m2, 3);
  const primerCans = Math.max(1, Math.ceil(primerLiters / spec.packaging_rules.primer_can_l));
  const tapeLength = roundDisplay(work.perimeter, 3);
  const tapeRolls = Math.max(1, Math.ceil(tapeLength / spec.packaging_rules.tape_roll_m));

  const warnings: string[] = [];
  if (thickness < spec.material_rules.leveling_min_thickness_mm && mixtureType.id === 0) {
    warnings.push('Минимальная толщина выравнивающей смеси — 5 мм. Для тонкого слоя используйте финишную смесь');
  }
  if (thickness > spec.material_rules.finish_max_thickness_mm && mixtureType.id !== 0) {
    warnings.push('Для больших перепадов (> 30 мм) используйте выравнивающую базовую смесь');
  }
  if (work.area > spec.material_rules.deformation_joint_area_threshold_m2) {
    warnings.push('При площади > 30 м² необходимо устройство деформационных швов');
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: buildMaterials(spec, mixtureType, totalKg, bagWeight, recScenario.buy_plan.packages_count, primerLiters, primerCans, tapeLength, tapeRolls),
    totals: {
      area: work.area,
      perimeter: work.perimeter,
      inputMode: work.inputMode,
      thickness: roundDisplay(thickness, 3),
      mixtureType: mixtureType.id,
      bagWeight,
      consumptionKgPerM2Mm: roundDisplay(consumptionKgPerM2Mm, 6),
      totalKg,
      bagsNeeded: recScenario.buy_plan.packages_count,
      primerNeededL: primerLiters,
      primerCans,
      damperTapeLengthM: tapeLength,
      damperTapeRolls: tapeRolls,
      minExactNeedKg: scenarios.MIN.exact_need,
      recExactNeedKg: recScenario.exact_need,
      maxExactNeedKg: scenarios.MAX.exact_need,
      minPurchaseKg: scenarios.MIN.purchase_quantity,
      recPurchaseKg: recScenario.purchase_quantity,
      maxPurchaseKg: scenarios.MAX.purchase_quantity,
    },
    warnings,
    scenarios,
  };
}
