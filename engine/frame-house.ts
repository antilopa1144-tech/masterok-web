import type { FactorTable } from "./factors";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  FrameHouseCanonicalSpec,
} from "./canonical";
import type { ScenarioBundle } from "./scenarios";
import {
  ACCURACY_MODE_LABELS,
  DEFAULT_ACCURACY_MODE,
  type AccuracyMode,
} from "./accuracy";
import { getInputDefault } from "./spec-helpers";
import { roundDisplay } from "./units";

interface FrameHouseInputs {
  wallLength?: number;
  wallHeight?: number;
  openingsArea?: number;
  surfaceAreaBasis?: number;
  framingProjectLengthM?: number;
  framingReservePercent?: number;
  framingBoardLengthM?: number;
  outerSheathingEnabled?: number;
  outerSheetAreaM2?: number;
  outerSheathingLayers?: number;
  outerSheathingReservePercent?: number;
  innerSheathingEnabled?: number;
  innerSheetAreaM2?: number;
  innerSheathingLayers?: number;
  innerSheathingReservePercent?: number;
  insulationEnabled?: number;
  insulationPackageAreaM2?: number;
  insulationLayers?: number;
  insulationReservePercent?: number;
  vaporBarrierEnabled?: number;
  vaporRollAreaM2?: number;
  vaporLayers?: number;
  vaporReservePercent?: number;
  windBarrierEnabled?: number;
  windRollAreaM2?: number;
  windLayers?: number;
  windReservePercent?: number;
  tapeProjectM?: number;
  tapeReservePercent?: number;
  tapeRollLengthM?: number;
  sheathingFastenersProjectPcs?: number;
  sheathingFastenersReservePercent?: number;
  sheathingFastenersPackagePcs?: number;
  framingFastenersProjectPcs?: number;
  framingFastenersReservePercent?: number;
  framingFastenersPackagePcs?: number;
  accuracyMode?: AccuracyMode;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function input(
  spec: FrameHouseCanonicalSpec,
  inputs: FrameHouseInputs,
  key: keyof FrameHouseInputs,
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

function roundUpUnits(exactNeed: number, unitSize: number): number {
  if (exactNeed <= 0 || unitSize <= 0) return 0;
  return Math.ceil((exactNeed - Number.EPSILON) / unitSize);
}

function planningQuantity(exactNeed: number, reservePercent: number): number {
  return exactNeed * (1 + reservePercent / 100);
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
  const withReserve = planningQuantity(exactNeed, reservePercent);
  const packageCount = roundUpUnits(withReserve, packageSize);
  return {
    name,
    subtitle,
    quantity: roundDisplay(exactNeed, 3),
    unit,
    withReserve: roundDisplay(withReserve, 3),
    purchaseQty: roundDisplay(packageCount * packageSize, 3),
    packageInfo: { count: packageCount, size: packageSize, packageUnit },
    category,
  };
}

function buildOuterSheetScenarios(
  cleanSheets: number,
  recReservePercent: number,
  maxReserveFloorPercent: number,
): ScenarioBundle {
  const reserves = {
    MIN: 0,
    REC: recReservePercent,
    MAX: Math.max(recReservePercent, maxReserveFloorPercent),
  } as const;

  return (Object.keys(reserves) as Array<keyof typeof reserves>).reduce((acc, scenario) => {
    const reservePercent = reserves[scenario];
    const exactNeed = planningQuantity(cleanSheets, reservePercent);
    const purchaseQuantity = Math.ceil(exactNeed - Number.EPSILON);
    acc[scenario] = {
      exact_need: roundDisplay(exactNeed, 6),
      purchase_quantity: purchaseQuantity,
      leftover: roundDisplay(purchaseQuantity - exactNeed, 6),
      assumptions: [
        "primary_material:outer_sheet_sheathing",
        `reserve_percent:${reservePercent}`,
      ],
      key_factors: {
        field_multiplier: 1,
        reserve_percent: reservePercent,
      },
      buy_plan: {
        package_label: "outer-sheet",
        package_size: 1,
        packages_count: purchaseQuantity,
        unit: "листов",
      },
    };
    return acc;
  }, {} as ScenarioBundle);
}

export function computeCanonicalFrameHouse(
  spec: FrameHouseCanonicalSpec,
  inputs: FrameHouseInputs,
  _factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  const wallLength = input(spec, inputs, "wallLength", 30, 1, 200);
  const wallHeight = input(spec, inputs, "wallHeight", 2.7, 1, 8);
  const openingsAreaInput = input(spec, inputs, "openingsArea", 10, 0, 500);
  const surfaceAreaBasis = Math.round(input(spec, inputs, "surfaceAreaBasis", 0, 0, 1));

  const grossWallArea = wallLength * wallHeight;
  const openingsArea = Math.min(openingsAreaInput, grossWallArea);
  const netWallArea = grossWallArea - openingsArea;
  const selectedSurfaceArea = surfaceAreaBasis === 1 ? netWallArea : grossWallArea;

  const framingProjectLengthM = input(spec, inputs, "framingProjectLengthM", 0, 0, 100000);
  const framingReservePercent = input(spec, inputs, "framingReservePercent", 5, 0, 30);
  const framingBoardLengthM = input(spec, inputs, "framingBoardLengthM", 6, 0.1, 20);

  const outerSheathingEnabled = Math.round(input(spec, inputs, "outerSheathingEnabled", 1, 0, 1));
  const outerSheetAreaM2 = input(spec, inputs, "outerSheetAreaM2", 3.125, 0.1, 20);
  const outerSheathingLayers = Math.round(input(spec, inputs, "outerSheathingLayers", 1, 1, 4));
  const outerSheathingReservePercent = input(spec, inputs, "outerSheathingReservePercent", 10, 0, 50);

  const innerSheathingEnabled = Math.round(input(spec, inputs, "innerSheathingEnabled", 0, 0, 1));
  const innerSheetAreaM2 = input(spec, inputs, "innerSheetAreaM2", 3, 0.1, 20);
  const innerSheathingLayers = Math.round(input(spec, inputs, "innerSheathingLayers", 1, 1, 4));
  const innerSheathingReservePercent = input(spec, inputs, "innerSheathingReservePercent", 10, 0, 50);

  const insulationEnabled = Math.round(input(spec, inputs, "insulationEnabled", 0, 0, 1));
  const insulationPackageAreaM2 = input(spec, inputs, "insulationPackageAreaM2", 0, 0, 100);
  const insulationLayers = Math.round(input(spec, inputs, "insulationLayers", 1, 1, 10));
  const insulationReservePercent = input(spec, inputs, "insulationReservePercent", 5, 0, 30);

  const vaporBarrierEnabled = Math.round(input(spec, inputs, "vaporBarrierEnabled", 0, 0, 1));
  const vaporRollAreaM2 = input(spec, inputs, "vaporRollAreaM2", 0, 0, 500);
  const vaporLayers = Math.round(input(spec, inputs, "vaporLayers", 1, 1, 5));
  const vaporReservePercent = input(spec, inputs, "vaporReservePercent", 15, 0, 50);

  const windBarrierEnabled = Math.round(input(spec, inputs, "windBarrierEnabled", 0, 0, 1));
  const windRollAreaM2 = input(spec, inputs, "windRollAreaM2", 0, 0, 500);
  const windLayers = Math.round(input(spec, inputs, "windLayers", 1, 1, 5));
  const windReservePercent = input(spec, inputs, "windReservePercent", 15, 0, 50);

  const tapeProjectM = input(spec, inputs, "tapeProjectM", 0, 0, 100000);
  const tapeReservePercent = input(spec, inputs, "tapeReservePercent", 10, 0, 50);
  const tapeRollLengthM = input(spec, inputs, "tapeRollLengthM", 0, 0, 1000);

  const sheathingFastenersProjectPcs = input(spec, inputs, "sheathingFastenersProjectPcs", 0, 0, 1000000);
  const sheathingFastenersReservePercent = input(spec, inputs, "sheathingFastenersReservePercent", 5, 0, 30);
  const sheathingFastenersPackagePcs = input(spec, inputs, "sheathingFastenersPackagePcs", 0, 0, 100000);
  const framingFastenersProjectPcs = input(spec, inputs, "framingFastenersProjectPcs", 0, 0, 1000000);
  const framingFastenersReservePercent = input(spec, inputs, "framingFastenersReservePercent", 5, 0, 30);
  const framingFastenersPackagePcs = input(spec, inputs, "framingFastenersPackagePcs", 0, 0, 100000);

  const materials: CanonicalMaterialResult[] = [];

  const framing = packagedMaterial(
    "Конструкционная доска — одна позиция из проектной ведомости",
    "Каркас по проекту",
    framingProjectLengthM,
    framingReservePercent,
    framingBoardLengthM,
    "м",
    "досок",
    "Сечение, сорт, класс прочности и длины элементов должны совпадать с проектной спецификацией; раскрой проверяют отдельно",
  );
  if (framing) materials.push(framing);

  const outerExactAreaM2 = outerSheathingEnabled ? selectedSurfaceArea * outerSheathingLayers : 0;
  const outer = packagedMaterial(
    "Наружная листовая обшивка по проекту",
    "Обшивка",
    outerExactAreaM2,
    outerSheathingReservePercent,
    outerSheetAreaM2,
    "м²",
    "листов",
    "Формат, класс, толщину, ориентацию и схему стыков берут из проекта и маркировки выбранного листа",
  );
  if (outer) materials.push(outer);

  const innerExactAreaM2 = innerSheathingEnabled ? selectedSurfaceArea * innerSheathingLayers : 0;
  const inner = packagedMaterial(
    "Внутренняя листовая обшивка по проекту",
    "Обшивка",
    innerExactAreaM2,
    innerSheathingReservePercent,
    innerSheetAreaM2,
    "м²",
    "листов",
    "Материал, число слоёв, формат листа и крепление должны соответствовать принятой системе стены",
  );
  if (inner) materials.push(inner);

  const insulationExactAreaM2 = insulationEnabled ? selectedSurfaceArea * insulationLayers : 0;
  const insulation = packagedMaterial(
    "Утеплитель принятой проектной толщины",
    "Утепление",
    insulationExactAreaM2,
    insulationReservePercent,
    insulationPackageAreaM2,
    "м²",
    "упаковок",
    "Площадь упаковки вводят для выбранного материала и толщины; калькулятор не выполняет теплотехнический подбор",
  );
  if (insulation) materials.push(insulation);

  const vaporExactAreaM2 = vaporBarrierEnabled ? selectedSurfaceArea * vaporLayers : 0;
  const vapor = packagedMaterial(
    "Пароизоляционный слой по проекту",
    "Мембраны",
    vaporExactAreaM2,
    vaporReservePercent,
    vaporRollAreaM2,
    "м²",
    "рулонов",
    "Тип, сторона монтажа, нахлёсты и герметизация — по проекту и инструкции принятой системы",
  );
  if (vapor) materials.push(vapor);

  const windExactAreaM2 = windBarrierEnabled ? selectedSurfaceArea * windLayers : 0;
  const wind = packagedMaterial(
    "Наружная защитная мембрана по проекту",
    "Мембраны",
    windExactAreaM2,
    windReservePercent,
    windRollAreaM2,
    "м²",
    "рулонов",
    "Назначение, паропроницаемость, ориентация и вентиляционный зазор проверяются по проекту стены",
  );
  if (wind) materials.push(wind);

  const tape = packagedMaterial(
    "Системная лента для стыков и примыканий",
    "Герметизация",
    tapeProjectM,
    tapeReservePercent,
    tapeRollLengthM,
    "м",
    "рулонов",
    "Длину стыков переносят из раскладки мембран; совместимость ленты подтверждает производитель системы",
  );
  if (tape) materials.push(tape);

  const sheathingFasteners = packagedMaterial(
    "Крепёж листовой обшивки из проектной ведомости",
    "Крепёж",
    sheathingFastenersProjectPcs,
    sheathingFastenersReservePercent,
    sheathingFastenersPackagePcs,
    "шт",
    "упаковок",
    "Тип, диаметр, длина, шаг и краевые расстояния калькулятор не назначает",
  );
  if (sheathingFasteners) materials.push(sheathingFasteners);

  const framingFasteners = packagedMaterial(
    "Крепёж соединений каркаса из проектной ведомости",
    "Крепёж",
    framingFastenersProjectPcs,
    framingFastenersReservePercent,
    framingFastenersPackagePcs,
    "шт",
    "упаковок",
    "Гвозди, саморезы, пластины, анкеры и узлы принимаются только по рабочей документации",
  );
  if (framingFasteners) materials.push(framingFasteners);

  const cleanOuterSheets = outerSheathingEnabled && outerSheetAreaM2 > 0
    ? outerExactAreaM2 / outerSheetAreaM2
    : 0;
  const scenarios = buildOuterSheetScenarios(
    cleanOuterSheets,
    outerSheathingReservePercent,
    spec.scenario_policy.max_reserve_floor_percent,
  );

  const warnings: string[] = [
    "Это закупочный расчёт по принятому проекту: несущая схема, шаг и сечение стоек, перемычки, укосины, узлы, крепёж и состав стены здесь не проектируются",
  ];
  if (openingsAreaInput > grossWallArea) {
    warnings.push("Площадь проёмов превышает валовую площадь стен и ограничена площадью стен");
  }
  if (framingProjectLengthM <= 0) {
    warnings.push("Пиломатериал каркаса не добавлен: перенесите длину одной позиции из проектной ведомости и повторите расчёт для каждого сечения");
  }
  if (insulationEnabled && insulationPackageAreaM2 <= 0) {
    warnings.push("Утеплитель включён, но площадь упаковки выбранного товара не заполнена");
  }
  if (vaporBarrierEnabled && vaporRollAreaM2 <= 0) {
    warnings.push("Пароизоляция включена, но полезная площадь рулона не заполнена");
  }
  if (windBarrierEnabled && windRollAreaM2 <= 0) {
    warnings.push("Наружная мембрана включена, но полезная площадь рулона не заполнена");
  }
  if (tapeProjectM > 0 && tapeRollLengthM <= 0) {
    warnings.push("Длина ленты задана, но длина одного рулона не заполнена");
  }
  if (sheathingFastenersProjectPcs > 0 && sheathingFastenersPackagePcs <= 0) {
    warnings.push("Крепёж обшивки задан, но количество в упаковке не заполнено");
  }
  if (framingFastenersProjectPcs > 0 && framingFastenersPackagePcs <= 0) {
    warnings.push("Крепёж каркаса задан, но количество в упаковке не заполнено");
  }
  if (materials.length === 0) {
    warnings.push("Не выбрана ни одна закупочная позиция");
  }

  const practicalNotes = [
    surfaceAreaBasis === 1
      ? "Для материалов используется чистая площадь после вычитания проёмов; применяйте её только если раскладка подтверждает использование обрезков"
      : "Для материалов используется валовая площадь стен без вычитания проёмов — консервативный вариант до готовой раскладки",
    "MIN/REC/MAX относятся только к наружной листовой обшивке; остальные позиции показывают собственные точную потребность, явный запас и округление по упаковке",
    "Разные сечения и длины пиломатериала считайте отдельными запусками: общий метраж не заменяет карту раскроя",
  ];

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      wallLength: roundDisplay(wallLength, 3),
      wallHeight: roundDisplay(wallHeight, 3),
      openingsAreaInput: roundDisplay(openingsAreaInput, 3),
      openingsArea: roundDisplay(openingsArea, 3),
      grossWallArea: roundDisplay(grossWallArea, 3),
      netWallArea: roundDisplay(netWallArea, 3),
      selectedSurfaceArea: roundDisplay(selectedSurfaceArea, 3),
      surfaceAreaBasis,
      framingProjectLengthM: roundDisplay(framingProjectLengthM, 3),
      framingPurchaseBoards: framing?.packageInfo?.count ?? 0,
      framingPurchaseM: framing?.purchaseQty ?? 0,
      outerSheathingEnabled,
      outerExactAreaM2: roundDisplay(outerExactAreaM2, 3),
      outerSheets: outer?.packageInfo?.count ?? 0,
      outerPurchaseAreaM2: outer?.purchaseQty ?? 0,
      innerSheathingEnabled,
      innerExactAreaM2: roundDisplay(innerExactAreaM2, 3),
      innerSheets: inner?.packageInfo?.count ?? 0,
      innerPurchaseAreaM2: inner?.purchaseQty ?? 0,
      insulationEnabled,
      insulationExactAreaM2: roundDisplay(insulationExactAreaM2, 3),
      insulationPackages: insulation?.packageInfo?.count ?? 0,
      vaporBarrierEnabled,
      vaporRolls: vapor?.packageInfo?.count ?? 0,
      windBarrierEnabled,
      windRolls: wind?.packageInfo?.count ?? 0,
      tapeRolls: tape?.packageInfo?.count ?? 0,
      sheathingFastenerPackages: sheathingFasteners?.packageInfo?.count ?? 0,
      framingFastenerPackages: framingFasteners?.packageInfo?.count ?? 0,
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
        "Скрытые коэффициенты точности не применяются: проектные количества, запасы и фасовки задаются отдельными полями",
      ],
    },
  };
}
