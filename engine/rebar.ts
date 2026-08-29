import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  RebarCanonicalSpec,
} from "./canonical";
import { roundDisplay } from "./units";
import { ACCURACY_MODE_LABELS, type AccuracyMode, DEFAULT_ACCURACY_MODE } from "./accuracy";
import { getInputDefault } from "./spec-helpers";

interface RebarInputs {
  structureType?: number;
  length?: number;
  width?: number;
  gridLayers?: number;
  gridStepMm?: number;
  edgeCoverMm?: number;
  frameLengthM?: number;
  longitudinalBars?: number;
  stirrupWidthMm?: number;
  stirrupHeightMm?: number;
  stirrupStepMm?: number;
  stirrupDiameterMm?: number;
  stirrupHookAllowanceMm?: number;
  mainDiameter?: number;
  reservePercent?: number;
  rodLengthM?: number;
  tieSharePercent?: number;
  wireLengthPerTieM?: number;
  wireReservePercent?: number;
  wirePackageKg?: number;
  accuracyMode?: AccuracyMode;
}

interface RebarGeometry {
  mainExactLengthM: number;
  secondaryExactLengthM: number;
  intersections: number;
  barsAlongLength: number;
  barsAlongWidth: number;
  stirrupCount: number;
  stirrupPieceLengthM: number;
}

interface ScenarioPlan {
  reservePercent: number;
  mainPlanningLengthM: number;
  mainRods: number;
  mainPurchaseLengthM: number;
  secondaryPlanningLengthM: number;
  secondaryRods: number;
  secondaryPurchaseLengthM: number;
  totalPlanningLengthM: number;
  totalPurchaseLengthM: number;
}

function allowedValue(value: number, allowed: number[], fallback: number): number {
  return allowed.includes(value) ? value : fallback;
}

function buildScenarioPlan(
  geometry: RebarGeometry,
  reservePercent: number,
  rodLengthM: number,
): ScenarioPlan {
  const multiplier = 1 + reservePercent / 100;
  const mainPlanningLengthM = roundDisplay(geometry.mainExactLengthM * multiplier, 6);
  const mainRods = Math.ceil(mainPlanningLengthM / rodLengthM);
  const mainPurchaseLengthM = roundDisplay(mainRods * rodLengthM, 6);
  const secondaryPlanningLengthM = roundDisplay(
    geometry.secondaryExactLengthM * multiplier,
    6,
  );
  const secondaryRods = secondaryPlanningLengthM > 0
    ? Math.ceil(secondaryPlanningLengthM / rodLengthM)
    : 0;
  const secondaryPurchaseLengthM = roundDisplay(secondaryRods * rodLengthM, 6);

  return {
    reservePercent,
    mainPlanningLengthM,
    mainRods,
    mainPurchaseLengthM,
    secondaryPlanningLengthM,
    secondaryRods,
    secondaryPurchaseLengthM,
    totalPlanningLengthM: roundDisplay(mainPlanningLengthM + secondaryPlanningLengthM, 6),
    totalPurchaseLengthM: roundDisplay(mainPurchaseLengthM + secondaryPurchaseLengthM, 6),
  };
}

function buildMaterials(
  structureType: number,
  mainDiameter: number,
  stirrupDiameterMm: number,
  geometry: RebarGeometry,
  recPlan: ScenarioPlan,
  rodLengthM: number,
  weightPerMainM: number,
  weightPerSecondaryM: number,
  wireExactKg: number,
  wirePlanningKg: number,
  wirePurchaseKg: number,
  wirePackages: number,
  wirePackageKg: number,
  tieSharePercent: number,
  wireLengthPerTieM: number,
): CanonicalMaterialResult[] {
  const mainExactWeightKg = geometry.mainExactLengthM * weightPerMainM;
  const mainPurchaseWeightKg = recPlan.mainPurchaseLengthM * weightPerMainM;
  const materials: CanonicalMaterialResult[] = [
    {
      name: structureType === 0
        ? `Арматура сетки ∅${mainDiameter} мм — класс по проекту`
        : `Продольная арматура ∅${mainDiameter} мм — класс по проекту`,
      subtitle:
        `К покупке ${recPlan.mainRods} прутков по ${rodLengthM} м, около ${roundDisplay(mainPurchaseWeightKg, 1)} кг; точная масса ${roundDisplay(mainExactWeightKg, 1)} кг`,
      quantity: roundDisplay(geometry.mainExactLengthM, 3),
      unit: "пог. м",
      withReserve: roundDisplay(recPlan.mainPlanningLengthM, 3),
      purchaseQty: roundDisplay(recPlan.mainPurchaseLengthM, 3),
      packageInfo: { count: recPlan.mainRods, size: rodLengthM, packageUnit: "прутков" },
      category: "Арматура",
    },
  ];

  if (geometry.secondaryExactLengthM > 0) {
    const exactWeightKg = geometry.secondaryExactLengthM * weightPerSecondaryM;
    const purchaseWeightKg = recPlan.secondaryPurchaseLengthM * weightPerSecondaryM;
    materials.push({
      name: `Хомуты ∅${stirrupDiameterMm} мм — класс и форма по проекту`,
      subtitle:
        `К покупке ${recPlan.secondaryRods} прутков по ${rodLengthM} м, около ${roundDisplay(purchaseWeightKg, 1)} кг; точная масса ${roundDisplay(exactWeightKg, 1)} кг`,
      quantity: roundDisplay(geometry.secondaryExactLengthM, 3),
      unit: "пог. м",
      withReserve: roundDisplay(recPlan.secondaryPlanningLengthM, 3),
      purchaseQty: roundDisplay(recPlan.secondaryPurchaseLengthM, 3),
      packageInfo: { count: recPlan.secondaryRods, size: rodLengthM, packageUnit: "прутков" },
      category: "Арматура",
    });
  }

  if (wireExactKg > 0) {
    materials.push({
      name: "Проволока вязальная отожжённая ∅1,2 мм",
      subtitle:
        `${roundDisplay(tieSharePercent, 0)}% узлов × ${roundDisplay(wireLengthPerTieM, 2)} м на вязку; к покупке ${wirePackages} уп. по ${wirePackageKg} кг`,
      quantity: roundDisplay(wireExactKg, 3),
      unit: "кг",
      withReserve: roundDisplay(wirePlanningKg, 3),
      purchaseQty: roundDisplay(wirePurchaseKg, 3),
      packageInfo: { count: wirePackages, size: wirePackageKg, packageUnit: "упаковок" },
      category: "Расходные материалы",
    });
  }

  return materials;
}

export function computeCanonicalRebar(
  spec: RebarCanonicalSpec,
  inputs: RebarInputs,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const structureType = Math.max(
    0,
    Math.min(1, Math.round(inputs.structureType ?? getInputDefault(spec, "structureType", 0))),
  );
  const length = Math.max(1, Math.min(50, inputs.length ?? getInputDefault(spec, "length", 10)));
  const width = Math.max(1, Math.min(50, inputs.width ?? getInputDefault(spec, "width", 8)));
  const gridLayers = Math.max(
    1,
    Math.min(2, Math.round(inputs.gridLayers ?? getInputDefault(spec, "gridLayers", 2))),
  );
  const gridStepMm = Math.max(
    100,
    Math.min(500, inputs.gridStepMm ?? getInputDefault(spec, "gridStepMm", 200)),
  );
  const edgeCoverMm = Math.max(
    0,
    Math.min(150, inputs.edgeCoverMm ?? getInputDefault(spec, "edgeCoverMm", 50)),
  );
  const frameLengthM = Math.max(
    1,
    Math.min(500, inputs.frameLengthM ?? getInputDefault(spec, "frameLengthM", 36)),
  );
  const longitudinalBars = Math.max(
    2,
    Math.min(16, Math.round(inputs.longitudinalBars ?? getInputDefault(spec, "longitudinalBars", 4))),
  );
  const stirrupWidthMm = Math.max(
    100,
    Math.min(2000, inputs.stirrupWidthMm ?? getInputDefault(spec, "stirrupWidthMm", 300)),
  );
  const stirrupHeightMm = Math.max(
    100,
    Math.min(3000, inputs.stirrupHeightMm ?? getInputDefault(spec, "stirrupHeightMm", 300)),
  );
  const stirrupStepMm = Math.max(
    100,
    Math.min(1000, inputs.stirrupStepMm ?? getInputDefault(spec, "stirrupStepMm", 400)),
  );
  const stirrupHookAllowanceMm = Math.max(
    0,
    Math.min(1500, inputs.stirrupHookAllowanceMm ?? getInputDefault(spec, "stirrupHookAllowanceMm", 300)),
  );
  const mainDiameter = allowedValue(
    Math.round(inputs.mainDiameter ?? getInputDefault(spec, "mainDiameter", 12)),
    spec.material_rules.allowed_diameters_mm,
    12,
  );
  const stirrupDiameterMm = allowedValue(
    Math.round(inputs.stirrupDiameterMm ?? getInputDefault(spec, "stirrupDiameterMm", 8)),
    spec.material_rules.allowed_stirrup_diameters_mm,
    8,
  );
  const reservePercent = Math.max(
    0,
    Math.min(30, inputs.reservePercent ?? getInputDefault(spec, "reservePercent", 10)),
  );
  const requestedRodLength = inputs.rodLengthM ?? getInputDefault(spec, "rodLengthM", 11.7);
  const rodLengthM = allowedValue(
    requestedRodLength,
    spec.packaging_rules.allowed_rod_lengths_m,
    11.7,
  );
  const tieSharePercent = Math.max(
    0,
    Math.min(100, inputs.tieSharePercent ?? getInputDefault(spec, "tieSharePercent", 100)),
  );
  const wireLengthPerTieM = Math.max(
    0.1,
    Math.min(1, inputs.wireLengthPerTieM ?? getInputDefault(spec, "wireLengthPerTieM", 0.3)),
  );
  const wireReservePercent = Math.max(
    0,
    Math.min(50, inputs.wireReservePercent ?? getInputDefault(spec, "wireReservePercent", 10)),
  );
  const requestedWirePackage = inputs.wirePackageKg ?? getInputDefault(spec, "wirePackageKg", 1);
  const wirePackageKg = allowedValue(
    requestedWirePackage,
    spec.packaging_rules.allowed_wire_packages_kg,
    1,
  );

  let geometry: RebarGeometry;
  if (structureType === 0) {
    const clearLengthM = Math.max(0, length - 2 * edgeCoverMm / 1000);
    const clearWidthM = Math.max(0, width - 2 * edgeCoverMm / 1000);
    const gridStepM = gridStepMm / 1000;
    const barsAlongLength = Math.ceil(clearWidthM / gridStepM) + 1;
    const barsAlongWidth = Math.ceil(clearLengthM / gridStepM) + 1;
    geometry = {
      mainExactLengthM: roundDisplay(
        gridLayers * (barsAlongLength * clearLengthM + barsAlongWidth * clearWidthM),
        6,
      ),
      secondaryExactLengthM: 0,
      intersections: barsAlongLength * barsAlongWidth * gridLayers,
      barsAlongLength,
      barsAlongWidth,
      stirrupCount: 0,
      stirrupPieceLengthM: 0,
    };
  } else {
    const stirrupCount = Math.ceil(frameLengthM / (stirrupStepMm / 1000)) + 1;
    const stirrupPieceLengthM = roundDisplay(
      2 * (stirrupWidthMm + stirrupHeightMm) / 1000 + stirrupHookAllowanceMm / 1000,
      6,
    );
    geometry = {
      mainExactLengthM: roundDisplay(frameLengthM * longitudinalBars, 6),
      secondaryExactLengthM: roundDisplay(stirrupCount * stirrupPieceLengthM, 6),
      intersections: stirrupCount * longitudinalBars,
      barsAlongLength: 0,
      barsAlongWidth: 0,
      stirrupCount,
      stirrupPieceLengthM,
    };
  }

  const maxReserveFloor = Math.max(0, spec.scenario_policy.max_reserve_floor_percent ?? 15);
  const scenarioPlans = {
    MIN: buildScenarioPlan(geometry, 0, rodLengthM),
    REC: buildScenarioPlan(geometry, reservePercent, rodLengthM),
    MAX: buildScenarioPlan(geometry, Math.max(reservePercent, maxReserveFloor), rodLengthM),
  };

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const plan = scenarioPlans[scenario];
    acc[scenario] = {
      exact_need: plan.totalPlanningLengthM,
      purchase_quantity: plan.totalPurchaseLengthM,
      leftover: roundDisplay(plan.totalPurchaseLengthM - plan.totalPlanningLengthM, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `scheme:${structureType === 0 ? "grid" : "frame"}`,
        `reserve_percent:${plan.reservePercent}`,
        `main_diameter_mm:${mainDiameter}`,
        `rod_length_m:${rodLengthM}`,
        "packaging:each_diameter_separately",
      ],
      key_factors: {
        reserve_percent: plan.reservePercent,
        field_multiplier: roundDisplay(1 + plan.reservePercent / 100, 6),
        rod_length_m: rodLengthM,
      },
      buy_plan: {
        package_label: `Прутки по ${rodLengthM} м — каждый диаметр отдельно`,
        package_size: rodLengthM,
        packages_count: plan.mainRods + plan.secondaryRods,
        unit: "прутков",
      },
    };
    return acc;
  }, {} as ScenarioBundle);

  const recPlan = scenarioPlans.REC;
  const tieCount = Math.ceil(geometry.intersections * tieSharePercent / 100);
  const wireExactLengthM = roundDisplay(tieCount * wireLengthPerTieM, 6);
  const wireExactKg = roundDisplay(
    wireExactLengthM * spec.material_rules.wire_weight_kg_per_m,
    6,
  );
  const wirePlanningKg = roundDisplay(wireExactKg * (1 + wireReservePercent / 100), 6);
  const wirePackages = wirePlanningKg > 0 ? Math.ceil(wirePlanningKg / wirePackageKg) : 0;
  const wirePurchaseKg = roundDisplay(wirePackages * wirePackageKg, 6);
  const weightPerMainM = spec.material_rules.weight_per_meter[String(mainDiameter)] ?? 0.888;
  const weightPerSecondaryM = spec.material_rules.weight_per_meter[String(stirrupDiameterMm)] ?? 0.395;

  const warnings = [
    "Калькулятор не назначает диаметр, шаг, число слоёв, нахлёсты, анкеровку или форму хомутов. Все параметры схемы перенесите из проекта конструктора.",
  ];
  const practicalNotes = [
    "Перед заказом сверьте доступные длины прутков, класс проката и возможность резки у поставщика.",
    "Закупочный запас не заменяет ведомость стержней и карту раскроя: сложные углы, выпуски, анкеровку и соединения учитывают по проекту отдельно.",
  ];

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials: buildMaterials(
      structureType,
      mainDiameter,
      stirrupDiameterMm,
      geometry,
      recPlan,
      rodLengthM,
      weightPerMainM,
      weightPerSecondaryM,
      wireExactKg,
      wirePlanningKg,
      wirePurchaseKg,
      wirePackages,
      wirePackageKg,
      tieSharePercent,
      wireLengthPerTieM,
    ),
    totals: {
      structureType,
      length: roundDisplay(length, 3),
      width: roundDisplay(width, 3),
      gridLayers,
      gridStepMm: roundDisplay(gridStepMm, 3),
      edgeCoverMm: roundDisplay(edgeCoverMm, 3),
      frameLengthM: roundDisplay(frameLengthM, 3),
      longitudinalBars,
      stirrupWidthMm: roundDisplay(stirrupWidthMm, 3),
      stirrupHeightMm: roundDisplay(stirrupHeightMm, 3),
      stirrupStepMm: roundDisplay(stirrupStepMm, 3),
      stirrupDiameterMm,
      stirrupHookAllowanceMm: roundDisplay(stirrupHookAllowanceMm, 3),
      mainDiameter,
      reservePercent: roundDisplay(reservePercent, 3),
      rodLengthM,
      mainExactLengthM: roundDisplay(geometry.mainExactLengthM, 3),
      mainPlanningLengthM: roundDisplay(recPlan.mainPlanningLengthM, 3),
      mainPurchaseLengthM: roundDisplay(recPlan.mainPurchaseLengthM, 3),
      mainRods: recPlan.mainRods,
      mainExactWeightKg: roundDisplay(geometry.mainExactLengthM * weightPerMainM, 3),
      mainPlanningWeightKg: roundDisplay(recPlan.mainPlanningLengthM * weightPerMainM, 3),
      mainPurchaseWeightKg: roundDisplay(recPlan.mainPurchaseLengthM * weightPerMainM, 3),
      secondaryExactLengthM: roundDisplay(geometry.secondaryExactLengthM, 3),
      secondaryPlanningLengthM: roundDisplay(recPlan.secondaryPlanningLengthM, 3),
      secondaryPurchaseLengthM: roundDisplay(recPlan.secondaryPurchaseLengthM, 3),
      secondaryRods: recPlan.secondaryRods,
      secondaryExactWeightKg: roundDisplay(geometry.secondaryExactLengthM * weightPerSecondaryM, 3),
      secondaryPurchaseWeightKg: roundDisplay(recPlan.secondaryPurchaseLengthM * weightPerSecondaryM, 3),
      intersections: geometry.intersections,
      tieCount,
      tieSharePercent: roundDisplay(tieSharePercent, 3),
      wireLengthPerTieM: roundDisplay(wireLengthPerTieM, 3),
      wireExactLengthM: roundDisplay(wireExactLengthM, 3),
      wireExactKg: roundDisplay(wireExactKg, 3),
      wirePlanningKg: roundDisplay(wirePlanningKg, 3),
      wirePurchaseKg: roundDisplay(wirePurchaseKg, 3),
      wirePackages,
      wirePackageKg,
      barsAlongLength: geometry.barsAlongLength,
      barsAlongWidth: geometry.barsAlongWidth,
      stirrupCount: geometry.stirrupCount,
      stirrupPieceLengthM: roundDisplay(geometry.stirrupPieceLengthM, 3),
      minExactNeedM: scenarios.MIN.exact_need,
      recExactNeedM: scenarios.REC.exact_need,
      maxExactNeedM: scenarios.MAX.exact_need,
      minPurchaseM: scenarios.MIN.purchase_quantity,
      recPurchaseM: scenarios.REC.purchase_quantity,
      maxPurchaseM: scenarios.MAX.purchase_quantity,
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
      notes: ["Скрытые коэффициенты точности не применяются: запас, доля перевязки и фасовка задаются отдельными полями"],
    },
  };
}
