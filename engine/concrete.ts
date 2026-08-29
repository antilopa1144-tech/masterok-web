import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  ConcreteCanonicalSpec,
  ConcreteProportionSpec,
} from "./canonical";
import { roundDisplay } from "./units";
import { ACCURACY_MODE_LABELS, type AccuracyMode, DEFAULT_ACCURACY_MODE } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface ConcreteInputs {
  concreteVolume?: number;
  concreteGrade?: number;
  manualMix?: number;
  readyMixOrderStepM3?: number;
  reserve?: number;
  inputMode?: number;
  area?: number;
  thickness?: number;
  accuracyMode?: AccuracyMode;
}

function resolveProportions(spec: ConcreteCanonicalSpec, grade: number): ConcreteProportionSpec {
  return spec.planning_mix.proportions.find((p) => p.grade === grade) ?? spec.planning_mix.proportions[2];
}

function roundUpToStep(value: number, step: number): number {
  return roundDisplay(Math.ceil((value - Number.EPSILON) / step) * step, 6);
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

/**
 * Базовые материалы: основной бетон + компоненты ручного замеса.
 *
 * При готовой смеси основной товар — бетон. При самостоятельном замесе основной
 * список — цемент и заполнители: показывать одновременно готовую смесь и её
 * компоненты как две покупки нельзя. Вода остаётся только справочным ориентиром
 * в totals и не превращается в товар или рецепт дозирования.
 */
function buildMaterials(
  spec: ConcreteCanonicalSpec,
  gradeLabel: string,
  proportions: ConcreteProportionSpec,
  manualMix: number,
  sourceVolume: number,
  recExactNeed: number,
  recPackageSize: number,
  recPackageCount: number,
  cementBags: number,
  cementKg: number,
  sandM3: number,
  gravelM3: number,
): CanonicalMaterialResult[] {
  void proportions;
  const materials: CanonicalMaterialResult[] = [];

  if (!manualMix) {
    materials.push({
      name: `Бетон ${gradeLabel}`,
      quantity: roundDisplay(sourceVolume, 3),
      unit: "м³",
      withReserve: roundDisplay(recExactNeed, 3),
      purchaseQty: roundDisplay(recPackageCount * recPackageSize, 3),
      category: "Основное",
    });
  }

  if (manualMix) {
    const aggregateStep = spec.packaging_rules.aggregate_order_step_m3;
    materials.push(
      {
        name: `Цемент М400 (${spec.packaging_rules.cement_bag_kg} кг)`,
        quantity: roundDisplay(cementKg, 3),
        unit: "кг",
        withReserve: roundDisplay(cementBags * spec.packaging_rules.cement_bag_kg, 3),
        purchaseQty: cementBags * spec.packaging_rules.cement_bag_kg,
        packageInfo: { count: cementBags, size: spec.packaging_rules.cement_bag_kg, packageUnit: "мешков" },
        category: "Компоненты",
      },
      {
        name: "Песок строительный",
        quantity: roundDisplay(sandM3, 3),
        unit: "м³",
        withReserve: roundDisplay(sandM3, 3),
        purchaseQty: roundUpToStep(sandM3, aggregateStep),
        category: "Компоненты",
      },
      {
        name: "Щебень",
        quantity: roundDisplay(gravelM3, 3),
        unit: "м³",
        withReserve: roundDisplay(gravelM3, 3),
        purchaseQty: roundUpToStep(gravelM3, aggregateStep),
        category: "Компоненты",
      },
    );
  }

  return materials;
}

export function computeCanonicalConcrete(
  spec: ConcreteCanonicalSpec,
  inputs: ConcreteInputs,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  const volume = resolveVolume(spec, inputs);
  const concreteGrade = Math.max(1, Math.min(7, Math.round(inputs.concreteGrade ?? getInputDefault(spec, "concreteGrade", 3))));
  const manualMix = Math.round(inputs.manualMix ?? getInputDefault(spec, "manualMix", 0)) === 1 ? 1 : 0;
  const requestedOrderStep = inputs.readyMixOrderStepM3 ?? getInputDefault(spec, "readyMixOrderStepM3", 0.1);
  const readyMixOrderStepM3 = spec.packaging_rules.allowed_ready_mix_order_steps_m3.includes(requestedOrderStep)
    ? requestedOrderStep
    : spec.packaging_rules.allowed_ready_mix_order_steps_m3[0];
  const reserve = Math.max(0, Math.min(20, inputs.reserve ?? getInputDefault(spec, "reserve", 5)));
  const proportions = resolveProportions(spec, concreteGrade);
  const gradeLabel = proportions.label;

  const sourceVolume = volume.sourceVolume;
  const totalVolume = roundDisplay(sourceVolume * (1 + reserve / 100), 6);
  const recommendedMaxReserve = Math.max(
    0,
    spec.scenario_policy.recommended_max_reserve_percent ?? 10,
  );

  // Компоненты ручного замеса. Вода считается в totals для технической
  // справки, но в покупаемых материалах не выводится (берётся из водопровода).
  let cementKg = 0;
  let cementBags = 0;
  let sandM3 = 0;
  let gravelM3 = 0;
  let waterL = 0;

  if (manualMix) {
    cementKg = roundDisplay(totalVolume * proportions.cement_kg, 6);
    cementBags = Math.ceil(cementKg / spec.packaging_rules.cement_bag_kg);
    sandM3 = roundDisplay(totalVolume * proportions.sand_m3, 6);
    gravelM3 = roundDisplay(totalVolume * proportions.gravel_m3, 6);
    waterL = roundDisplay(totalVolume * proportions.water_l, 6);
  }

  // Package options for the main concrete volume
  const scenarioPurchaseStep = manualMix ? 0.001 : readyMixOrderStepM3;
  const packageOptions = [{
    size: scenarioPurchaseStep,
    label: manualMix
      ? "calculated-concrete-yield"
      : `ready-mix-step-${readyMixOrderStepM3}${spec.packaging_rules.unit}`,
    unit: spec.packaging_rules.unit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const scenarioReserve = scenario === "MIN"
      ? 0
      : scenario === "MAX"
        ? Math.max(reserve, recommendedMaxReserve)
        : reserve;
    const reserveMultiplier = 1 + scenarioReserve / 100;
    const exactNeed = roundDisplay(sourceVolume * reserveMultiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `grade:${proportions.grade}`,
        `manual_mix:${manualMix}`,
        `reserve_percent:${scenarioReserve}`,
        "scenario_policy:explicit_concrete_reserve",
        `mix_table_status:${spec.planning_mix.status}`,
        `packaging:${packaging.package.label}`,
      ],
      key_factors: {
        reserve_percent: roundDisplay(scenarioReserve, 3),
        field_multiplier: roundDisplay(reserveMultiplier, 6),
        ready_mix_order_step_m3: manualMix ? 0 : readyMixOrderStepM3,
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
  if (manualMix) {
    warnings.push(
      "Компоненты рассчитаны как предварительная закупочная оценка, а не рецепт: рабочий состав и воду подбирают по фактическим материалам и проверяют по ГОСТ 27006-2019",
    );
  }

  const recScenario = scenarios.REC;

  const practicalNotes: string[] = [
    "Класс прочности, морозостойкость F, водонепроницаемость W, подвижность и крупность заполнителя задают проектом и условиями бетонирования — калькулятор их не выбирает",
  ];
  if (manualMix) {
    practicalNotes.push(
      "Расчётный объём воды — только ориентир: учитывайте влажность песка и щебня и не добавляйте всю воду автоматически",
    );
  } else {
    practicalNotes.push(
      `Шаг заказа ${readyMixOrderStepM3} м³ выбран для планирования; подтвердите у поставщика минимальную партию, фактический шаг и остаток смеси в линии подачи`,
    );
  }

  const baseMaterials = buildMaterials(
    spec,
    gradeLabel,
    proportions,
    manualMix,
    sourceVolume,
    recScenario.exact_need,
    recScenario.buy_plan.package_size,
    recScenario.buy_plan.packages_count,
    cementBags,
    cementKg,
    sandM3,
    gravelM3,
  );

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: baseMaterials,
    totals: {
      sourceVolume: roundDisplay(sourceVolume, 3),
      totalVolume: roundDisplay(totalVolume, 3),
      inputMode: volume.inputMode,
      concreteGrade,
      manualMix,
      readyMixOrderStepM3,
      reserve: roundDisplay(reserve, 3),
      gradeIndex: concreteGrade,
      cementKgPerM3: proportions.cement_kg,
      sandM3PerM3: proportions.sand_m3,
      gravelM3PerM3: proportions.gravel_m3,
      waterLPerM3: proportions.water_l,
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
    practicalNotes,
    scenarios,
    accuracyMode,
    accuracyExplanation: {
      mode: accuracyMode,
      modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
      combinedMultiplier: 1,
      appliedModifiers: [],
      notes: ["Скрытые коэффициенты точности не применяются: запас бетона задаётся отдельным полем один раз"],
    },
  };
}
