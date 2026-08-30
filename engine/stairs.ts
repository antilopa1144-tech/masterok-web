import type { FactorTable } from "./factors";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  StairsCanonicalSpec,
} from "./canonical";
import type { ScenarioBundle } from "./scenarios";
import {
  ACCURACY_MODE_LABELS,
  DEFAULT_ACCURACY_MODE,
  type AccuracyMode,
} from "./accuracy";
import { getInputDefault } from "./spec-helpers";
import { roundDisplay } from "./units";

interface StairsInputs {
  geometryMode?: number;
  floorRiseM?: number;
  targetRiserHeightMm?: number;
  projectRiserCount?: number;
  treadDepthMm?: number;
  topFloorActsAsTread?: number;
  stairWidthM?: number;
  openingLengthM?: number;
  floorStructureThicknessM?: number;
  includeTreadBlanks?: number;
  treadReservePercent?: number;
  treadsPerPackagePcs?: number;
  riserProjectPcs?: number;
  riserReservePercent?: number;
  risersPerPackagePcs?: number;
  stringerProjectPcs?: number;
  stringerBlankLengthM?: number;
  stringerReservePercent?: number;
  stringerStockLengthM?: number;
  concreteProjectM3?: number;
  concreteReservePercent?: number;
  concreteOrderStepM3?: number;
  rebarProjectKg?: number;
  rebarReservePercent?: number;
  rebarPackageKg?: number;
  handrailProjectM?: number;
  handrailReservePercent?: number;
  handrailStockLengthM?: number;
  railingInfillProjectPcs?: number;
  railingInfillReservePercent?: number;
  railingInfillPackagePcs?: number;
  fastenersProjectPcs?: number;
  fastenersReservePercent?: number;
  fastenersPackagePcs?: number;
  landingFinishProjectM2?: number;
  landingFinishReservePercent?: number;
  landingFinishPackageM2?: number;
  accuracyMode?: AccuracyMode;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function input(
  spec: StairsCanonicalSpec,
  inputs: StairsInputs,
  key: keyof StairsInputs,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = inputs[key];
  return clamp(
    typeof value === "number" && Number.isFinite(value)
      ? value
      : getInputDefault(spec, String(key), fallback),
    min,
    max,
  );
}

function withReserve(exactNeed: number, reservePercent: number): number {
  return exactNeed * (1 + reservePercent / 100);
}

function roundUpUnits(exactNeed: number, unitSize: number): number {
  if (exactNeed <= 0 || unitSize <= 0) return 0;
  return Math.ceil(exactNeed / unitSize - 1e-9);
}

function packagedMaterial(
  name: string,
  category: string,
  exactNeed: number,
  reservePercent: number,
  packageSize: number,
  unit: string,
  packageUnit: string,
  subtitle: string,
): CanonicalMaterialResult | undefined {
  if (exactNeed <= 0 || packageSize <= 0) return undefined;
  const planned = withReserve(exactNeed, reservePercent);
  const packageCount = roundUpUnits(planned, packageSize);
  return {
    name,
    subtitle,
    quantity: roundDisplay(exactNeed, 3),
    unit,
    withReserve: roundDisplay(planned, 3),
    purchaseQty: roundDisplay(packageCount * packageSize, 3),
    packageInfo: { count: packageCount, size: packageSize, packageUnit },
    category,
  };
}

function longStockMaterial(
  projectPieces: number,
  blankLengthM: number,
  reservePercent: number,
  stockLengthM: number,
): CanonicalMaterialResult | undefined {
  if (projectPieces <= 0 || blankLengthM <= 0 || stockLengthM < blankLengthM) return undefined;
  const plannedPieces = Math.ceil(withReserve(projectPieces, reservePercent) - 1e-9);
  const blanksPerStock = Math.floor(stockLengthM / blankLengthM + 1e-9);
  if (blanksPerStock <= 0) return undefined;
  const stockPieces = roundUpUnits(plannedPieces, blanksPerStock);
  return {
    name: "Косоур/тетива — одна проектная позиция",
    subtitle:
      "Сечение, материал, число несущих элементов, узлы и допустимость раскроя принимает конструктор; составные элементы без проектного решения не предполагаются",
    quantity: roundDisplay(projectPieces * blankLengthM, 3),
    unit: "м",
    withReserve: roundDisplay(plannedPieces * blankLengthM, 3),
    purchaseQty: roundDisplay(stockPieces * stockLengthM, 3),
    packageInfo: { count: stockPieces, size: stockLengthM, packageUnit: "заготовок" },
    category: "Несущие элементы по проекту",
  };
}

function buildTreadScenarios(
  treadCount: number,
  reservePercent: number,
  packageSize: number,
): ScenarioBundle {
  const reserves = { MIN: 0, REC: reservePercent, MAX: reservePercent } as const;
  return (Object.keys(reserves) as Array<keyof typeof reserves>).reduce((acc, scenario) => {
    const reserve = reserves[scenario];
    const exactNeed = withReserve(treadCount, reserve);
    const packagesCount = roundUpUnits(exactNeed, packageSize);
    const purchaseQuantity = packagesCount * packageSize;
    acc[scenario] = {
      exact_need: roundDisplay(exactNeed, 6),
      purchase_quantity: roundDisplay(purchaseQuantity, 6),
      leftover: roundDisplay(purchaseQuantity - exactNeed, 6),
      assumptions: [
        "primary_material:tread_blanks",
        `reserve_percent:${reserve}`,
        scenario === "MAX" ? "no_hidden_max_reserve" : "explicit_scenario",
      ],
      key_factors: {
        field_multiplier: 1,
        reserve_percent: reserve,
      },
      buy_plan: {
        package_label: `tread-package-${packageSize}`,
        package_size: packageSize,
        packages_count: packagesCount,
        unit: "шт",
      },
    };
    return acc;
  }, {} as ScenarioBundle);
}

export function computeCanonicalStairs(
  spec: StairsCanonicalSpec,
  inputs: StairsInputs,
  _factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;
  const geometryMode = Math.round(input(spec, inputs, "geometryMode", 0, 0, 1));
  const floorRiseM = input(spec, inputs, "floorRiseM", 2.8, 1, 6);
  const targetRiserHeightMm = input(spec, inputs, "targetRiserHeightMm", 175, 100, 250);
  const projectRiserCount = Math.round(input(spec, inputs, "projectRiserCount", 16, 1, 50));
  const treadDepthMm = input(spec, inputs, "treadDepthMm", 280, 100, 500);
  const topFloorActsAsTread = Math.round(input(spec, inputs, "topFloorActsAsTread", 1, 0, 1));
  const stairWidthM = input(spec, inputs, "stairWidthM", 1, 0.5, 3);
  const openingLengthM = input(spec, inputs, "openingLengthM", 0, 0, 20);
  const floorStructureThicknessM = input(spec, inputs, "floorStructureThicknessM", 0.3, 0, 2);

  const targetModeCode = spec.material_rules.geometry_mode_codes.target_riser_height;
  const riserCount = geometryMode === targetModeCode
    ? Math.max(1, Math.round(floorRiseM / (targetRiserHeightMm / 1000)))
    : projectRiserCount;
  const actualRiserHeightMm = (floorRiseM * 1000) / riserCount;
  const treadCount = Math.max(0, riserCount - topFloorActsAsTread);
  const straightRunM = treadCount * (treadDepthMm / 1000);
  const inclineLengthM = Math.hypot(floorRiseM, straightRunM);
  const angleDeg = straightRunM > 0
    ? (Math.atan2(floorRiseM, straightRunM) * 180) / Math.PI
    : 90;
  const comfortStepMm = 2 * actualRiserHeightMm + treadDepthMm;
  const headroomEstimateAvailable = openingLengthM > 0 && straightRunM > 0;
  const estimatedHeadroomM = headroomEstimateAvailable
    ? Math.max(
      0,
      floorRiseM * Math.min(openingLengthM / straightRunM, 1) - floorStructureThicknessM,
    )
    : 0;

  const includeTreadBlanks = Math.round(input(spec, inputs, "includeTreadBlanks", 1, 0, 1));
  const treadReservePercent = input(spec, inputs, "treadReservePercent", 0, 0, 50);
  const treadsPerPackagePcs = input(spec, inputs, "treadsPerPackagePcs", 1, 0, 1000);
  const riserProjectPcs = Math.round(input(spec, inputs, "riserProjectPcs", 0, 0, 1000));
  const riserReservePercent = input(spec, inputs, "riserReservePercent", 0, 0, 50);
  const risersPerPackagePcs = input(spec, inputs, "risersPerPackagePcs", 1, 0, 1000);
  const stringerProjectPcs = Math.round(input(spec, inputs, "stringerProjectPcs", 0, 0, 100));
  const stringerBlankLengthM = input(spec, inputs, "stringerBlankLengthM", 0, 0, 30);
  const stringerReservePercent = input(spec, inputs, "stringerReservePercent", 0, 0, 50);
  const stringerStockLengthM = input(spec, inputs, "stringerStockLengthM", 0, 0, 30);
  const concreteProjectM3 = input(spec, inputs, "concreteProjectM3", 0, 0, 100);
  const concreteReservePercent = input(spec, inputs, "concreteReservePercent", 5, 0, 30);
  const concreteOrderStepM3 = input(spec, inputs, "concreteOrderStepM3", 0.1, 0, 10);
  const rebarProjectKg = input(spec, inputs, "rebarProjectKg", 0, 0, 100000);
  const rebarReservePercent = input(spec, inputs, "rebarReservePercent", 5, 0, 30);
  const rebarPackageKg = input(spec, inputs, "rebarPackageKg", 1, 0, 10000);
  const handrailProjectM = input(spec, inputs, "handrailProjectM", 0, 0, 1000);
  const handrailReservePercent = input(spec, inputs, "handrailReservePercent", 5, 0, 30);
  const handrailStockLengthM = input(spec, inputs, "handrailStockLengthM", 0, 0, 30);
  const railingInfillProjectPcs = Math.round(input(spec, inputs, "railingInfillProjectPcs", 0, 0, 10000));
  const railingInfillReservePercent = input(spec, inputs, "railingInfillReservePercent", 0, 0, 30);
  const railingInfillPackagePcs = input(spec, inputs, "railingInfillPackagePcs", 1, 0, 10000);
  const fastenersProjectPcs = Math.round(input(spec, inputs, "fastenersProjectPcs", 0, 0, 1000000));
  const fastenersReservePercent = input(spec, inputs, "fastenersReservePercent", 5, 0, 30);
  const fastenersPackagePcs = input(spec, inputs, "fastenersPackagePcs", 0, 0, 100000);
  const landingFinishProjectM2 = input(spec, inputs, "landingFinishProjectM2", 0, 0, 1000);
  const landingFinishReservePercent = input(spec, inputs, "landingFinishReservePercent", 10, 0, 50);
  const landingFinishPackageM2 = input(spec, inputs, "landingFinishPackageM2", 0, 0, 1000);

  const materialCandidates: Array<CanonicalMaterialResult | undefined> = [
    includeTreadBlanks === 1
      ? packagedMaterial(
        "Чистовые заготовки ступеней по геометрии",
        "Ступени",
        treadCount,
        treadReservePercent,
        treadsPerPackagePcs,
        "шт",
        spec.packaging_rules.count_package_unit,
        "Толщину, материал, опирание и несущую способность ступени принимает проектировщик",
      )
      : undefined,
    packagedMaterial(
      "Подступенки из проектной ведомости",
      "Ступени",
      riserProjectPcs,
      riserReservePercent,
      risersPerPackagePcs,
      "шт",
      spec.packaging_rules.count_package_unit,
      "Открытые и закрытые ступени имеют разную ведомость; количество вводится явно",
    ),
    longStockMaterial(
      stringerProjectPcs,
      stringerBlankLengthM,
      stringerReservePercent,
      stringerStockLengthM,
    ),
    packagedMaterial(
      "Бетон из проектной ведомости",
      "Монолит по проекту",
      concreteProjectM3,
      concreteReservePercent,
      concreteOrderStepM3,
      "м³",
      spec.packaging_rules.concrete_order_unit,
      "Объём, класс, подвижность, армирование, опалубку и схему бетонирования принимает проектировщик",
    ),
    packagedMaterial(
      "Арматура по проектной массе",
      "Монолит по проекту",
      rebarProjectKg,
      rebarReservePercent,
      rebarPackageKg,
      "кг",
      "пакетов",
      "Диаметры, классы, анкеровку, нахлёсты, защитный слой и закладные калькулятор не назначает",
    ),
    packagedMaterial(
      "Поручень — одна проектная позиция",
      "Ограждение по проекту",
      handrailProjectM,
      handrailReservePercent,
      handrailStockLengthM,
      "м",
      spec.packaging_rules.stock_piece_unit,
      "Высоту, сечение, узлы, стыки и число сторон ограждения переносят из проекта",
    ),
    packagedMaterial(
      "Стойки/заполнение ограждения из ведомости",
      "Ограждение по проекту",
      railingInfillProjectPcs,
      railingInfillReservePercent,
      railingInfillPackagePcs,
      "шт",
      spec.packaging_rules.count_package_unit,
      "Шаг и безопасные просветы не выводятся из длины марша — вводится готовое проектное количество",
    ),
    packagedMaterial(
      "Крепёж и анкеры из проектной ведомости",
      "Крепёж по проекту",
      fastenersProjectPcs,
      fastenersReservePercent,
      fastenersPackagePcs,
      "шт",
      spec.packaging_rules.count_package_unit,
      "Тип, размер, материал, несущую способность и зоны крепления принимает проектировщик",
    ),
    packagedMaterial(
      "Покрытие площадок из проектной ведомости",
      "Площадки по проекту",
      landingFinishProjectM2,
      landingFinishReservePercent,
      landingFinishPackageM2,
      "м²",
      spec.packaging_rules.count_package_unit,
      "Геометрию и несущую конструкцию площадки калькулятор не определяет",
    ),
  ];
  const materials = materialCandidates.filter(
    (material): material is CanonicalMaterialResult => Boolean(material),
  );

  const scenarioTreadCount = includeTreadBlanks === 1 ? treadCount : 0;
  const scenarios = buildTreadScenarios(
    scenarioTreadCount,
    treadReservePercent,
    treadsPerPackagePcs,
  );

  const warnings = [
    "Это геометрия одного прямого марша и закупка по проектной ведомости: несущие элементы, узлы, площадки, повороты, армирование, анкеры и ограждения здесь не проектируются",
  ];
  if (geometryMode === targetModeCode) {
    warnings.push(
      "Число подъёмов подобрано по целевой высоте подступенка; перед закупкой зафиксируйте его в проекте и проверьте все чистовые отметки",
    );
  }
  if (
    comfortStepMm < spec.warnings_rules.comfort_step_min_mm
    || comfortStepMm > spec.warnings_rules.comfort_step_max_mm
  ) {
    warnings.push(
      `Связка размеров требует проверки эргономики: 2h + b = ${roundDisplay(comfortStepMm, 1)} мм`,
    );
  }
  if (angleDeg > spec.warnings_rules.steep_angle_attention_deg) {
    warnings.push(
      `Получен крутой марш ${roundDisplay(angleDeg, 1)}°; допустимость зависит от назначения лестницы и проектных требований`,
    );
  }
  if (
    headroomEstimateAvailable
    && estimatedHeadroomM < spec.warnings_rules.headroom_attention_m
  ) {
    warnings.push(
      `Оценочный габарит прохода ${roundDisplay(estimatedHeadroomM, 3)} м меньше контрольного ориентира ${spec.warnings_rules.headroom_attention_m} м — нужен разрез проекта`,
    );
  }
  if (stringerProjectPcs > 0 && (stringerBlankLengthM <= 0 || stringerStockLengthM <= 0)) {
    warnings.push(
      "Количество косоуров/тетив задано, но длина проектной детали или покупной заготовки не заполнена",
    );
  } else if (stringerProjectPcs > 0 && stringerStockLengthM < stringerBlankLengthM) {
    warnings.push(
      "Покупная заготовка короче проектной детали; составной косоур/тетива без отдельного проектного узла не рассчитан",
    );
  }
  const missingPackages: Array<[number, number, string]> = [
    [includeTreadBlanks === 1 ? treadCount : 0, treadsPerPackagePcs, "Ступени включены, но количество в упаковке не заполнено"],
    [riserProjectPcs, risersPerPackagePcs, "Подступенки заданы, но количество в упаковке не заполнено"],
    [concreteProjectM3, concreteOrderStepM3, "Объём бетона задан, но шаг заказа не заполнен"],
    [rebarProjectKg, rebarPackageKg, "Масса арматуры задана, но закупочный шаг не заполнен"],
    [handrailProjectM, handrailStockLengthM, "Длина поручня задана, но длина покупной заготовки не заполнена"],
    [railingInfillProjectPcs, railingInfillPackagePcs, "Стойки/заполнение заданы, но количество в упаковке не заполнено"],
    [fastenersProjectPcs, fastenersPackagePcs, "Крепёж задан, но количество в упаковке не заполнено"],
    [landingFinishProjectM2, landingFinishPackageM2, "Покрытие площадки задано, но площадь упаковки не заполнена"],
  ];
  for (const [projectQuantity, packageSize, warning] of missingPackages) {
    if (projectQuantity > 0 && packageSize <= 0) warnings.push(warning);
  }
  if (materials.length === 0) warnings.push("Не рассчитана ни одна закупочная позиция");

  const practicalNotes = [
    `Геометрия: ${riserCount} подъёмов × ${roundDisplay(actualRiserHeightMm, 1)} мм, ${treadCount} проступей × ${roundDisplay(treadDepthMm, 1)} мм`,
    headroomEstimateAvailable
      ? `Оценочный габарит прохода по линии уклона: ${roundDisplay(estimatedHeadroomM, 3)} м; подтвердите его по разрезу с чистовыми слоями`
      : "Габарит прохода не проверен: заполните длину проёма и толщину перекрытия или используйте проектный разрез",
    "MIN/REC/MAX относятся только к чистовым заготовкам ступеней; MAX не добавляет скрытый запас сверх введённого пользователем",
    "Г-/П-образные лестницы, площадки и забежные ступени разбивайте на отдельные проектные позиции без условных коэффициентов длины",
  ];

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      geometryMode,
      floorRiseM: roundDisplay(floorRiseM, 3),
      targetRiserHeightMm: roundDisplay(targetRiserHeightMm, 3),
      projectRiserCount,
      riserCount,
      actualRiserHeightMm: roundDisplay(actualRiserHeightMm, 3),
      treadCount,
      treadDepthMm: roundDisplay(treadDepthMm, 3),
      topFloorActsAsTread,
      stairWidthM: roundDisplay(stairWidthM, 3),
      straightRunM: roundDisplay(straightRunM, 3),
      inclineLengthM: roundDisplay(inclineLengthM, 3),
      angleDeg: roundDisplay(angleDeg, 3),
      comfortStepMm: roundDisplay(comfortStepMm, 3),
      openingLengthM: roundDisplay(openingLengthM, 3),
      floorStructureThicknessM: roundDisplay(floorStructureThicknessM, 3),
      headroomEstimateAvailable: headroomEstimateAvailable ? 1 : 0,
      estimatedHeadroomM: roundDisplay(estimatedHeadroomM, 3),
      treadPackages: materialCandidates[0]?.packageInfo?.count ?? 0,
      riserPackages: materialCandidates[1]?.packageInfo?.count ?? 0,
      stringerStockPieces: materialCandidates[2]?.packageInfo?.count ?? 0,
      concreteOrders: materialCandidates[3]?.packageInfo?.count ?? 0,
      rebarPackages: materialCandidates[4]?.packageInfo?.count ?? 0,
      handrailStockPieces: materialCandidates[5]?.packageInfo?.count ?? 0,
      railingInfillPackages: materialCandidates[6]?.packageInfo?.count ?? 0,
      fastenerPackages: materialCandidates[7]?.packageInfo?.count ?? 0,
      landingFinishPackages: materialCandidates[8]?.packageInfo?.count ?? 0,
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
        "Скрытые коэффициенты точности не применяются: геометрия, проектные количества, запасы и фасовки заданы отдельными полями",
      ],
    },
  };
}
