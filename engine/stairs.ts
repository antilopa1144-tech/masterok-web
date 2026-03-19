import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  StairsCanonicalSpec,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";

interface StairsInputs {
  floorHeight?: number;
  stepHeight?: number;
  stepWidth?: number;
  stairWidth?: number;
  materialType?: number;
  accuracyMode?: AccuracyMode;
}

function getInputDefault(spec: StairsCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

const WOOD_SCREWS_PER_KG = 600;  // 3.5×35 мм

function buildWoodMaterials(
  spec: StairsCanonicalSpec,
  stepCount: number,
  stringerLen: number,
  railingLen: number,
  balyasiny: number,
): CanonicalMaterialResult[] {
  const stringerBoard = Math.ceil(stringerLen * 1.1) * spec.material_rules.stringers_count;
  const screwsPcs = stepCount * 8;
  const screwsKg = Math.ceil(screwsPcs / WOOD_SCREWS_PER_KG * 10) / 10;
  return [
    {
      name: `Тетива/косоур (${spec.material_rules.stringer_board})`,
      quantity: stringerBoard,
      unit: "п.м",
      withReserve: stringerBoard,
      purchaseQty: stringerBoard,
      category: "Основное",
    },
    {
      name: `Ступени (${spec.material_rules.tread_board})`,
      quantity: stepCount,
      unit: "шт",
      withReserve: stepCount,
      purchaseQty: stepCount,
      category: "Основное",
    },
    {
      name: `Подступенки (${spec.material_rules.riser_board})`,
      quantity: stepCount,
      unit: "шт",
      withReserve: stepCount,
      purchaseQty: stepCount,
      category: "Основное",
    },
    {
      name: "Саморезы",
      quantity: screwsKg,
      unit: "кг",
      withReserve: screwsKg,
      purchaseQty: Math.ceil(screwsKg),
      category: "Крепёж",
    },
    {
      name: "Перила (поручень)",
      quantity: roundDisplay(railingLen, 3),
      unit: "п.м",
      withReserve: Math.ceil(railingLen),
      purchaseQty: Math.ceil(railingLen),
      category: "Ограждение",
    },
    {
      name: "Балясины",
      quantity: balyasiny,
      unit: "шт",
      withReserve: balyasiny,
      purchaseQty: balyasiny,
      category: "Ограждение",
    },
  ];
}

function buildConcreteMaterials(
  spec: StairsCanonicalSpec,
  stepCount: number,
  stairWidth: number,
  stepWidthM: number,
  stepHeightM: number,
  railingLen: number,
  balyasiny: number,
): CanonicalMaterialResult[] {
  const vol = roundDisplay(stairWidth * stepWidthM * stepHeightM / 2 * stepCount, 6);
  const rebarKg = roundDisplay(stepCount * stairWidth * spec.material_rules.rebar_kg_per_step_width, 3);
  return [
    {
      name: "Бетон М300",
      quantity: roundDisplay(vol, 3),
      unit: "м³",
      withReserve: roundDisplay(vol, 3),
      purchaseQty: Math.ceil(vol),
      category: "Основное",
    },
    {
      name: "Арматура",
      quantity: rebarKg,
      unit: "кг",
      withReserve: Math.ceil(rebarKg),
      purchaseQty: Math.ceil(rebarKg),
      category: "Армирование",
    },
    {
      name: "Перила (поручень)",
      quantity: roundDisplay(railingLen, 3),
      unit: "п.м",
      withReserve: Math.ceil(railingLen),
      purchaseQty: Math.ceil(railingLen),
      category: "Ограждение",
    },
    {
      name: "Балясины",
      quantity: balyasiny,
      unit: "шт",
      withReserve: balyasiny,
      purchaseQty: balyasiny,
      category: "Ограждение",
    },
  ];
}

function buildMetalMaterials(
  stepCount: number,
  stringerLen: number,
  railingLen: number,
  balyasiny: number,
): CanonicalMaterialResult[] {
  const channelLen = roundDisplay(stringerLen * 2 * 1.1, 3);
  const bolts = stepCount * 4;
  return [
    {
      name: "Швеллер (каркас)",
      quantity: channelLen,
      unit: "п.м",
      withReserve: Math.ceil(channelLen),
      purchaseQty: Math.ceil(channelLen),
      category: "Основное",
    },
    {
      name: "Болты крепёжные",
      quantity: bolts,
      unit: "шт",
      withReserve: bolts,
      purchaseQty: bolts,
      category: "Крепёж",
    },
    {
      name: "Перила (поручень)",
      quantity: roundDisplay(railingLen, 3),
      unit: "п.м",
      withReserve: Math.ceil(railingLen),
      purchaseQty: Math.ceil(railingLen),
      category: "Ограждение",
    },
    {
      name: "Балясины",
      quantity: balyasiny,
      unit: "шт",
      withReserve: balyasiny,
      purchaseQty: balyasiny,
      category: "Ограждение",
    },
  ];
}

export function computeCanonicalStairs(
  spec: StairsCanonicalSpec,
  inputs: StairsInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const floorHeight = Math.max(2.0, Math.min(6.0, inputs.floorHeight ?? getInputDefault(spec, "floorHeight", 2.8)));
  const stepHeight = Math.max(150, Math.min(200, inputs.stepHeight ?? getInputDefault(spec, "stepHeight", 170)));
  const stepWidth = Math.max(250, Math.min(320, inputs.stepWidth ?? getInputDefault(spec, "stepWidth", 280)));
  const stairWidth = Math.max(0.6, Math.min(2.0, inputs.stairWidth ?? getInputDefault(spec, "stairWidth", 1.0)));
  const materialType = Math.max(0, Math.min(2, Math.round(inputs.materialType ?? getInputDefault(spec, "materialType", 0))));

  const stepCount = Math.round(floorHeight / (stepHeight / 1000));
  const realStepH = roundDisplay(floorHeight / stepCount, 6);
  const horizLen = roundDisplay((stepCount - 1) * (stepWidth / 1000), 6);
  const stringerLen = roundDisplay(Math.sqrt(floorHeight * floorHeight + horizLen * horizLen), 6);
  const railingLen = roundDisplay(horizLen * 2, 6);
  const balyasiny = Math.ceil(railingLen / spec.material_rules.railing_spacing);

  let materials: CanonicalMaterialResult[];
  const MATERIAL_LABELS = ["wood", "concrete", "metal"];
  const materialKey = MATERIAL_LABELS[materialType] ?? "wood";

  if (materialType === 1) {
    materials = buildConcreteMaterials(spec, stepCount, stairWidth, stepWidth / 1000, stepHeight / 1000, railingLen, balyasiny);
  } else if (materialType === 2) {
    materials = buildMetalMaterials(stepCount, stringerLen, railingLen, balyasiny);
  } else {
    materials = buildWoodMaterials(spec, stepCount, stringerLen, railingLen, balyasiny);
  }

  const baseExactNeedRaw = stepCount;
  const baseExactNeed = Math.ceil(baseExactNeedRaw * accuracyMult);

  const packageOptions = [{
    size: spec.packaging_rules.package_size,
    label: `stairs-step-${spec.packaging_rules.package_size}`,
    unit: spec.packaging_rules.unit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(baseExactNeed * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `material:${materialKey}`,
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

  const warnings: string[] = [];
  if (stepHeight > spec.warnings_rules.steep_step_threshold_mm) {
    warnings.push("Высота ступени выше нормы — лестница может быть некомфортной");
  }
  if (stepCount > spec.warnings_rules.max_steps_per_flight) {
    warnings.push("Большое количество ступеней — рекомендуется устройство промежуточной площадки");
  }


  const practicalNotes: string[] = [];
  if (stepHeight > 190) {
    practicalNotes.push(`Высота ступени ${stepHeight} мм — превышает ГОСТ (190 мм), будет неудобно и опасно`);
  }
  practicalNotes.push("Ширина проступи минимум 250 мм, оптимально 280-300 мм — нога должна полностью вставать");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      floorHeight: roundDisplay(floorHeight, 3),
      stepHeight: roundDisplay(stepHeight, 3),
      stepWidth: roundDisplay(stepWidth, 3),
      stairWidth: roundDisplay(stairWidth, 3),
      materialType: materialType,
      stepCount: stepCount,
      realStepH: roundDisplay(realStepH, 6),
      horizLen: roundDisplay(horizLen, 3),
      stringerLen: roundDisplay(stringerLen, 3),
      railingLen: roundDisplay(railingLen, 3),
      balyasiny: balyasiny,
      minExactNeedSteps: scenarios.MIN.exact_need,
      recExactNeedSteps: recScenario.exact_need,
      maxExactNeedSteps: scenarios.MAX.exact_need,
      minPurchaseSteps: scenarios.MIN.purchase_quantity,
      recPurchaseSteps: recScenario.purchase_quantity,
      maxPurchaseSteps: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(baseExactNeedRaw, "generic", accuracyMode).explanation,
  };
}
