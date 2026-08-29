import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  FoundationSlabCanonicalSpec,
} from "./canonical";
import { roundDisplay } from "./units";
import {
  ACCURACY_MODE_LABELS,
  type AccuracyMode,
  DEFAULT_ACCURACY_MODE,
} from "./accuracy";
import { getInputDefault } from "./spec-helpers";
import type { FactorTable } from "./factors";

interface FoundationSlabInputs {
  length?: number;
  width?: number;
  thickness?: number;
  concreteReservePercent?: number;
  readyMixOrderStepM3?: number;
  deliveryAllowanceM3?: number;
  gridLayers?: number;
  rebarDiam?: number;
  rebarStep?: number;
  edgeCoverMm?: number;
  rebarReservePercent?: number;
  rodLengthM?: number;
  tieSharePercent?: number;
  wireLengthPerTieM?: number;
  wireReservePercent?: number;
  wirePackageKg?: number;
  formworkHeightMm?: number;
  formworkReservePercent?: number;
  sandLayerMm?: number;
  sandOrderExtraPercent?: number;
  gravelLayerMm?: number;
  gravelOrderExtraPercent?: number;
  aggregateOrderStepM3?: number;
  includeGeotextile?: number;
  geotextileReservePercent?: number;
  geotextileRollAreaM2?: number;
  insulationThickness?: number;
  insulationReservePercent?: number;
  eppsBoardAreaM2?: number;
  accuracyMode?: AccuracyMode;
}

interface RebarPlan {
  exactLengthM: number;
  planningLengthM: number;
  rods: number;
  purchaseLengthM: number;
  exactWeightKg: number;
  planningWeightKg: number;
  purchaseWeightKg: number;
}

function allowedValue(value: number, allowed: number[], fallback: number): number {
  return allowed.includes(value) ? value : fallback;
}

function roundUpToStep(value: number, step: number): number {
  if (value <= 0) return 0;
  return roundDisplay(Math.ceil(value / step) * step, 6);
}

function buildMaterials(params: {
  concreteExactM3: number;
  concretePlanningM3: number;
  concretePurchaseM3: number;
  rebarDiam: number;
  rebarPlan: RebarPlan;
  rodLengthM: number;
  gridLayers: number;
  wireExactKg: number;
  wirePlanningKg: number;
  wirePurchaseKg: number;
  wirePackages: number;
  wirePackageKg: number;
  tieSharePercent: number;
  wireLengthPerTieM: number;
  formworkExactM2: number;
  formworkPlanningM2: number;
  geotextileExactM2: number;
  geotextilePlanningM2: number;
  geotextilePurchaseM2: number;
  geotextileRolls: number;
  geotextileRollAreaM2: number;
  sandExactM3: number;
  sandPlanningM3: number;
  sandPurchaseM3: number;
  sandOrderExtraPercent: number;
  gravelExactM3: number;
  gravelPlanningM3: number;
  gravelPurchaseM3: number;
  gravelOrderExtraPercent: number;
  aggregateOrderStepM3: number;
  insulationThickness: number;
  eppsExactM2: number;
  eppsPlanningM2: number;
  eppsPurchaseM2: number;
  eppsBoards: number;
  eppsBoardAreaM2: number;
}): CanonicalMaterialResult[] {
  const materials: CanonicalMaterialResult[] = [
    {
      name: "Товарный бетон — класс по проекту",
      subtitle:
        "Чистый объём, явный запас и заказ с выбранным шагом разделены; класс, подвижность, морозостойкость и водонепроницаемость задаёт проект",
      quantity: roundDisplay(params.concreteExactM3, 3),
      unit: "м³",
      withReserve: roundDisplay(params.concretePlanningM3, 3),
      purchaseQty: roundDisplay(params.concretePurchaseM3, 3),
      category: "Основное",
    },
    {
      name: `Арматура сеток ∅${params.rebarDiam} мм — класс по проекту`,
      subtitle:
        `${params.gridLayers} слой(я): к покупке ${params.rebarPlan.rods} прутков по ${params.rodLengthM} м, около ${roundDisplay(params.rebarPlan.purchaseWeightKg, 1)} кг; точная масса ${roundDisplay(params.rebarPlan.exactWeightKg, 1)} кг`,
      quantity: roundDisplay(params.rebarPlan.exactLengthM, 3),
      unit: "пог. м",
      withReserve: roundDisplay(params.rebarPlan.planningLengthM, 3),
      purchaseQty: roundDisplay(params.rebarPlan.purchaseLengthM, 3),
      packageInfo: {
        count: params.rebarPlan.rods,
        size: params.rodLengthM,
        packageUnit: "прутков",
      },
      category: "Армирование",
    },
  ];

  if (params.wireExactKg > 0) {
    materials.push({
      name: "Проволока вязальная отожжённая ∅1,2 мм",
      subtitle:
        `${roundDisplay(params.tieSharePercent, 0)}% пересечений × ${roundDisplay(params.wireLengthPerTieM, 2)} м на вязку; к покупке ${params.wirePackages} уп. по ${params.wirePackageKg} кг`,
      quantity: roundDisplay(params.wireExactKg, 3),
      unit: "кг",
      withReserve: roundDisplay(params.wirePlanningKg, 3),
      purchaseQty: roundDisplay(params.wirePurchaseKg, 3),
      packageInfo: {
        count: params.wirePackages,
        size: params.wirePackageKg,
        packageUnit: "упаковок",
      },
      category: "Армирование",
    });
  }

  if (params.formworkExactM2 > 0) {
    materials.push({
      name: "Опалубка — площадь щитов к подготовке",
      subtitle:
        "Площадь внешнего периметра по указанной высоте; материал щитов, толщину, стойки и раскосы подбирают отдельно",
      quantity: roundDisplay(params.formworkExactM2, 3),
      unit: "м²",
      withReserve: roundDisplay(params.formworkPlanningM2, 3),
      purchaseQty: roundDisplay(params.formworkPlanningM2, 3),
      category: "Опалубка",
    });
  }

  if (params.geotextileExactM2 > 0) {
    materials.push({
      name: "Геотекстиль — тип и плотность по проекту",
      subtitle:
        `Явный запас на раскладку; к покупке ${params.geotextileRolls} рул. по ${roundDisplay(params.geotextileRollAreaM2, 1)} м²`,
      quantity: roundDisplay(params.geotextileExactM2, 3),
      unit: "м²",
      withReserve: roundDisplay(params.geotextilePlanningM2, 3),
      purchaseQty: roundDisplay(params.geotextilePurchaseM2, 3),
      packageInfo: {
        count: params.geotextileRolls,
        size: params.geotextileRollAreaM2,
        packageUnit: "рулонов",
      },
      category: "Подготовка",
    });
  }

  if (params.gravelExactM3 > 0) {
    materials.push({
      name: "Щебень для проектного слоя подготовки",
      subtitle:
        `Чистый объём слоя после уплотнения; надбавка к заказу ${roundDisplay(params.gravelOrderExtraPercent, 0)}%, шаг ${params.aggregateOrderStepM3} м³`,
      quantity: roundDisplay(params.gravelExactM3, 3),
      unit: "м³",
      withReserve: roundDisplay(params.gravelPlanningM3, 3),
      purchaseQty: roundDisplay(params.gravelPurchaseM3, 3),
      category: "Подготовка",
    });
  }

  if (params.sandExactM3 > 0) {
    materials.push({
      name: "Песок для проектного слоя подготовки",
      subtitle:
        `Чистый объём слоя после уплотнения; надбавка к заказу ${roundDisplay(params.sandOrderExtraPercent, 0)}%, шаг ${params.aggregateOrderStepM3} м³`,
      quantity: roundDisplay(params.sandExactM3, 3),
      unit: "м³",
      withReserve: roundDisplay(params.sandPlanningM3, 3),
      purchaseQty: roundDisplay(params.sandPurchaseM3, 3),
      category: "Подготовка",
    });
  }

  if (params.insulationThickness > 0) {
    materials.push({
      name: `ЭППС под плитой ${params.insulationThickness} мм — марка по проекту`,
      subtitle:
        `К покупке ${params.eppsBoards} плит с введённой площадью ${roundDisplay(params.eppsBoardAreaM2, 2)} м² каждая; прочность и схема укладки задаются проектом`,
      quantity: roundDisplay(params.eppsExactM2, 3),
      unit: "м²",
      withReserve: roundDisplay(params.eppsPlanningM2, 3),
      purchaseQty: roundDisplay(params.eppsPurchaseM2, 3),
      packageInfo: {
        count: params.eppsBoards,
        size: params.eppsBoardAreaM2,
        packageUnit: "плит",
      },
      category: "Утепление",
    });
  }

  return materials;
}

export function computeCanonicalFoundationSlab(
  spec: FoundationSlabCanonicalSpec,
  inputs: FoundationSlabInputs,
  _factorTable?: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const length = Math.max(1, Math.min(50, inputs.length ?? getInputDefault(spec, "length", 10)));
  const width = Math.max(1, Math.min(50, inputs.width ?? getInputDefault(spec, "width", 6)));
  const thickness = Math.max(100, Math.min(500, inputs.thickness ?? getInputDefault(spec, "thickness", 200)));
  const concreteReservePercent = Math.max(0, Math.min(
    20,
    inputs.concreteReservePercent ?? getInputDefault(spec, "concreteReservePercent", 5),
  ));
  const requestedReadyMixStep = inputs.readyMixOrderStepM3
    ?? getInputDefault(spec, "readyMixOrderStepM3", 0.1);
  const readyMixOrderStepM3 = allowedValue(
    requestedReadyMixStep,
    spec.packaging_rules.allowed_ready_mix_order_steps_m3,
    0.1,
  );
  const deliveryAllowanceM3 = Math.max(0, Math.min(
    5,
    inputs.deliveryAllowanceM3 ?? getInputDefault(spec, "deliveryAllowanceM3", 0),
  ));
  const gridLayers = Math.max(1, Math.min(
    2,
    Math.round(inputs.gridLayers ?? getInputDefault(spec, "gridLayers", 2)),
  ));
  const rebarDiam = allowedValue(
    Math.round(inputs.rebarDiam ?? getInputDefault(spec, "rebarDiam", 12)),
    spec.material_rules.allowed_rebar_diameters_mm,
    12,
  );
  const rebarStep = Math.max(100, Math.min(
    500,
    inputs.rebarStep ?? getInputDefault(spec, "rebarStep", 200),
  ));
  const edgeCoverMm = Math.max(0, Math.min(
    150,
    inputs.edgeCoverMm ?? getInputDefault(spec, "edgeCoverMm", 50),
  ));
  const rebarReservePercent = Math.max(0, Math.min(
    30,
    inputs.rebarReservePercent ?? getInputDefault(spec, "rebarReservePercent", 10),
  ));
  const rodLengthM = allowedValue(
    inputs.rodLengthM ?? getInputDefault(spec, "rodLengthM", 11.7),
    spec.packaging_rules.allowed_rod_lengths_m,
    11.7,
  );
  const tieSharePercent = Math.max(0, Math.min(
    100,
    inputs.tieSharePercent ?? getInputDefault(spec, "tieSharePercent", 100),
  ));
  const wireLengthPerTieM = Math.max(0.1, Math.min(
    1,
    inputs.wireLengthPerTieM ?? getInputDefault(spec, "wireLengthPerTieM", 0.3),
  ));
  const wireReservePercent = Math.max(0, Math.min(
    50,
    inputs.wireReservePercent ?? getInputDefault(spec, "wireReservePercent", 10),
  ));
  const wirePackageKg = allowedValue(
    inputs.wirePackageKg ?? getInputDefault(spec, "wirePackageKg", 1),
    spec.packaging_rules.allowed_wire_packages_kg,
    1,
  );
  const formworkHeightMm = Math.max(0, Math.min(
    1000,
    inputs.formworkHeightMm ?? getInputDefault(spec, "formworkHeightMm", 200),
  ));
  const formworkReservePercent = Math.max(0, Math.min(
    30,
    inputs.formworkReservePercent ?? getInputDefault(spec, "formworkReservePercent", 10),
  ));
  const sandLayerMm = Math.max(0, Math.min(
    500,
    inputs.sandLayerMm ?? getInputDefault(spec, "sandLayerMm", 100),
  ));
  const sandOrderExtraPercent = Math.max(0, Math.min(
    50,
    inputs.sandOrderExtraPercent ?? getInputDefault(spec, "sandOrderExtraPercent", 0),
  ));
  const gravelLayerMm = Math.max(0, Math.min(
    500,
    inputs.gravelLayerMm ?? getInputDefault(spec, "gravelLayerMm", 150),
  ));
  const gravelOrderExtraPercent = Math.max(0, Math.min(
    50,
    inputs.gravelOrderExtraPercent ?? getInputDefault(spec, "gravelOrderExtraPercent", 0),
  ));
  const aggregateOrderStepM3 = allowedValue(
    inputs.aggregateOrderStepM3 ?? getInputDefault(spec, "aggregateOrderStepM3", 0.1),
    spec.packaging_rules.allowed_aggregate_order_steps_m3,
    0.1,
  );
  const includeGeotextile = Math.round(
    inputs.includeGeotextile ?? getInputDefault(spec, "includeGeotextile", 1),
  ) === 1;
  const geotextileReservePercent = Math.max(0, Math.min(
    50,
    inputs.geotextileReservePercent ?? getInputDefault(spec, "geotextileReservePercent", 20),
  ));
  const geotextileRollAreaM2 = Math.max(10, Math.min(
    500,
    inputs.geotextileRollAreaM2 ?? getInputDefault(spec, "geotextileRollAreaM2", 50),
  ));
  const insulationThickness = Math.max(0, Math.min(
    200,
    inputs.insulationThickness ?? getInputDefault(spec, "insulationThickness", 0),
  ));
  const insulationReservePercent = Math.max(0, Math.min(
    30,
    inputs.insulationReservePercent ?? getInputDefault(spec, "insulationReservePercent", 5),
  ));
  const eppsBoardAreaM2 = Math.max(0.2, Math.min(
    3,
    inputs.eppsBoardAreaM2 ?? getInputDefault(spec, "eppsBoardAreaM2", 0.72),
  ));

  const area = roundDisplay(length * width, 6);
  const perimeter = roundDisplay(2 * (length + width), 6);
  const concreteExactM3 = roundDisplay(area * thickness / 1000, 6);
  const concretePackageOptions = [{
    size: readyMixOrderStepM3,
    label: `foundation-slab-${readyMixOrderStepM3}${spec.packaging_rules.unit}`,
    unit: spec.packaging_rules.unit,
  }];
  const maxReserveFloor = Math.max(0, spec.scenario_policy.max_reserve_floor_percent ?? 10);
  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const reservePercent = scenario === "MIN"
      ? 0
      : scenario === "MAX"
        ? Math.max(concreteReservePercent, maxReserveFloor)
        : concreteReservePercent;
    const exactNeed = roundDisplay(
      concreteExactM3 * (1 + reservePercent / 100) + deliveryAllowanceM3,
      6,
    );
    const packaging = optimizePackaging(exactNeed, concretePackageOptions);
    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `reserve_percent:${reservePercent}`,
        `delivery_allowance_m3:${deliveryAllowanceM3}`,
        `grid_layers:${gridLayers}`,
        `rebar_diameter_mm:${rebarDiam}`,
        `rebar_step_mm:${rebarStep}`,
        `packaging:${packaging.package.label}`,
      ],
      key_factors: {
        reserve_percent: reservePercent,
        field_multiplier: roundDisplay(1 + reservePercent / 100, 6),
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

  const clearLengthM = Math.max(0, length - 2 * edgeCoverMm / 1000);
  const clearWidthM = Math.max(0, width - 2 * edgeCoverMm / 1000);
  const rebarStepM = rebarStep / 1000;
  const barsAlongLength = Math.ceil(clearWidthM / rebarStepM) + 1;
  const barsAlongWidth = Math.ceil(clearLengthM / rebarStepM) + 1;
  const exactRebarLengthM = roundDisplay(
    gridLayers * (barsAlongLength * clearLengthM + barsAlongWidth * clearWidthM),
    6,
  );
  const planningRebarLengthM = roundDisplay(
    exactRebarLengthM * (1 + rebarReservePercent / 100),
    6,
  );
  const rebarRods = Math.ceil(planningRebarLengthM / rodLengthM);
  const purchaseRebarLengthM = roundDisplay(rebarRods * rodLengthM, 6);
  const weightPerMeter = spec.material_rules.weight_per_meter[String(rebarDiam)] ?? 0.888;
  const rebarPlan: RebarPlan = {
    exactLengthM: exactRebarLengthM,
    planningLengthM: planningRebarLengthM,
    rods: rebarRods,
    purchaseLengthM: purchaseRebarLengthM,
    exactWeightKg: roundDisplay(exactRebarLengthM * weightPerMeter, 6),
    planningWeightKg: roundDisplay(planningRebarLengthM * weightPerMeter, 6),
    purchaseWeightKg: roundDisplay(purchaseRebarLengthM * weightPerMeter, 6),
  };

  const intersections = barsAlongLength * barsAlongWidth * gridLayers;
  const tieCount = Math.ceil(intersections * tieSharePercent / 100);
  const wireExactLengthM = roundDisplay(tieCount * wireLengthPerTieM, 6);
  const wireExactKg = roundDisplay(
    wireExactLengthM * spec.material_rules.wire_mass_per_meter_kg,
    6,
  );
  const wirePlanningKg = roundDisplay(wireExactKg * (1 + wireReservePercent / 100), 6);
  const wirePackages = wirePlanningKg > 0 ? Math.ceil(wirePlanningKg / wirePackageKg) : 0;
  const wirePurchaseKg = roundDisplay(wirePackages * wirePackageKg, 6);

  const formworkExactM2 = roundDisplay(perimeter * formworkHeightMm / 1000, 6);
  const formworkPlanningM2 = roundDisplay(
    formworkExactM2 * (1 + formworkReservePercent / 100),
    6,
  );
  const geotextileExactM2 = includeGeotextile ? area : 0;
  const geotextilePlanningM2 = roundDisplay(
    geotextileExactM2 * (1 + geotextileReservePercent / 100),
    6,
  );
  const geotextileRolls = geotextilePlanningM2 > 0
    ? Math.ceil(geotextilePlanningM2 / geotextileRollAreaM2)
    : 0;
  const geotextilePurchaseM2 = roundDisplay(geotextileRolls * geotextileRollAreaM2, 6);

  const sandExactM3 = roundDisplay(area * sandLayerMm / 1000, 6);
  const sandPlanningM3 = roundDisplay(
    sandExactM3 * (1 + sandOrderExtraPercent / 100),
    6,
  );
  const sandPurchaseM3 = roundUpToStep(sandPlanningM3, aggregateOrderStepM3);
  const gravelExactM3 = roundDisplay(area * gravelLayerMm / 1000, 6);
  const gravelPlanningM3 = roundDisplay(
    gravelExactM3 * (1 + gravelOrderExtraPercent / 100),
    6,
  );
  const gravelPurchaseM3 = roundUpToStep(gravelPlanningM3, aggregateOrderStepM3);

  const eppsExactM2 = insulationThickness > 0 ? area : 0;
  const eppsPlanningM2 = roundDisplay(
    eppsExactM2 * (1 + insulationReservePercent / 100),
    6,
  );
  const eppsBoards = eppsPlanningM2 > 0 ? Math.ceil(eppsPlanningM2 / eppsBoardAreaM2) : 0;
  const eppsPurchaseM2 = roundDisplay(eppsBoards * eppsBoardAreaM2, 6);

  const recScenario = scenarios.REC;
  const warnings = [
    "Калькулятор считает материалы по готовым размерам и проектной схеме. Он не выбирает тип фундамента, толщину плиты, бетон, армирование или состав подготовки.",
  ];
  if (thickness <= spec.warnings_rules.thin_slab_threshold_mm) {
    warnings.push(
      "Введена небольшая толщина плиты. Её допустимость подтверждает конструктор по нагрузкам, грунтам и расчётной схеме.",
    );
  }
  if (area > spec.warnings_rules.large_area_threshold_m2) {
    warnings.push(
      "Большая площадь плиты: проверьте проектные швы, непрерывность бетонирования, подачу смеси и рабочую документацию.",
    );
  }
  const practicalNotes = [
    "Нахлёсты, анкеровку, выпуски, П-образные элементы, локальные усиления и карту раскроя учитывают по рабочим чертежам и явному запасу.",
    "Толщины песка и щебня относятся к слою после уплотнения; надбавку к заказу задайте по данным поставщика и принятой технологии.",
  ];
  if (deliveryAllowanceM3 > 0) {
    practicalNotes.push(
      `По данным поставщика отдельно добавлено ${roundDisplay(deliveryAllowanceM3, 2)} м³ на линию подачи и технологический остаток`,
    );
  }
  if (recScenario.purchase_quantity > spec.warnings_rules.large_order_threshold_m3) {
    practicalNotes.push(
      `К заказу ${roundDisplay(recScenario.purchase_quantity, 1)} м³ — заранее согласуйте число машин, интервалы, подъезд и способ подачи`,
    );
  }

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: buildMaterials({
      concreteExactM3,
      concretePlanningM3: recScenario.exact_need,
      concretePurchaseM3: recScenario.purchase_quantity,
      rebarDiam,
      rebarPlan,
      rodLengthM,
      gridLayers,
      wireExactKg,
      wirePlanningKg,
      wirePurchaseKg,
      wirePackages,
      wirePackageKg,
      tieSharePercent,
      wireLengthPerTieM,
      formworkExactM2,
      formworkPlanningM2,
      geotextileExactM2,
      geotextilePlanningM2,
      geotextilePurchaseM2,
      geotextileRolls,
      geotextileRollAreaM2,
      sandExactM3,
      sandPlanningM3,
      sandPurchaseM3,
      sandOrderExtraPercent,
      gravelExactM3,
      gravelPlanningM3,
      gravelPurchaseM3,
      gravelOrderExtraPercent,
      aggregateOrderStepM3,
      insulationThickness,
      eppsExactM2,
      eppsPlanningM2,
      eppsPurchaseM2,
      eppsBoards,
      eppsBoardAreaM2,
    }),
    totals: {
      area: roundDisplay(area, 3),
      length: roundDisplay(length, 3),
      width: roundDisplay(width, 3),
      perimeter: roundDisplay(perimeter, 3),
      thickness: roundDisplay(thickness, 3),
      concreteM3: roundDisplay(concreteExactM3, 3),
      concreteReservePercent: roundDisplay(concreteReservePercent, 3),
      readyMixOrderStepM3,
      deliveryAllowanceM3: roundDisplay(deliveryAllowanceM3, 3),
      gridLayers,
      rebarDiam,
      rebarStep: roundDisplay(rebarStep, 3),
      edgeCoverMm: roundDisplay(edgeCoverMm, 3),
      barsAlongLength,
      barsAlongWidth,
      intersections,
      tieCount,
      rebarReservePercent: roundDisplay(rebarReservePercent, 3),
      rodLengthM,
      totalBarLen: roundDisplay(rebarPlan.exactLengthM, 3),
      rebarPlanningLengthM: roundDisplay(rebarPlan.planningLengthM, 3),
      rebarPurchaseLengthM: roundDisplay(rebarPlan.purchaseLengthM, 3),
      rebarRods: rebarPlan.rods,
      rebarKg: roundDisplay(rebarPlan.exactWeightKg, 3),
      rebarPlanningKg: roundDisplay(rebarPlan.planningWeightKg, 3),
      rebarPurchaseKg: roundDisplay(rebarPlan.purchaseWeightKg, 3),
      tieSharePercent: roundDisplay(tieSharePercent, 3),
      wireLengthPerTieM: roundDisplay(wireLengthPerTieM, 3),
      wireExactLengthM: roundDisplay(wireExactLengthM, 3),
      wireKg: roundDisplay(wireExactKg, 3),
      wirePlanningKg: roundDisplay(wirePlanningKg, 3),
      wirePurchaseKg: roundDisplay(wirePurchaseKg, 3),
      wirePackages,
      wirePackageKg,
      formworkHeightMm: roundDisplay(formworkHeightMm, 3),
      formworkArea: roundDisplay(formworkExactM2, 3),
      formworkPlanningArea: roundDisplay(formworkPlanningM2, 3),
      formworkReservePercent: roundDisplay(formworkReservePercent, 3),
      includeGeotextile: includeGeotextile ? 1 : 0,
      geotextile: roundDisplay(geotextileExactM2, 3),
      geotextilePlanningM2: roundDisplay(geotextilePlanningM2, 3),
      geotextilePurchaseM2: roundDisplay(geotextilePurchaseM2, 3),
      geotextileRolls,
      geotextileReservePercent: roundDisplay(geotextileReservePercent, 3),
      geotextileRollAreaM2: roundDisplay(geotextileRollAreaM2, 3),
      sandLayerMm: roundDisplay(sandLayerMm, 3),
      sand: roundDisplay(sandExactM3, 3),
      sandPlanningM3: roundDisplay(sandPlanningM3, 3),
      sandPurchaseM3: roundDisplay(sandPurchaseM3, 3),
      sandOrderExtraPercent: roundDisplay(sandOrderExtraPercent, 3),
      gravelLayerMm: roundDisplay(gravelLayerMm, 3),
      gravel: roundDisplay(gravelExactM3, 3),
      gravelPlanningM3: roundDisplay(gravelPlanningM3, 3),
      gravelPurchaseM3: roundDisplay(gravelPurchaseM3, 3),
      gravelOrderExtraPercent: roundDisplay(gravelOrderExtraPercent, 3),
      aggregateOrderStepM3,
      insulationThickness: roundDisplay(insulationThickness, 3),
      insulationReservePercent: roundDisplay(insulationReservePercent, 3),
      eppsBoardAreaM2: roundDisplay(eppsBoardAreaM2, 3),
      eppsPlates: eppsBoards,
      eppsPurchaseM2: roundDisplay(eppsPurchaseM2, 3),
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
      notes: [
        "Скрытые коэффициенты точности не применяются: бетон, армирование, подготовка и упаковки настраиваются отдельными полями",
      ],
    },
  };
}
