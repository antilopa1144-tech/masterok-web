import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  FoundationSlabCanonicalSpec,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";

interface FoundationSlabInputs {
  area?: number;
  thickness?: number;
  rebarDiam?: number;
  rebarStep?: number;
  insulationThickness?: number;
  accuracyMode?: AccuracyMode;
}

function getInputDefault(spec: FoundationSlabCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

function buildMaterials(
  concreteM3: number,
  rebarKg: number,
  wireKg: number,
  formworkArea: number,
  geotextile: number,
  gravel: number,
  sand: number,
  eppsPlates: number,
  rebarDiam: number,
  insulationThickness: number,
): CanonicalMaterialResult[] {
  const materials: CanonicalMaterialResult[] = [
    {
      name: "Бетон М300",
      quantity: roundDisplay(concreteM3, 3),
      unit: "м³",
      withReserve: roundDisplay(concreteM3, 3),
      purchaseQty: Math.ceil(concreteM3),
      category: "Основное",
    },
    {
      name: `Арматура ∅${rebarDiam} мм`,
      quantity: roundDisplay(rebarKg, 3),
      unit: "кг",
      withReserve: Math.ceil(rebarKg),
      purchaseQty: Math.ceil(rebarKg),
      category: "Армирование",
    },
    {
      name: "Проволока вязальная",
      quantity: roundDisplay(wireKg, 3),
      unit: "кг",
      withReserve: Math.ceil(wireKg),
      purchaseQty: Math.ceil(wireKg),
      category: "Армирование",
    },
    {
      name: "Опалубка (доска)",
      quantity: roundDisplay(formworkArea, 3),
      unit: "м²",
      withReserve: Math.ceil(formworkArea),
      purchaseQty: Math.ceil(formworkArea),
      category: "Опалубка",
    },
    {
      name: "Геотекстиль",
      quantity: roundDisplay(geotextile, 3),
      unit: "м²",
      withReserve: Math.ceil(geotextile),
      purchaseQty: Math.ceil(geotextile),
      category: "Подготовка",
    },
    {
      name: "Щебень (подушка)",
      quantity: roundDisplay(gravel, 3),
      unit: "м³",
      withReserve: roundDisplay(gravel, 3),
      purchaseQty: Math.ceil(gravel),
      category: "Подготовка",
    },
    {
      name: "Песок (подушка)",
      quantity: roundDisplay(sand, 3),
      unit: "м³",
      withReserve: roundDisplay(sand, 3),
      purchaseQty: Math.ceil(sand),
      category: "Подготовка",
    },
  ];

  if (insulationThickness > 0) {
    materials.push({
      name: "ЭППС утеплитель",
      quantity: eppsPlates,
      unit: "шт",
      withReserve: eppsPlates,
      purchaseQty: eppsPlates,
      category: "Утепление",
    });
  }

  return materials;
}

export function computeCanonicalFoundationSlab(
  spec: FoundationSlabCanonicalSpec,
  inputs: FoundationSlabInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const area = Math.max(10, Math.min(500, inputs.area ?? getInputDefault(spec, "area", 60)));
  const thickness = Math.max(150, Math.min(300, inputs.thickness ?? getInputDefault(spec, "thickness", 200)));
  const rebarDiam = Math.max(10, Math.min(16, inputs.rebarDiam ?? getInputDefault(spec, "rebarDiam", 12)));
  const rebarStep = Math.max(150, Math.min(250, inputs.rebarStep ?? getInputDefault(spec, "rebarStep", 200)));
  const insulationThickness = Math.max(0, Math.min(150, inputs.insulationThickness ?? getInputDefault(spec, "insulationThickness", 0)));

  const weightPerMeter = spec.material_rules.weight_per_meter[String(rebarDiam)] ?? 0.888;
  const side = Math.sqrt(area);
  const perimeter = side * 4;
  const concreteM3Raw = roundDisplay(area * (thickness / 1000) * spec.material_rules.concrete_reserve, 6);
  const concreteM3 = roundDisplay(concreteM3Raw * accuracyMult, 6);
  const barsPerDir = Math.ceil(side / (rebarStep / 1000)) + 1;
  const totalBarLen = barsPerDir * side * 2 * 2;
  const rebarKg = roundDisplay(totalBarLen * weightPerMeter, 6);
  const wireKg = roundDisplay(barsPerDir * barsPerDir * 2 * spec.material_rules.wire_per_joint, 6);
  const formworkArea = roundDisplay(perimeter * (thickness / 1000) * spec.material_rules.formwork_reserve, 6);
  const geotextile = roundDisplay(area * spec.material_rules.geotextile_reserve, 6);
  const gravel = roundDisplay(area * spec.material_rules.gravel_layer, 6);
  const sand = roundDisplay(area * spec.material_rules.sand_layer, 6);
  const eppsPlates = insulationThickness > 0
    ? Math.ceil(area * spec.material_rules.insulation_reserve / spec.material_rules.epps_plate_m2)
    : 0;

  const packageOptions = [{
    size: spec.packaging_rules.volume_step_m3,
    label: `foundation-slab-${spec.packaging_rules.volume_step_m3}${spec.packaging_rules.unit}`,
    unit: spec.packaging_rules.unit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(concreteM3 * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `rebarDiam:${rebarDiam}`,
        `rebarStep:${rebarStep}`,
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
  if (thickness <= spec.warnings_rules.thin_slab_threshold_mm) {
    warnings.push("Тонкая плита — убедитесь, что расчёт соответствует нагрузкам");
  }
  if (area > spec.warnings_rules.large_area_threshold_m2) {
    warnings.push("Большая площадь плиты — рекомендуется профессиональный расчёт нагрузок");
  }

  const practicalNotes: string[] = [];
  if (thickness <= 150) {
    practicalNotes.push(`Плита ${roundDisplay(thickness, 0)} мм — только для лёгких каркасных конструкций, для кирпичного дома минимум 250 мм`);
  }
  if (area > 100) {
    practicalNotes.push(`Плита ${roundDisplay(area, 0)} м² — обязательно непрерывная заливка, иначе холодный шов ослабит конструкцию`);
  }
  if (rebarStep > 200) {
    practicalNotes.push(`Шаг арматуры ${roundDisplay(rebarStep, 0)} мм — для плиты под жилой дом рекомендую не более 200 мм`);
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: buildMaterials(
      concreteM3,
      rebarKg,
      wireKg,
      formworkArea,
      geotextile,
      gravel,
      sand,
      eppsPlates,
      rebarDiam,
      insulationThickness,
    ),
    totals: {
      area: roundDisplay(area, 3),
      thickness: roundDisplay(thickness, 3),
      rebarDiam: roundDisplay(rebarDiam, 3),
      rebarStep: roundDisplay(rebarStep, 3),
      insulationThickness: roundDisplay(insulationThickness, 3),
      side: roundDisplay(side, 3),
      perimeter: roundDisplay(perimeter, 3),
      concreteM3: roundDisplay(concreteM3, 3),
      barsPerDir: barsPerDir,
      totalBarLen: roundDisplay(totalBarLen, 3),
      rebarKg: roundDisplay(rebarKg, 3),
      wireKg: roundDisplay(wireKg, 3),
      formworkArea: roundDisplay(formworkArea, 3),
      geotextile: roundDisplay(geotextile, 3),
      gravel: roundDisplay(gravel, 3),
      sand: roundDisplay(sand, 3),
      eppsPlates: eppsPlates,
      minExactNeedM3: scenarios.MIN.exact_need,
      recExactNeedM3: recScenario.exact_need,
      maxExactNeedM3: scenarios.MAX.exact_need,
      minPurchaseM3: scenarios.MIN.purchase_quantity,
      recPurchaseM3: recScenario.purchase_quantity,
      maxPurchaseM3: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: applyAccuracyMode(concreteM3Raw, "generic", accuracyMode).explanation,
  };
}
