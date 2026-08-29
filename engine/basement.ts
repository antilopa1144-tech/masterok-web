import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  BasementCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { ACCURACY_MODE_LABELS, type AccuracyMode, DEFAULT_ACCURACY_MODE } from "./accuracy";
import { getInputDefault } from "./spec-helpers";
import { roundDisplay } from "./units";

interface BasementInputs {
  length?: number;
  width?: number;
  depth?: number;
  wallThickness?: number;
  wallOpeningsAreaM2?: number;
  floorLength?: number;
  floorWidth?: number;
  floorThickness?: number;
  floorConcreteReservePercent?: number;
  wallConcreteReservePercent?: number;
  readyMixOrderStepM3?: number;
  floorDeliveryAllowanceM3?: number;
  wallDeliveryAllowanceM3?: number;
  floorRebarProjectKg?: number;
  wallRebarProjectKg?: number;
  rebarReservePercent?: number;
  rebarOrderStepKg?: number;
  wallFormworkMode?: number;
  formworkReservePercent?: number;
  formworkSheetAreaM2?: number;
  waterproofScope?: number;
  waterproofSystem?: number;
  waterproofWallHeightM?: number;
  waterproofReservePercent?: number;
  waterproofConsumptionKgM2?: number;
  waterproofPackageKg?: number;
  waterproofLayers?: number;
  waterproofRollAreaM2?: number;
  insulationScope?: number;
  insulationWallHeightM?: number;
  insulationLayers?: number;
  insulationReservePercent?: number;
  insulationBoardAreaM2?: number;
  accuracyMode?: AccuracyMode;
}

interface ConcreteScenarioParts {
  floorNeedM3: number;
  wallNeedM3: number;
  floorPurchaseM3: number;
  wallPurchaseM3: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundUpToStep(value: number, step: number): number {
  if (value <= 0) return 0;
  return roundDisplay(Math.ceil(value / step - 1e-9) * step, 6);
}

function includesWalls(scope: number): boolean {
  return scope === 1 || scope === 3;
}

function includesFloor(scope: number): boolean {
  return scope === 2 || scope === 3;
}

export function computeCanonicalBasement(
  spec: BasementCanonicalSpec,
  inputs: BasementInputs,
  _factorTable?: unknown,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  const length = clamp(inputs.length ?? getInputDefault(spec, "length", 8), 3, 30);
  const width = clamp(inputs.width ?? getInputDefault(spec, "width", 6), 3, 20);
  const depth = clamp(inputs.depth ?? getInputDefault(spec, "depth", 2.5), 1.5, 5);
  const wallThickness = clamp(
    inputs.wallThickness ?? getInputDefault(spec, "wallThickness", 200),
    100,
    1000,
  );
  const wallThicknessM = wallThickness / 1000;
  const requestedOpeningsAreaM2 = clamp(
    inputs.wallOpeningsAreaM2 ?? getInputDefault(spec, "wallOpeningsAreaM2", 0),
    0,
    200,
  );
  const floorLength = clamp(
    inputs.floorLength ?? getInputDefault(spec, "floorLength", 8),
    3,
    35,
  );
  const floorWidth = clamp(
    inputs.floorWidth ?? getInputDefault(spec, "floorWidth", 6),
    3,
    25,
  );
  const floorThickness = clamp(
    inputs.floorThickness ?? getInputDefault(spec, "floorThickness", 150),
    100,
    1000,
  );

  const floorConcreteReservePercent = clamp(
    inputs.floorConcreteReservePercent
      ?? getInputDefault(spec, "floorConcreteReservePercent", 5),
    0,
    20,
  );
  const wallConcreteReservePercent = clamp(
    inputs.wallConcreteReservePercent
      ?? getInputDefault(spec, "wallConcreteReservePercent", 5),
    0,
    20,
  );
  const requestedReadyMixStep = inputs.readyMixOrderStepM3
    ?? getInputDefault(spec, "readyMixOrderStepM3", 0.1);
  const readyMixOrderStepM3 = spec.packaging_rules.allowed_ready_mix_order_steps_m3
    .includes(requestedReadyMixStep)
    ? requestedReadyMixStep
    : spec.packaging_rules.allowed_ready_mix_order_steps_m3[0];
  const floorDeliveryAllowanceM3 = clamp(
    inputs.floorDeliveryAllowanceM3
      ?? getInputDefault(spec, "floorDeliveryAllowanceM3", 0),
    0,
    5,
  );
  const wallDeliveryAllowanceM3 = clamp(
    inputs.wallDeliveryAllowanceM3
      ?? getInputDefault(spec, "wallDeliveryAllowanceM3", 0),
    0,
    5,
  );

  const floorRebarProjectKg = clamp(
    inputs.floorRebarProjectKg ?? getInputDefault(spec, "floorRebarProjectKg", 0),
    0,
    100000,
  );
  const wallRebarProjectKg = clamp(
    inputs.wallRebarProjectKg ?? getInputDefault(spec, "wallRebarProjectKg", 0),
    0,
    100000,
  );
  const rebarReservePercent = clamp(
    inputs.rebarReservePercent ?? getInputDefault(spec, "rebarReservePercent", 0),
    0,
    30,
  );
  const requestedRebarStep = inputs.rebarOrderStepKg
    ?? getInputDefault(spec, "rebarOrderStepKg", 1);
  const rebarOrderStepKg = spec.packaging_rules.allowed_rebar_order_steps_kg
    .includes(requestedRebarStep)
    ? requestedRebarStep
    : spec.packaging_rules.allowed_rebar_order_steps_kg[0];

  const wallFormworkMode = Math.round(clamp(
    inputs.wallFormworkMode ?? getInputDefault(spec, "wallFormworkMode", 0),
    0,
    3,
  ));
  const formworkReservePercent = clamp(
    inputs.formworkReservePercent ?? getInputDefault(spec, "formworkReservePercent", 10),
    0,
    30,
  );
  const formworkSheetAreaM2 = clamp(
    inputs.formworkSheetAreaM2 ?? getInputDefault(spec, "formworkSheetAreaM2", 2.88),
    0.1,
    20,
  );

  const waterproofScope = Math.round(clamp(
    inputs.waterproofScope ?? getInputDefault(spec, "waterproofScope", 0),
    0,
    3,
  ));
  const waterproofSystem = Math.round(clamp(
    inputs.waterproofSystem ?? getInputDefault(spec, "waterproofSystem", 1),
    1,
    2,
  ));
  const requestedWaterproofWallHeightM = clamp(
    inputs.waterproofWallHeightM ?? getInputDefault(spec, "waterproofWallHeightM", 2.5),
    0,
    5,
  );
  const waterproofWallHeightM = Math.min(requestedWaterproofWallHeightM, depth);
  const waterproofReservePercent = clamp(
    inputs.waterproofReservePercent
      ?? getInputDefault(spec, "waterproofReservePercent", 15),
    0,
    50,
  );
  const waterproofConsumptionKgM2 = clamp(
    inputs.waterproofConsumptionKgM2
      ?? getInputDefault(spec, "waterproofConsumptionKgM2", 0),
    0,
    20,
  );
  const waterproofPackageKg = clamp(
    inputs.waterproofPackageKg ?? getInputDefault(spec, "waterproofPackageKg", 0),
    0,
    200,
  );
  const waterproofLayers = Math.round(clamp(
    inputs.waterproofLayers ?? getInputDefault(spec, "waterproofLayers", 1),
    1,
    5,
  ));
  const waterproofRollAreaM2 = clamp(
    inputs.waterproofRollAreaM2 ?? getInputDefault(spec, "waterproofRollAreaM2", 0),
    0,
    200,
  );

  const insulationScope = Math.round(clamp(
    inputs.insulationScope ?? getInputDefault(spec, "insulationScope", 0),
    0,
    3,
  ));
  const requestedInsulationWallHeightM = clamp(
    inputs.insulationWallHeightM
      ?? getInputDefault(spec, "insulationWallHeightM", 2.5),
    0,
    5,
  );
  const insulationWallHeightM = Math.min(requestedInsulationWallHeightM, depth);
  const insulationLayers = Math.round(clamp(
    inputs.insulationLayers ?? getInputDefault(spec, "insulationLayers", 1),
    1,
    5,
  ));
  const insulationReservePercent = clamp(
    inputs.insulationReservePercent
      ?? getInputDefault(spec, "insulationReservePercent", 5),
    0,
    30,
  );
  const insulationBoardAreaM2 = clamp(
    inputs.insulationBoardAreaM2
      ?? getInputDefault(spec, "insulationBoardAreaM2", 0.72),
    0.1,
    5,
  );

  const outerPlanArea = length * width;
  const innerLength = Math.max(0, length - 2 * wallThicknessM);
  const innerWidth = Math.max(0, width - 2 * wallThicknessM);
  const innerPlanArea = innerLength * innerWidth;
  const outerWallPerimeter = 2 * (length + width);
  const innerWallPerimeter = 2 * (innerLength + innerWidth);
  const grossWallVolume = (outerPlanArea - innerPlanArea) * depth;
  const outerWallAreaGross = outerWallPerimeter * depth;
  const innerWallAreaGross = innerWallPerimeter * depth;
  const maxOpeningsAreaM2 = wallThicknessM > 0
    ? Math.min(outerWallAreaGross, innerWallAreaGross, grossWallVolume / wallThicknessM)
    : 0;
  const wallOpeningsAreaM2 = Math.min(requestedOpeningsAreaM2, maxOpeningsAreaM2);
  const openingsVolume = wallOpeningsAreaM2 * wallThicknessM;
  const wallVolume = Math.max(0, grossWallVolume - openingsVolume);
  const outerWallArea = Math.max(0, outerWallAreaGross - wallOpeningsAreaM2);
  const innerWallArea = Math.max(0, innerWallAreaGross - wallOpeningsAreaM2);
  const floorArea = floorLength * floorWidth;
  const floorVolume = floorArea * (floorThickness / 1000);
  const cleanConcreteM3 = floorVolume + wallVolume;

  const concreteParts: Record<string, ConcreteScenarioParts> = {};
  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const floorReserve = scenario === "MIN"
      ? 0
      : scenario === "MAX"
        ? Math.max(floorConcreteReservePercent, spec.scenario_policy.max_reserve_floor_percent)
        : floorConcreteReservePercent;
    const wallReserve = scenario === "MIN"
      ? 0
      : scenario === "MAX"
        ? Math.max(wallConcreteReservePercent, spec.scenario_policy.max_reserve_floor_percent)
        : wallConcreteReservePercent;
    const floorNeedM3 = floorVolume * (1 + floorReserve / 100) + floorDeliveryAllowanceM3;
    const wallNeedM3 = wallVolume * (1 + wallReserve / 100) + wallDeliveryAllowanceM3;
    const floorPurchaseM3 = roundUpToStep(floorNeedM3, readyMixOrderStepM3);
    const wallPurchaseM3 = roundUpToStep(wallNeedM3, readyMixOrderStepM3);
    const exactNeed = roundDisplay(floorNeedM3 + wallNeedM3, 6);
    const purchaseQuantity = roundDisplay(floorPurchaseM3 + wallPurchaseM3, 6);

    concreteParts[scenario] = {
      floorNeedM3,
      wallNeedM3,
      floorPurchaseM3,
      wallPurchaseM3,
    };
    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: purchaseQuantity,
      leftover: roundDisplay(purchaseQuantity - exactNeed, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        "dimension_reference:outer_wall_contour",
        "concrete_orders:floor_and_walls_separate",
        `floor_reserve_percent:${floorReserve}`,
        `wall_reserve_percent:${wallReserve}`,
        `ready_mix_order_step_m3:${readyMixOrderStepM3}`,
      ],
      key_factors: {
        floor_reserve_percent: floorReserve,
        wall_reserve_percent: wallReserve,
        field_multiplier: 1,
        ready_mix_order_step_m3: readyMixOrderStepM3,
      },
      buy_plan: {
        package_label: `separate-ready-mix-orders-${readyMixOrderStepM3}m3`,
        package_size: readyMixOrderStepM3,
        packages_count: Math.round(purchaseQuantity / readyMixOrderStepM3),
        unit: spec.packaging_rules.unit,
      },
    };
    return acc;
  }, {} as ScenarioBundle);

  const recParts = concreteParts.REC;
  const floorRebarPlanningKg = floorRebarProjectKg * (1 + rebarReservePercent / 100);
  const wallRebarPlanningKg = wallRebarProjectKg * (1 + rebarReservePercent / 100);
  const floorRebarPurchaseKg = roundUpToStep(floorRebarPlanningKg, rebarOrderStepKg);
  const wallRebarPurchaseKg = roundUpToStep(wallRebarPlanningKg, rebarOrderStepKg);

  const formworkExactAreaM2 = (
    wallFormworkMode === 1
      ? outerWallArea
      : wallFormworkMode === 2
        ? innerWallArea
        : wallFormworkMode === 3
          ? outerWallArea + innerWallArea
          : 0
  );
  const formworkPlanningAreaM2 = formworkExactAreaM2 * (1 + formworkReservePercent / 100);
  const formworkSheets = formworkExactAreaM2 > 0
    ? Math.ceil(formworkPlanningAreaM2 / formworkSheetAreaM2)
    : 0;
  const formworkPurchaseAreaM2 = formworkSheets * formworkSheetAreaM2;

  const waterproofWallAreaM2 = includesWalls(waterproofScope)
    ? outerWallPerimeter * waterproofWallHeightM
    : 0;
  const waterproofFloorAreaM2 = includesFloor(waterproofScope) ? floorArea : 0;
  const waterproofBaseAreaM2 = waterproofWallAreaM2 + waterproofFloorAreaM2;
  const waterproofMassExactKg = waterproofSystem === 1
    ? waterproofBaseAreaM2 * waterproofConsumptionKgM2
    : 0;
  const waterproofMassPlanningKg = waterproofMassExactKg
    * (1 + waterproofReservePercent / 100);
  const waterproofPackages = waterproofScope > 0
    && waterproofSystem === 1
    && waterproofMassExactKg > 0
    && waterproofPackageKg > 0
    ? Math.ceil(waterproofMassPlanningKg / waterproofPackageKg)
    : 0;
  const waterproofMassPurchaseKg = waterproofPackages * waterproofPackageKg;
  const waterproofRollExactAreaM2 = waterproofSystem === 2
    ? waterproofBaseAreaM2 * waterproofLayers
    : 0;
  const waterproofRollPlanningAreaM2 = waterproofRollExactAreaM2
    * (1 + waterproofReservePercent / 100);
  const waterproofRolls = waterproofScope > 0
    && waterproofSystem === 2
    && waterproofRollExactAreaM2 > 0
    && waterproofRollAreaM2 > 0
    ? Math.ceil(waterproofRollPlanningAreaM2 / waterproofRollAreaM2)
    : 0;
  const waterproofRollPurchaseAreaM2 = waterproofRolls * waterproofRollAreaM2;

  const insulationWallAreaM2 = includesWalls(insulationScope)
    ? outerWallPerimeter * insulationWallHeightM
    : 0;
  const insulationFloorAreaM2 = includesFloor(insulationScope) ? floorArea : 0;
  const insulationBaseAreaM2 = insulationWallAreaM2 + insulationFloorAreaM2;
  const insulationExactAreaM2 = insulationBaseAreaM2 * insulationLayers;
  const insulationPlanningAreaM2 = insulationExactAreaM2
    * (1 + insulationReservePercent / 100);
  const insulationBoards = insulationExactAreaM2 > 0
    ? Math.ceil(insulationPlanningAreaM2 / insulationBoardAreaM2)
    : 0;
  const insulationPurchaseAreaM2 = insulationBoards * insulationBoardAreaM2;

  const materials: CanonicalMaterialResult[] = [
    {
      name: "Товарный бетон для плиты пола — класс по проекту",
      subtitle:
        `Отдельная заливка: чистый объём, запас ${floorConcreteReservePercent}%, остаток в линии подачи и заказ с шагом ${readyMixOrderStepM3} м³ показаны раздельно`,
      quantity: roundDisplay(floorVolume, 3),
      unit: "м³",
      withReserve: roundDisplay(recParts.floorNeedM3, 3),
      purchaseQty: roundDisplay(recParts.floorPurchaseM3, 3),
      category: "Бетон",
    },
    {
      name: "Товарный бетон для наружных стен — класс по проекту",
      subtitle:
        `Объём по наружному и внутреннему контуру без двойного счёта углов; запас ${wallConcreteReservePercent}%, остаток и шаг заказа задаются явно`,
      quantity: roundDisplay(wallVolume, 3),
      unit: "м³",
      withReserve: roundDisplay(recParts.wallNeedM3, 3),
      purchaseQty: roundDisplay(recParts.wallPurchaseM3, 3),
      category: "Бетон",
    },
  ];

  if (floorRebarProjectKg > 0) {
    materials.push({
      name: "Арматура плиты пола — масса из проектной ведомости",
      subtitle:
        `Калькулятор добавляет только явный запас ${rebarReservePercent}% и округляет массу заказа с шагом ${rebarOrderStepKg} кг; диаметры и раскрой не определяет`,
      quantity: roundDisplay(floorRebarProjectKg, 3),
      unit: "кг",
      withReserve: roundDisplay(floorRebarPlanningKg, 3),
      purchaseQty: roundDisplay(floorRebarPurchaseKg, 3),
      category: "Армирование",
    });
  }
  if (wallRebarProjectKg > 0) {
    materials.push({
      name: "Арматура стен — масса из проектной ведомости",
      subtitle:
        `Калькулятор добавляет только явный запас ${rebarReservePercent}% и округляет массу заказа с шагом ${rebarOrderStepKg} кг; усиления проёмов и карта стержней остаются в проекте`,
      quantity: roundDisplay(wallRebarProjectKg, 3),
      unit: "кг",
      withReserve: roundDisplay(wallRebarPlanningKg, 3),
      purchaseQty: roundDisplay(wallRebarPurchaseKg, 3),
      category: "Армирование",
    });
  }
  if (formworkExactAreaM2 > 0) {
    materials.push({
      name: "Щиты или листы опалубки стен",
      subtitle:
        "Площадь выбранных граней за вычетом проёмов; торцы, откосы, стыки, крепёж и оборачиваемость щитов в этот подсчёт не входят",
      quantity: roundDisplay(formworkExactAreaM2, 3),
      unit: "м²",
      withReserve: roundDisplay(formworkPlanningAreaM2, 3),
      purchaseQty: roundDisplay(formworkPurchaseAreaM2, 3),
      packageInfo: {
        count: formworkSheets,
        size: formworkSheetAreaM2,
        packageUnit: "листов/щитов",
      },
      category: "Опалубка",
    });
  }
  if (waterproofScope > 0 && waterproofSystem === 1 && waterproofPackages > 0) {
    materials.push({
      name: "Гидроизоляционный состав — выбранная система",
      subtitle:
        `Расход ${waterproofConsumptionKgM2} кг/м² на весь предусмотренный цикл взят из введённых данных товара, а не назначен калькулятором`,
      quantity: roundDisplay(waterproofMassExactKg, 3),
      unit: "кг",
      withReserve: roundDisplay(waterproofMassPlanningKg, 3),
      purchaseQty: roundDisplay(waterproofMassPurchaseKg, 3),
      packageInfo: {
        count: waterproofPackages,
        size: waterproofPackageKg,
        packageUnit: "упаковок",
      },
      category: "Гидроизоляция",
    });
  }
  if (waterproofScope > 0 && waterproofSystem === 2 && waterproofRolls > 0) {
    materials.push({
      name: "Рулонная гидроизоляция — выбранная система",
      subtitle:
        `${waterproofLayers} слой(я) по проекту; нахлёсты, примыкания и раскрой учитываются только введённым запасом ${waterproofReservePercent}%`,
      quantity: roundDisplay(waterproofRollExactAreaM2, 3),
      unit: "м²",
      withReserve: roundDisplay(waterproofRollPlanningAreaM2, 3),
      purchaseQty: roundDisplay(waterproofRollPurchaseAreaM2, 3),
      packageInfo: {
        count: waterproofRolls,
        size: waterproofRollAreaM2,
        packageUnit: "рулонов",
      },
      category: "Гидроизоляция",
    });
  }
  if (insulationExactAreaM2 > 0) {
    materials.push({
      name: "Плитный утеплитель — тип и толщина по проекту",
      subtitle:
        `${insulationLayers} слой(я); калькулятор считает только выбранные поверхности, явный запас и фактическую площадь одной плиты`,
      quantity: roundDisplay(insulationExactAreaM2, 3),
      unit: "м²",
      withReserve: roundDisplay(insulationPlanningAreaM2, 3),
      purchaseQty: roundDisplay(insulationPurchaseAreaM2, 3),
      packageInfo: {
        count: insulationBoards,
        size: insulationBoardAreaM2,
        packageUnit: "плит",
      },
      category: "Утепление",
    });
  }

  const warnings = [
    "Калькулятор не проектирует подвал: тип основания, толщину стен и плиты, класс бетона, армирование, трещиностойкость и защиту от воды назначают по геологии и расчёту",
    "Дренаж, вентиляция, земляные работы, обратная засыпка, швы, вводы и узлы примыкания не рассчитываются — для них нужна отдельная проектная схема",
  ];
  if (floorRebarProjectKg <= 0 && wallRebarProjectKg <= 0) {
    warnings.push(
      "Арматура не добавлена автоматически: перенесите массы из проектной ведомости или рассчитайте стержни по рабочей схеме в отдельном калькуляторе арматуры",
    );
  }
  if (scenarios.REC.purchase_quantity >= spec.warnings_rules.large_order_threshold_m3) {
    warnings.push(
      "Крупный заказ бетона: подтвердите раздельные графики заливки пола и стен, шаг поставщика, насос, подъезд и остаток смеси в линии подачи",
    );
  }
  if (requestedOpeningsAreaM2 > wallOpeningsAreaM2) {
    warnings.push(
      "Площадь проёмов превышает доступную площадь стен и ограничена геометрией; проверьте наружный контур, толщину и ведомость проёмов",
    );
  }
  if (waterproofScope > 0 && waterproofSystem === 1
    && (waterproofConsumptionKgM2 <= 0 || waterproofPackageKg <= 0)) {
    warnings.push(
      "Для гидроизоляционного состава не заполнены расход на весь цикл и масса упаковки — позиция к покупке не рассчитана",
    );
  }
  if (waterproofScope > 0 && waterproofSystem === 2 && waterproofRollAreaM2 <= 0) {
    warnings.push(
      "Для рулонной гидроизоляции не заполнена площадь рулона — позиция к покупке не рассчитана",
    );
  }
  if (requestedWaterproofWallHeightM > depth) {
    warnings.push("Высота гидроизоляции ограничена введённой высотой монолитной стены");
  }
  if (requestedInsulationWallHeightM > depth) {
    warnings.push("Высота утепления ограничена введённой высотой монолитной стены");
  }

  const practicalNotes = [
    "Размеры стен вводятся по наружному контуру, а размеры плиты пола — отдельно: калькулятор не предполагает, что они совпадают",
    "Пол и стены считаются отдельными заливками и округляются раздельно; объединять их в одну поставку нельзя без фактического графика бетонирования",
    "Проёмы вычитаются из бетона и плоских граней опалубки, но откосы, торцы и локальные усиления нужно брать из рабочих чертежей",
    "ГОСТ 7473-2010 действует на дату аудита 29.08.2026; принятый ГОСТ 7473-2026 вводится 01.11.2026",
  ];

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      length: roundDisplay(length, 3),
      width: roundDisplay(width, 3),
      depth: roundDisplay(depth, 3),
      wallThickness,
      wallOpeningsAreaM2: roundDisplay(wallOpeningsAreaM2, 3),
      requestedOpeningsAreaM2: roundDisplay(requestedOpeningsAreaM2, 3),
      floorLength: roundDisplay(floorLength, 3),
      floorWidth: roundDisplay(floorWidth, 3),
      floorThickness,
      outerPlanArea: roundDisplay(outerPlanArea, 3),
      innerPlanArea: roundDisplay(innerPlanArea, 3),
      innerLength: roundDisplay(innerLength, 3),
      innerWidth: roundDisplay(innerWidth, 3),
      outerWallPerimeter: roundDisplay(outerWallPerimeter, 3),
      innerWallPerimeter: roundDisplay(innerWallPerimeter, 3),
      outerWallArea: roundDisplay(outerWallArea, 3),
      innerWallArea: roundDisplay(innerWallArea, 3),
      floorArea: roundDisplay(floorArea, 3),
      grossWallVolume: roundDisplay(grossWallVolume, 4),
      openingsVolume: roundDisplay(openingsVolume, 4),
      wallVolume: roundDisplay(wallVolume, 4),
      floorVolume: roundDisplay(floorVolume, 4),
      cleanConcreteM3: roundDisplay(cleanConcreteM3, 4),
      floorConcreteReservePercent: roundDisplay(floorConcreteReservePercent, 3),
      wallConcreteReservePercent: roundDisplay(wallConcreteReservePercent, 3),
      readyMixOrderStepM3,
      floorDeliveryAllowanceM3: roundDisplay(floorDeliveryAllowanceM3, 3),
      wallDeliveryAllowanceM3: roundDisplay(wallDeliveryAllowanceM3, 3),
      floorConcrete: roundDisplay(recParts.floorPurchaseM3, 3),
      wallConcrete: roundDisplay(recParts.wallPurchaseM3, 3),
      totalConcrete: roundDisplay(cleanConcreteM3, 3),
      concreteVolume: roundDisplay(scenarios.REC.purchase_quantity, 3),
      floorRebarProjectKg: roundDisplay(floorRebarProjectKg, 3),
      wallRebarProjectKg: roundDisplay(wallRebarProjectKg, 3),
      floorRebarPurchaseKg: roundDisplay(floorRebarPurchaseKg, 3),
      wallRebarPurchaseKg: roundDisplay(wallRebarPurchaseKg, 3),
      rebarPurchaseKg: roundDisplay(floorRebarPurchaseKg + wallRebarPurchaseKg, 3),
      wallFormworkMode,
      formworkExactAreaM2: roundDisplay(formworkExactAreaM2, 3),
      formworkPlanningAreaM2: roundDisplay(formworkPlanningAreaM2, 3),
      formworkSheets,
      formworkPurchaseAreaM2: roundDisplay(formworkPurchaseAreaM2, 3),
      waterproofScope,
      waterproofSystem,
      waterproofArea: roundDisplay(waterproofBaseAreaM2, 3),
      waterproofWallAreaM2: roundDisplay(waterproofWallAreaM2, 3),
      waterproofFloorAreaM2: roundDisplay(waterproofFloorAreaM2, 3),
      waterproofPackages,
      waterproofRolls,
      insulationScope,
      insulationArea: roundDisplay(insulationExactAreaM2, 3),
      insulationBoards,
      insulationPurchaseAreaM2: roundDisplay(insulationPurchaseAreaM2, 3),
      drainageLength: 0,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: scenarios.REC.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: scenarios.REC.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
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
        "Скрытые коэффициенты точности не применяются: геометрия, запасы, остатки, проектная масса и фасовки задаются отдельными полями",
      ],
    },
  };
}
