import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  StripFoundationCanonicalSpec,
} from "./canonical";
import { roundDisplay } from "./units";
import { ACCURACY_MODE_LABELS, type AccuracyMode, DEFAULT_ACCURACY_MODE } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface StripFoundationInputs {
  perimeter?: number;
  width?: number;
  depth?: number;
  aboveGround?: number;
  formworkHeight?: number;
  reserve?: number;
  readyMixOrderStepM3?: number;
  deliveryAllowanceM3?: number;
  reinforcement?: number;
  clampStepMm?: number;
  concreteCoverMm?: number;
  clampHookAllowanceMm?: number;
  rebarReserve?: number;
  rodLengthM?: number;
  formworkReserve?: number;
  accuracyMode?: AccuracyMode;
}

function buildMaterials(
  vol: number,
  concreteExactNeed: number,
  concretePurchaseM3: number,
  longExactLen: number,
  longPlanningLen: number,
  longPurchaseLen: number,
  longPurchaseWeightKg: number,
  longBars: number,
  clampExactLen: number,
  clampPlanningLen: number,
  clampPurchaseLen: number,
  clampPurchaseWeightKg: number,
  clampBars: number,
  wireKg: number,
  formwork: number,
  formworkWithReserve: number,
  boardsExact: number,
  boards: number,
  rebarDiam: number,
  clampDiameterMm: number,
  rodLengthM: number,
): CanonicalMaterialResult[] {
  const materials: CanonicalMaterialResult[] = [
    {
      name: "Товарный бетон — класс по проекту",
      subtitle:
        "Чистый объём, расчётная потребность и заказ с выбранным шагом разделены; класс, подвижность, морозостойкость и водонепроницаемость задаёт проект",
      quantity: roundDisplay(vol, 3),
      unit: "м³",
      withReserve: roundDisplay(concreteExactNeed, 3),
      purchaseQty: concretePurchaseM3,
      category: "Основное",
    },
    {
      name: `Рифлёная продольная арматура ∅${rebarDiam} мм`,
      subtitle:
        `К покупке ${longBars} прутков по ${rodLengthM} м, около ${roundDisplay(longPurchaseWeightKg, 1)} кг; диаметр, класс, стыки и анкеровку задаёт проект`,
      quantity: roundDisplay(longExactLen, 3),
      unit: "пог. м",
      withReserve: roundDisplay(longPlanningLen, 3),
      purchaseQty: roundDisplay(longPurchaseLen, 3),
      packageInfo: { count: longBars, size: rodLengthM, packageUnit: "прутков" },
      category: "Армирование",
    },
    {
      name: `Хомуты ∅${clampDiameterMm} мм`,
      subtitle:
        `К покупке ${clampBars} прутков по ${rodLengthM} м, около ${roundDisplay(clampPurchaseWeightKg, 1)} кг; диаметр, форма и шаг — из проекта`,
      quantity: roundDisplay(clampExactLen, 3),
      unit: "пог. м",
      withReserve: roundDisplay(clampPlanningLen, 3),
      purchaseQty: roundDisplay(clampPurchaseLen, 3),
      packageInfo: { count: clampBars, size: rodLengthM, packageUnit: "прутков" },
      category: "Армирование",
    },
    {
      name: "Проволока вязальная отожжённая ∅1,2 мм",
      subtitle: "Расчёт по числу пересечений, 0,3 м проволоки на одну вязку",
      quantity: roundDisplay(wireKg, 3),
      unit: "кг",
      withReserve: roundDisplay(wireKg, 3),
      purchaseQty: Math.ceil(wireKg),
      category: "Армирование",
    },
  ];

  if (formwork > 0) {
    materials.push({
      name: "Опалубка — щиты из обрезной доски",
      subtitle: "Площадь двух сторон по явно заданной высоте щитов",
      quantity: roundDisplay(formwork, 3),
      unit: "м²",
      withReserve: roundDisplay(formworkWithReserve, 3),
      purchaseQty: roundDisplay(formworkWithReserve, 3),
      category: "Опалубка",
    });
    materials.push({
      name: "Доска обрезная не менее 25×150×6000 мм",
      subtitle:
        "Для щитов опалубки; толщину доски, шаг стоек и раскосов проверяют по высоте ленты и давлению бетонной смеси",
      quantity: roundDisplay(boardsExact, 3),
      unit: "шт",
      withReserve: roundDisplay(boardsExact * (formwork > 0 ? formworkWithReserve / formwork : 1), 3),
      purchaseQty: boards,
      category: "Опалубка",
    });
  }

  return materials;
}

export function computeCanonicalStripFoundation(
  spec: StripFoundationCanonicalSpec,
  inputs: StripFoundationInputs,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  const perimeter = Math.max(10, Math.min(200, inputs.perimeter ?? getInputDefault(spec, "perimeter", 40)));
  const width = Math.max(200, Math.min(600, inputs.width ?? getInputDefault(spec, "width", 400)));
  const depth = Math.max(300, Math.min(2000, inputs.depth ?? getInputDefault(spec, "depth", 700)));
  const aboveGround = Math.max(0, Math.min(600, inputs.aboveGround ?? getInputDefault(spec, "aboveGround", 300)));
  const formworkHeightMm = Math.max(0, Math.min(2000, inputs.formworkHeight ?? getInputDefault(spec, "formworkHeight", 300)));
  const reserve = Math.max(0, Math.min(20, inputs.reserve ?? getInputDefault(spec, "reserve", 5)));
  const requestedOrderStep = inputs.readyMixOrderStepM3 ?? getInputDefault(spec, "readyMixOrderStepM3", 0.1);
  const readyMixOrderStepM3 = spec.packaging_rules.allowed_ready_mix_order_steps_m3.includes(requestedOrderStep)
    ? requestedOrderStep
    : spec.packaging_rules.allowed_ready_mix_order_steps_m3[0];
  const deliveryAllowanceM3 = Math.max(0, Math.min(5, inputs.deliveryAllowanceM3 ?? getInputDefault(spec, "deliveryAllowanceM3", 0)));
  const reinforcement = Math.max(0, Math.min(3, Math.round(inputs.reinforcement ?? getInputDefault(spec, "reinforcement", 1))));
  const clampStepM = Math.max(0.1, Math.min(1, (inputs.clampStepMm ?? getInputDefault(spec, "clampStepMm", 400)) / 1000));
  const concreteCoverM = Math.max(0.02, Math.min(0.1, (inputs.concreteCoverMm ?? getInputDefault(spec, "concreteCoverMm", 50)) / 1000));
  const clampHookAllowanceM = Math.max(0, Math.min(1, (inputs.clampHookAllowanceMm ?? getInputDefault(spec, "clampHookAllowanceMm", 300)) / 1000));
  const rebarReserve = Math.max(0, Math.min(30, inputs.rebarReserve ?? getInputDefault(spec, "rebarReserve", 12)));
  const requestedRodLength = inputs.rodLengthM ?? getInputDefault(spec, "rodLengthM", 11.7);
  const rodLengthM = spec.packaging_rules.allowed_rod_lengths_m.includes(requestedRodLength)
    ? requestedRodLength
    : spec.packaging_rules.allowed_rod_lengths_m[0];
  const formworkReserve = Math.max(0, Math.min(30, inputs.formworkReserve ?? getInputDefault(spec, "formworkReserve", 10)));

  const rebarDiam = spec.material_rules.rebar_diameters[String(reinforcement)] ?? 12;
  const threads = spec.material_rules.rebar_threads[String(reinforcement)] ?? 4;
  const weightPerM = spec.material_rules.weight_per_m[String(rebarDiam)] ?? 0.888;

  const totalH = (depth + aboveGround) / 1000;
  const vol = roundDisplay(perimeter * (width / 1000) * totalH, 6);
  const longExactLen = roundDisplay(perimeter * threads, 6);
  const longPlanningLen = roundDisplay(longExactLen * (1 + rebarReserve / 100), 6);
  const longBars = Math.ceil(longPlanningLen / rodLengthM);
  const longPurchaseLen = roundDisplay(longBars * rodLengthM, 6);
  const longWeightKg = roundDisplay(longExactLen * weightPerM, 6);
  const longPurchaseWeightKg = roundDisplay(longPurchaseLen * weightPerM, 6);

  const clampCount = Math.ceil(perimeter / clampStepM);
  const clampWidth = Math.max(0, width / 1000 - 2 * concreteCoverM);
  const clampHeight = Math.max(0, totalH - 2 * concreteCoverM);
  const clampPerimeterM = 2 * (clampWidth + clampHeight) + clampHookAllowanceM;
  const clampExactLen = roundDisplay(clampCount * clampPerimeterM, 6);
  const clampPlanningLen = roundDisplay(clampExactLen * (1 + rebarReserve / 100), 6);
  const clampBars = Math.ceil(clampPlanningLen / rodLengthM);
  const clampPurchaseLen = roundDisplay(clampBars * rodLengthM, 6);
  const clampWeightKg = roundDisplay(clampExactLen * spec.material_rules.clamp_weight_kg_per_m, 6);
  const clampPurchaseWeightKg = roundDisplay(clampPurchaseLen * spec.material_rules.clamp_weight_kg_per_m, 6);

  const tieCount = clampCount * threads;
  const wireLengthM = roundDisplay(tieCount * spec.material_rules.wire_length_per_tie_m, 6);
  const wireKg = roundDisplay(wireLengthM * spec.material_rules.wire_weight_kg_per_m, 6);

  const formwork = roundDisplay(2 * perimeter * (formworkHeightMm / 1000), 6);
  const formworkWithReserve = roundDisplay(formwork * (1 + formworkReserve / 100), 6);
  const boardAreaM2 = spec.material_rules.formwork_board_width_m
    * spec.material_rules.formwork_board_length_m;
  const boardsExact = formwork > 0 ? roundDisplay(formwork / boardAreaM2, 6) : 0;
  const boards = formwork > 0
    ? Math.ceil(formworkWithReserve / boardAreaM2)
    : 0;

  const packageOptions = [{
    size: readyMixOrderStepM3,
    label: `strip-foundation-${readyMixOrderStepM3}${spec.packaging_rules.unit}`,
    unit: spec.packaging_rules.unit,
  }];

  const recommendedMaxReserve = Math.max(0, spec.scenario_policy.recommended_max_reserve_percent ?? 10);

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const scenarioReserve = scenario === "MIN"
      ? 0
      : scenario === "MAX"
        ? Math.max(reserve, recommendedMaxReserve)
        : reserve;
    const reserveMultiplier = 1 + scenarioReserve / 100;
    const exactNeed = roundDisplay(vol * reserveMultiplier + deliveryAllowanceM3, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `reinforcement:${reinforcement}`,
        `reserve_percent:${scenarioReserve}`,
        `delivery_allowance_m3:${deliveryAllowanceM3}`,
        `rebar_reserve_percent:${rebarReserve}`,
        `rod_length_m:${rodLengthM}`,
        "scenario_policy:explicit_foundation_inputs",
        `packaging:${packaging.package.label}`,
      ],
      key_factors: {
        reserve_percent: roundDisplay(scenarioReserve, 3),
        field_multiplier: roundDisplay(reserveMultiplier, 6),
        ready_mix_order_step_m3: readyMixOrderStepM3,
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

  const warnings: string[] = [
    "Калькулятор считает материалы по заданным размерам. Ширину, глубину, класс бетона и схему армирования определяют по нагрузкам и инженерно-геологическим данным участка.",
  ];
  if (depth <= spec.warnings_rules.shallow_depth_threshold_mm) {
    warnings.push(
      "Введено мелкое заглубление. Его допустимость нельзя определить только по региону: нужны грунты, уровень подземных вод, нагрузки, тепловой режим и расчёт деформаций.",
    );
  }

  const practicalNotes: string[] = [];
  if (deliveryAllowanceM3 > 0) {
    practicalNotes.push(`По данным поставщика отдельно добавлено ${roundDisplay(deliveryAllowanceM3, 2)} м³ на линию подачи и технологический остаток`);
  }
  if (recScenario.purchase_quantity > spec.warnings_rules.large_order_threshold_m3) {
    practicalNotes.push(`К заказу ${roundDisplay(recScenario.purchase_quantity, 1)} м³ — заранее согласуйте подачу, подъезд и непрерывность бетонирования`);
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: buildMaterials(
      vol,
      recScenario.exact_need,
      recScenario.purchase_quantity,
      longExactLen,
      longPlanningLen,
      longPurchaseLen,
      longPurchaseWeightKg,
      longBars,
      clampExactLen,
      clampPlanningLen,
      clampPurchaseLen,
      clampPurchaseWeightKg,
      clampBars,
      wireKg,
      formwork,
      formworkWithReserve,
      boardsExact,
      boards,
      rebarDiam,
      spec.material_rules.clamp_diameter_mm,
      rodLengthM,
    ),
    totals: {
      perimeter: roundDisplay(perimeter, 3),
      width: roundDisplay(width, 3),
      depth: roundDisplay(depth, 3),
      aboveGround: roundDisplay(aboveGround, 3),
      reserve: roundDisplay(reserve, 3),
      readyMixOrderStepM3,
      reinforcement: reinforcement,
      deliveryAllowanceM3: roundDisplay(deliveryAllowanceM3, 3),
      totalH: roundDisplay(totalH, 3),
      vol: roundDisplay(vol, 3),
      volReserve: roundDisplay(recScenario.exact_need, 3),
      rebarDiam: rebarDiam,
      threads: threads,
      longExactLen: roundDisplay(longExactLen, 3),
      longLen: roundDisplay(longPlanningLen, 3),
      longPurchaseLen: roundDisplay(longPurchaseLen, 3),
      longBars,
      longWeightKg: roundDisplay(longWeightKg, 3),
      longPurchaseWeightKg: roundDisplay(longPurchaseWeightKg, 3),
      clampCount: clampCount,
      clampStepMm: roundDisplay(clampStepM * 1000, 3),
      concreteCoverMm: roundDisplay(concreteCoverM * 1000, 3),
      clampHookAllowanceMm: roundDisplay(clampHookAllowanceM * 1000, 3),
      clampExactLen: roundDisplay(clampExactLen, 3),
      clampLen: roundDisplay(clampPlanningLen, 3),
      clampPurchaseLen: roundDisplay(clampPurchaseLen, 3),
      clampBars,
      clampWeightKg: roundDisplay(clampWeightKg, 3),
      clampPurchaseWeightKg: roundDisplay(clampPurchaseWeightKg, 3),
      tieCount: tieCount,
      wireLengthM: roundDisplay(wireLengthM, 3),
      wireKg: roundDisplay(wireKg, 3),
      formworkHeightMm: roundDisplay(formworkHeightMm, 3),
      formwork: roundDisplay(formwork, 3),
      formworkWithReserve: roundDisplay(formworkWithReserve, 3),
      formworkReserve: roundDisplay(formworkReserve, 3),
      boards: boards,
      rodLengthM,
      rebarReserve: roundDisplay(rebarReserve, 3),
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
      notes: ["Скрытые коэффициенты точности не применяются: запасы бетона, арматуры и опалубки задаются отдельными полями один раз"],
    },
  };
}
