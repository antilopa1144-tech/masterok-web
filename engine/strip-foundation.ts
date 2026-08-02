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
import { getInputDefault } from "./spec-helpers";

interface StripFoundationInputs {
  perimeter?: number;
  width?: number;
  depth?: number;
  aboveGround?: number;
  reinforcement?: number;
  deliveryMethod?: number;
  /** Необязательная высота щитов для интеграций с отдельным UI. Web по
   *  умолчанию считает опалубку только по aboveGround. */
  formworkHeight?: number;
  accuracyMode?: AccuracyMode;
}

function buildMaterials(
  vol: number,
  concreteExactNeed: number,
  concretePurchaseM3: number,
  longLen: number,
  longWeightKg: number,
  clampLen: number,
  clampWeightKg: number,
  wireKg: number,
  formwork: number,
  boards: number,
  rebarDiam: number,
  clampDiameterMm: number,
  standardRodLengthM: number,
): CanonicalMaterialResult[] {
  const longBars = Math.ceil(longLen / standardRodLengthM);
  const clampBars = Math.ceil(clampLen / standardRodLengthM);

  const materials: CanonicalMaterialResult[] = [
    {
      name: "Товарный бетон — класс по проекту",
      subtitle:
        "Чистый объём, расчётная потребность и заказ с шагом 0,1 м³ разделены; класс, подвижность, морозостойкость и водонепроницаемость задаёт проект",
      quantity: roundDisplay(vol, 3),
      unit: "м³",
      withReserve: roundDisplay(concreteExactNeed, 3),
      purchaseQty: concretePurchaseM3,
      category: "Основное",
    },
    {
      name: `Рифлёная продольная арматура ∅${rebarDiam} мм`,
      subtitle:
        `Нужно ${roundDisplay(longLen, 1)} пог. м — примерно ${longBars} прутков по ${standardRodLengthM} м; диаметр, класс и анкеровку задаёт проект`,
      quantity: roundDisplay(longWeightKg, 3),
      unit: "кг",
      withReserve: Math.ceil(longWeightKg),
      purchaseQty: Math.ceil(longWeightKg),
      category: "Армирование",
    },
    {
      name: `Хомуты ∅${clampDiameterMm} мм`,
      subtitle:
        `Нужно ${roundDisplay(clampLen, 1)} пог. м — примерно ${clampBars} прутков по ${standardRodLengthM} м; класс стали и шаг проверяют по проекту`,
      quantity: roundDisplay(clampWeightKg, 3),
      unit: "кг",
      withReserve: Math.ceil(clampWeightKg),
      purchaseQty: Math.ceil(clampWeightKg),
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
      subtitle: "Площадь двух сторон надземной части ленты; щиты в траншее этим значением не учитываются",
      quantity: roundDisplay(formwork, 3),
      unit: "м²",
      withReserve: roundDisplay(formwork, 3),
      purchaseQty: Math.ceil(formwork),
      category: "Опалубка",
    });
    materials.push({
      name: "Доска обрезная не менее 25×150×6000 мм",
      subtitle:
        "Для щитов опалубки; толщину доски, шаг стоек и раскосов проверяют по высоте ленты и давлению бетонной смеси",
      quantity: boards,
      unit: "шт",
      withReserve: boards,
      purchaseQty: boards,
      category: "Опалубка",
    });
  }

  return materials;
}

export function computeCanonicalStripFoundation(
  spec: StripFoundationCanonicalSpec,
  inputs: StripFoundationInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const accuracyMult = getPrimaryMultiplier("concrete", accuracyMode);

  const perimeter = Math.max(10, Math.min(200, inputs.perimeter ?? getInputDefault(spec, "perimeter", 40)));
  const width = Math.max(200, Math.min(600, inputs.width ?? getInputDefault(spec, "width", 400)));
  const depth = Math.max(300, Math.min(2000, inputs.depth ?? getInputDefault(spec, "depth", 700)));
  const aboveGround = Math.max(0, Math.min(600, inputs.aboveGround ?? getInputDefault(spec, "aboveGround", 300)));
  const reinforcement = Math.max(0, Math.min(3, Math.round(inputs.reinforcement ?? getInputDefault(spec, "reinforcement", 1))));
  const deliveryMethod = Math.max(0, Math.min(2, Math.round(inputs.deliveryMethod ?? getInputDefault(spec, "deliveryMethod", 0))));
  const formworkHeightMm = inputs.formworkHeight === undefined
    ? aboveGround
    : Math.max(0, Math.min(2000, inputs.formworkHeight));

  const rebarDiam = spec.material_rules.rebar_diameters[String(reinforcement)] ?? 12;
  const threads = spec.material_rules.rebar_threads[String(reinforcement)] ?? 4;
  const weightPerM = spec.material_rules.weight_per_m[String(rebarDiam)] ?? 0.888;

  const totalH = (depth + aboveGround) / 1000;
  const vol = roundDisplay(perimeter * (width / 1000) * totalH, 6);
  const deliveryLossM3 = spec.material_rules.delivery_loss_m3[String(deliveryMethod)] ?? 0;
  const baseOrderNeed = roundDisplay(vol + deliveryLossM3, 6);
  const accuracyAdjustedVolume = roundDisplay(vol * accuracyMult, 6);

  const longLen = roundDisplay(
    perimeter * threads * spec.material_rules.longitudinal_reserve_factor,
    6,
  );
  const longWeightKg = roundDisplay(longLen * weightPerM, 6);

  const clampCount = Math.ceil(perimeter / spec.material_rules.clamp_step_m);
  const clampWidth = Math.max(0, width / 1000 - 2 * spec.material_rules.concrete_cover_m);
  const clampHeight = Math.max(0, totalH - 2 * spec.material_rules.concrete_cover_m);
  const clampPerimeterM = 2 * (clampWidth + clampHeight) + spec.material_rules.clamp_hooks_m;
  const clampLen = roundDisplay(
    clampCount * clampPerimeterM * spec.material_rules.clamp_length_reserve,
    6,
  );
  const clampWeightKg = roundDisplay(
    clampLen * spec.material_rules.clamp_weight_kg_per_m,
    6,
  );

  const tieCount = clampCount * threads;
  const wireLengthM = roundDisplay(tieCount * spec.material_rules.wire_length_per_tie_m, 6);
  const wireKg = roundDisplay(wireLengthM * spec.material_rules.wire_weight_kg_per_m, 6);

  const formwork = roundDisplay(2 * perimeter * (formworkHeightMm / 1000), 6);
  const boardAreaM2 = spec.material_rules.formwork_board_width_m
    * spec.material_rules.formwork_board_length_m;
  const boards = formwork > 0
    ? Math.ceil(formwork * spec.material_rules.formwork_board_reserve / boardAreaM2)
    : 0;

  const packageOptions = [{
    size: spec.packaging_rules.volume_step_m3,
    label: `strip-foundation-${spec.packaging_rules.volume_step_m3}${spec.packaging_rules.unit}`,
    unit: spec.packaging_rules.unit,
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const scenarioNeed = accuracyAdjustedVolume * multiplier + deliveryLossM3;
    const exactNeed = roundDisplay(Math.max(baseOrderNeed, scenarioNeed), 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `reinforcement:${reinforcement}`,
        `deliveryMethod:${deliveryMethod}`,
        `delivery_loss_m3:${deliveryLossM3}`,
        `longitudinal_reserve_factor:${spec.material_rules.longitudinal_reserve_factor}`,
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

  const warnings: string[] = [
    "Калькулятор считает материалы по заданным размерам. Ширину, глубину, класс бетона и схему армирования определяют по нагрузкам и инженерно-геологическим данным участка.",
  ];
  if (depth <= spec.warnings_rules.shallow_depth_threshold_mm) {
    warnings.push(
      "Введено мелкое заглубление. Его допустимость нельзя определить только по региону: нужны грунты, уровень подземных вод, нагрузки, тепловой режим и расчёт деформаций.",
    );
  }

  const practicalNotes: string[] = [];
  if (deliveryLossM3 > 0) {
    practicalNotes.push(`Для бетононасоса отдельно добавлено ${roundDisplay(deliveryLossM3, 1)} м³ на заполнение и остаток в системе`);
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
      longLen,
      longWeightKg,
      clampLen,
      clampWeightKg,
      wireKg,
      formwork,
      boards,
      rebarDiam,
      spec.material_rules.clamp_diameter_mm,
      spec.material_rules.standard_rod_length_m,
    ),
    totals: {
      perimeter: roundDisplay(perimeter, 3),
      width: roundDisplay(width, 3),
      depth: roundDisplay(depth, 3),
      aboveGround: roundDisplay(aboveGround, 3),
      reinforcement: reinforcement,
      deliveryMethod: deliveryMethod,
      deliveryLossM3: roundDisplay(deliveryLossM3, 3),
      totalH: roundDisplay(totalH, 3),
      vol: roundDisplay(vol, 3),
      volReserve: roundDisplay(recScenario.exact_need, 3),
      rebarDiam: rebarDiam,
      threads: threads,
      longLen: roundDisplay(longLen, 3),
      longWeightKg: roundDisplay(longWeightKg, 3),
      clampCount: clampCount,
      clampLen: roundDisplay(clampLen, 3),
      clampWeightKg: roundDisplay(clampWeightKg, 3),
      tieCount: tieCount,
      wireLengthM: roundDisplay(wireLengthM, 3),
      wireKg: roundDisplay(wireKg, 3),
      formworkHeightMm: roundDisplay(formworkHeightMm, 3),
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
    accuracyExplanation: applyAccuracyMode(vol, "concrete", accuracyMode).explanation,
  };
}
