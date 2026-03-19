import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  StripFoundationCanonicalSpec,
} from "./canonical";
import { roundDisplay } from "./units";
import { type AccuracyMode, DEFAULT_ACCURACY_MODE, applyAccuracyMode, getPrimaryMultiplier } from "./accuracy";

interface StripFoundationInputs {
  perimeter?: number;
  width?: number;
  depth?: number;
  aboveGround?: number;
  reinforcement?: number;
  deliveryMethod?: number;
  accuracyMode?: AccuracyMode;
}

function getInputDefault(spec: StripFoundationCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

function buildMaterials(
  volReserve: number,
  longLen: number,
  longWeightKg: number,
  clampLen: number,
  clampWeightKg: number,
  wireKg: number,
  formwork: number,
  boards: number,
  rebarDiam: number,
): CanonicalMaterialResult[] {
  return [
    {
      name: "Бетон М300",
      quantity: roundDisplay(volReserve, 3),
      unit: "м³",
      withReserve: roundDisplay(volReserve, 3),
      purchaseQty: Math.ceil(volReserve),
      category: "Основное",
    },
    {
      name: `Арматура продольная ∅${rebarDiam} мм`,
      quantity: roundDisplay(longWeightKg, 3),
      unit: "кг",
      withReserve: Math.ceil(longWeightKg),
      purchaseQty: Math.ceil(longWeightKg),
      category: "Армирование",
    },
    {
      name: "Арматура поперечная (хомуты)",
      quantity: roundDisplay(clampWeightKg, 3),
      unit: "кг",
      withReserve: Math.ceil(clampWeightKg),
      purchaseQty: Math.ceil(clampWeightKg),
      category: "Армирование",
    },
    {
      name: "Проволока вязальная",
      quantity: roundDisplay(wireKg, 3),
      unit: "кг",
      withReserve: roundDisplay(wireKg, 3),
      purchaseQty: Math.ceil(wireKg),
      category: "Армирование",
    },
    {
      name: "Опалубка (доска обрезная)",
      quantity: roundDisplay(formwork, 3),
      unit: "м²",
      withReserve: Math.ceil(formwork),
      purchaseQty: Math.ceil(formwork),
      category: "Опалубка",
    },
    {
      name: "Доска обрезная 150×6000 мм",
      quantity: boards,
      unit: "шт",
      withReserve: boards,
      purchaseQty: boards,
      category: "Опалубка",
    },
  ];
}

export function computeCanonicalStripFoundation(
  spec: StripFoundationCanonicalSpec,
  inputs: StripFoundationInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("generic", accuracyMode);

  const perimeter = Math.max(10, Math.min(200, inputs.perimeter ?? getInputDefault(spec, "perimeter", 40)));
  const width = Math.max(200, Math.min(600, inputs.width ?? getInputDefault(spec, "width", 400)));
  const depth = Math.max(300, Math.min(2000, inputs.depth ?? getInputDefault(spec, "depth", 700)));
  const aboveGround = Math.max(0, Math.min(600, inputs.aboveGround ?? getInputDefault(spec, "aboveGround", 300)));
  const reinforcement = Math.max(0, Math.min(3, Math.round(inputs.reinforcement ?? getInputDefault(spec, "reinforcement", 1))));
  const deliveryMethod = Math.max(0, Math.min(2, Math.round(inputs.deliveryMethod ?? getInputDefault(spec, "deliveryMethod", 0))));

  const rebarDiam = spec.material_rules.rebar_diameters[String(reinforcement)] ?? 12;
  const threads = spec.material_rules.rebar_threads[String(reinforcement)] ?? 4;
  const weightPerM = spec.material_rules.weight_per_m[String(rebarDiam)] ?? 0.888;

  const totalH = (depth + aboveGround) / 1000;
  const vol = perimeter * (width / 1000) * totalH;
  const techLoss = spec.material_rules.tech_loss[String(deliveryMethod)] ?? 0;
  const volReserveRaw = roundDisplay((vol + techLoss) * spec.material_rules.concrete_reserve, 6);
  const volReserve = roundDisplay(volReserveRaw * accuracyMult, 6);

  const longLen = roundDisplay(perimeter * threads * spec.material_rules.overlap, 6);
  const longWeightKg = roundDisplay(longLen * weightPerM, 6);

  const clampCount = Math.ceil(perimeter / spec.material_rules.clamp_step);
  const clampPerim = 2 * ((width / 1000) - 0.1 + totalH - 0.1) + 0.3;
  const clampLen = roundDisplay(clampCount * Math.max(0.8, clampPerim) * 1.05, 6);
  const clampWeightKg = roundDisplay(clampLen * spec.material_rules.clamp_weight, 6);

  const wireKg = roundDisplay(Math.ceil(clampCount * threads * 0.05 * 1.1 * 10) / 10, 6);

  const formwork = roundDisplay(2 * perimeter * (aboveGround / 1000 + 0.1), 6);
  const boards = Math.ceil(formwork / (0.15 * 6));

  const packageOptions = [{
    size: spec.packaging_rules.volume_step_m3,
    label: `strip-foundation-${spec.packaging_rules.volume_step_m3}${spec.packaging_rules.unit}`,
    unit: spec.packaging_rules.unit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(volReserve * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `reinforcement:${reinforcement}`,
        `deliveryMethod:${deliveryMethod}`,
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
  if (depth <= spec.warnings_rules.shallow_depth_threshold_mm) {
    warnings.push("Мелкое заглубление — убедитесь, что глубина ниже уровня промерзания грунта");
  }
  if (perimeter > spec.warnings_rules.large_perimeter_threshold_m) {
    warnings.push("Большой периметр — рекомендуется разделить на секции с деформационными швами");
  }

  const practicalNotes: string[] = [];
  if (depth < 600) {
    practicalNotes.push(`Глубина ${roundDisplay(depth, 0)} мм — мелкозаглублённый фундамент, работает только на непучинистых грунтах`);
  }
  if (volReserve > 10) {
    practicalNotes.push(`Объём ${roundDisplay(volReserve, 1)} м³ — заказывайте бетон с доставкой, ручной замес на таком объёме нерентабелен`);
  }
  if (width < 300) {
    practicalNotes.push(`Ширина ленты ${roundDisplay(width, 0)} мм — для каменных стен минимум 400 мм`);
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: buildMaterials(
      volReserve,
      longLen,
      longWeightKg,
      clampLen,
      clampWeightKg,
      wireKg,
      formwork,
      boards,
      rebarDiam,
    ),
    totals: {
      perimeter: roundDisplay(perimeter, 3),
      width: roundDisplay(width, 3),
      depth: roundDisplay(depth, 3),
      aboveGround: roundDisplay(aboveGround, 3),
      reinforcement: reinforcement,
      deliveryMethod: deliveryMethod,
      totalH: roundDisplay(totalH, 3),
      vol: roundDisplay(vol, 3),
      volReserve: roundDisplay(volReserve, 3),
      rebarDiam: rebarDiam,
      threads: threads,
      longLen: roundDisplay(longLen, 3),
      longWeightKg: roundDisplay(longWeightKg, 3),
      clampCount: clampCount,
      clampLen: roundDisplay(clampLen, 3),
      clampWeightKg: roundDisplay(clampWeightKg, 3),
      wireKg: roundDisplay(wireKg, 3),
      formwork: roundDisplay(formwork, 3),
      boards: boards,
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
    accuracyExplanation: applyAccuracyMode(volReserveRaw, "generic", accuracyMode).explanation,
  };
}
