import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  ConcreteCanonicalSpec,
  ConcreteProportionSpec,
} from "./canonical";
import { roundDisplay } from "./units";

interface ConcreteInputs {
  concreteVolume?: number;
  concreteGrade?: number;
  manualMix?: number;
  reserve?: number;
  inputMode?: number;
  area?: number;
  thickness?: number;
}

const GRADE_LABELS: Record<number, string> = {
  1: "М100 (В7.5)",
  2: "М150 (В12.5)",
  3: "М200 (В15)",
  4: "М250 (В20)",
  5: "М300 (В22.5)",
  6: "М350 (В25)",
  7: "М400 (В30)",
};

function getInputDefault(spec: ConcreteCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

function resolveProportions(spec: ConcreteCanonicalSpec, grade: number): ConcreteProportionSpec {
  return spec.normative_formula.proportions.find((p) => p.grade === grade) ?? spec.normative_formula.proportions[2];
}

function resolveVolume(spec: ConcreteCanonicalSpec, inputs: ConcreteInputs): { inputMode: number; sourceVolume: number } {
  const inputMode = Math.round(inputs.inputMode ?? getInputDefault(spec, "inputMode", 0));
  if (inputMode === 1) {
    const area = Math.max(0.1, inputs.area ?? getInputDefault(spec, "area", 20));
    const thickness = Math.max(50, Math.min(1000, inputs.thickness ?? getInputDefault(spec, "thickness", 200)));
    return { inputMode: 1, sourceVolume: roundDisplay(area * (thickness / 1000), 6) };
  }
  return { inputMode: 0, sourceVolume: roundDisplay(Math.max(0.1, inputs.concreteVolume ?? getInputDefault(spec, "concreteVolume", 5)), 6) };
}

function buildMaterials(
  spec: ConcreteCanonicalSpec,
  gradeLabel: string,
  totalVolume: number,
  proportions: ConcreteProportionSpec,
  manualMix: number,
  recExactNeed: number,
  recPurchaseQuantity: number,
  recPackageSize: number,
  recPackageCount: number,
  masticBuckets: number,
  masticKg: number,
  filmRolls: number,
  filmArea: number,
  cementBags: number,
  cementKg: number,
  sandM3: number,
  gravelM3: number,
  waterL: number,
): CanonicalMaterialResult[] {
  const materials: CanonicalMaterialResult[] = [
    {
      name: `Бетон ${gradeLabel}`,
      quantity: roundDisplay(recExactNeed, 3),
      unit: "м³",
      withReserve: roundDisplay(recPurchaseQuantity, 3),
      purchaseQty: recPackageCount,
      category: "Основное",
    },
  ];

  if (manualMix) {
    materials.push(
      {
        name: `Цемент М400 (${spec.packaging_rules.cement_bag_kg} кг)`,
        quantity: roundDisplay(cementKg, 3),
        unit: "кг",
        withReserve: roundDisplay(cementBags * spec.packaging_rules.cement_bag_kg, 3),
        purchaseQty: cementBags,
        category: "Компоненты",
      },
      {
        name: "Песок строительный",
        quantity: roundDisplay(sandM3, 3),
        unit: "м³",
        withReserve: roundDisplay(sandM3, 3),
        purchaseQty: Math.ceil(sandM3),
        category: "Компоненты",
      },
      {
        name: "Щебень",
        quantity: roundDisplay(gravelM3, 3),
        unit: "м³",
        withReserve: roundDisplay(gravelM3, 3),
        purchaseQty: Math.ceil(gravelM3),
        category: "Компоненты",
      },
      {
        name: "Вода",
        quantity: roundDisplay(waterL, 3),
        unit: "л",
        withReserve: roundDisplay(waterL, 3),
        purchaseQty: Math.ceil(waterL),
        category: "Компоненты",
      },
    );
  }

  materials.push(
    {
      name: `Мастика гидроизоляционная (${spec.packaging_rules.mastic_bucket_kg} кг)`,
      quantity: roundDisplay(masticKg, 3),
      unit: "кг",
      withReserve: roundDisplay(masticBuckets * spec.packaging_rules.mastic_bucket_kg, 3),
      purchaseQty: masticBuckets,
      category: "Гидроизоляция",
    },
    {
      name: `Плёнка полиэтиленовая (${spec.packaging_rules.film_roll_m2} м²)`,
      quantity: roundDisplay(filmArea, 3),
      unit: "м²",
      withReserve: roundDisplay(filmRolls * spec.packaging_rules.film_roll_m2, 3),
      purchaseQty: filmRolls,
      category: "Гидроизоляция",
    },
  );

  return materials;
}

export function computeCanonicalConcrete(
  spec: ConcreteCanonicalSpec,
  inputs: ConcreteInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const volume = resolveVolume(spec, inputs);
  const concreteGrade = Math.max(1, Math.min(7, Math.round(inputs.concreteGrade ?? getInputDefault(spec, "concreteGrade", 3))));
  const manualMix = Math.round(inputs.manualMix ?? getInputDefault(spec, "manualMix", 0)) === 1 ? 1 : 0;
  const reserve = Math.max(0, Math.min(50, inputs.reserve ?? getInputDefault(spec, "reserve", 10)));
  const proportions = resolveProportions(spec, concreteGrade);
  const gradeLabel = GRADE_LABELS[concreteGrade] ?? GRADE_LABELS[3];

  const sourceVolume = volume.sourceVolume;
  const totalVolume = roundDisplay(sourceVolume * (1 + reserve / 100), 6);

  // Waterproofing calculations
  const estimatedThickness = spec.material_rules.estimated_slab_thickness_m;
  const topSurfaceArea = roundDisplay(totalVolume / estimatedThickness, 6);
  const perimeterEst = roundDisplay(Math.sqrt(topSurfaceArea) * 4, 6);
  const waterproofArea = roundDisplay(perimeterEst * estimatedThickness, 6);
  const masticKg = roundDisplay(waterproofArea * spec.material_rules.waterproof_mastic_kg_per_m2 * spec.material_rules.waterproof_reserve_factor, 6);
  const masticBuckets = Math.ceil(masticKg / spec.packaging_rules.mastic_bucket_kg);

  // Film
  const filmArea = roundDisplay(topSurfaceArea * spec.material_rules.film_reserve_factor, 6);
  const filmRolls = Math.ceil(filmArea / spec.packaging_rules.film_roll_m2);

  // Manual mix components
  let cementKg = 0;
  let cementBags = 0;
  let sandM3 = 0;
  let gravelM3 = 0;
  let waterL = 0;

  if (manualMix) {
    cementKg = roundDisplay(totalVolume * proportions.cement_kg, 6);
    cementBags = Math.ceil(cementKg / spec.packaging_rules.cement_bag_kg);
    sandM3 = roundDisplay(totalVolume * proportions.sand_m3 * spec.material_rules.sand_reserve_factor, 6);
    gravelM3 = roundDisplay(totalVolume * proportions.gravel_m3 * spec.material_rules.gravel_reserve_factor, 6);
    waterL = roundDisplay(totalVolume * proportions.water_l, 6);
  }

  // Package options for the main concrete volume
  const packageOptions = [{
    size: spec.packaging_rules.volume_step_m3,
    label: `concrete-${spec.packaging_rules.volume_step_m3}${spec.packaging_rules.unit}`,
    unit: spec.packaging_rules.unit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(totalVolume * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `grade:${proportions.grade}`,
        `manual_mix:${manualMix}`,
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

  const warnings: string[] = [];
  if (sourceVolume < spec.warnings_rules.small_volume_threshold_m3) {
    warnings.push("Малый объём бетона — перерасход на замес и доставку может быть значительным");
  }
  if (concreteGrade >= spec.warnings_rules.manual_mix_max_grade && manualMix) {
    warnings.push("Бетон высоких марок сложно замешивать вручную — рекомендуется заводской бетон");
  }

  const recScenario = scenarios.REC;

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: buildMaterials(
      spec,
      gradeLabel,
      totalVolume,
      proportions,
      manualMix,
      recScenario.exact_need,
      recScenario.purchase_quantity,
      recScenario.buy_plan.package_size,
      recScenario.buy_plan.packages_count,
      masticBuckets,
      masticKg,
      filmRolls,
      filmArea,
      cementBags,
      cementKg,
      sandM3,
      gravelM3,
      waterL,
    ),
    totals: {
      sourceVolume: roundDisplay(sourceVolume, 3),
      totalVolume: roundDisplay(totalVolume, 3),
      inputMode: volume.inputMode,
      concreteGrade,
      manualMix,
      reserve: roundDisplay(reserve, 3),
      gradeIndex: concreteGrade,
      cementKgPerM3: proportions.cement_kg,
      sandM3PerM3: proportions.sand_m3,
      gravelM3PerM3: proportions.gravel_m3,
      waterLPerM3: proportions.water_l,
      topSurfaceArea: roundDisplay(topSurfaceArea, 3),
      perimeterEst: roundDisplay(perimeterEst, 3),
      waterproofArea: roundDisplay(waterproofArea, 3),
      masticKg: roundDisplay(masticKg, 3),
      masticBuckets,
      filmArea: roundDisplay(filmArea, 3),
      filmRolls,
      cementKg: roundDisplay(cementKg, 3),
      cementBags,
      sandM3: roundDisplay(sandM3, 3),
      gravelM3: roundDisplay(gravelM3, 3),
      waterL: roundDisplay(waterL, 3),
      minExactNeedM3: scenarios.MIN.exact_need,
      recExactNeedM3: recScenario.exact_need,
      maxExactNeedM3: scenarios.MAX.exact_need,
      minPurchaseM3: scenarios.MIN.purchase_quantity,
      recPurchaseM3: recScenario.purchase_quantity,
      maxPurchaseM3: scenarios.MAX.purchase_quantity,
    },
    warnings,
    scenarios,
  };
}
