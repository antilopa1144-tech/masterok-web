import type { FactorTable } from "./factors";
import type {
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
  RoofingCanonicalSpec,
} from "./canonical";
import type { ScenarioBundle } from "./scenarios";
import {
  ACCURACY_MODE_LABELS,
  DEFAULT_ACCURACY_MODE,
  type AccuracyMode,
} from "./accuracy";
import { getInputDefault } from "./spec-helpers";
import { roundDisplay } from "./units";

interface RoofingInputs {
  roofAreaMode?: number;
  projectSlopeAreaM2?: number;
  planProjectionAreaM2?: number;
  slopeDeg?: number;
  roofingType?: number;
  primaryCoverageM2?: number;
  primaryReservePercent?: number;
  ridgeProjectM?: number;
  ridgeReservePercent?: number;
  ridgeElementUsefulLengthM?: number;
  valleyProjectM?: number;
  valleyReservePercent?: number;
  valleyElementUsefulLengthM?: number;
  eavesProjectM?: number;
  eavesReservePercent?: number;
  eavesElementUsefulLengthM?: number;
  membraneProjectAreaM2?: number;
  membraneReservePercent?: number;
  membraneRollCoverageM2?: number;
  deckProjectAreaM2?: number;
  deckReservePercent?: number;
  deckSheetAreaM2?: number;
  battenProjectLengthM?: number;
  battenReservePercent?: number;
  battenBoardLengthM?: number;
  counterBattenProjectLengthM?: number;
  counterBattenReservePercent?: number;
  counterBattenBoardLengthM?: number;
  fastenersProjectPcs?: number;
  fastenersReservePercent?: number;
  fastenersPackagePcs?: number;
  snowGuardProjectM?: number;
  snowGuardReservePercent?: number;
  snowGuardSectionUsefulLengthM?: number;
  sealingTapeProjectM?: number;
  sealingTapeReservePercent?: number;
  sealingTapeRollLengthM?: number;
  accuracyMode?: AccuracyMode;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function input(
  spec: RoofingCanonicalSpec,
  inputs: RoofingInputs,
  key: keyof RoofingInputs,
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

function planningQuantity(exactNeed: number, reservePercent: number): number {
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

function buildPrimaryScenarios(
  cleanUnits: number,
  recReservePercent: number,
  maxReserveFloorPercent: number,
  packageLabel: string,
  packageUnit: string,
): ScenarioBundle {
  const reserves = {
    MIN: 0,
    REC: recReservePercent,
    MAX: Math.max(recReservePercent, maxReserveFloorPercent),
  } as const;

  return (Object.keys(reserves) as Array<keyof typeof reserves>).reduce((acc, scenario) => {
    const reservePercent = reserves[scenario];
    const exactNeed = planningQuantity(cleanUnits, reservePercent);
    const purchaseQuantity = roundUpUnits(exactNeed, 1);
    acc[scenario] = {
      exact_need: roundDisplay(exactNeed, 6),
      purchase_quantity: purchaseQuantity,
      leftover: roundDisplay(purchaseQuantity - exactNeed, 6),
      assumptions: [
        "primary_material:roof_covering",
        `reserve_percent:${reservePercent}`,
      ],
      key_factors: {
        field_multiplier: 1,
        reserve_percent: reservePercent,
      },
      buy_plan: {
        package_label: packageLabel,
        package_size: 1,
        packages_count: purchaseQuantity,
        unit: packageUnit,
      },
    };
    return acc;
  }, {} as ScenarioBundle);
}

export function computeCanonicalRoofing(
  spec: RoofingCanonicalSpec,
  inputs: RoofingInputs,
  _factorTable: FactorTable,
): CanonicalCalculatorResult {
  const accuracyMode = inputs.accuracyMode ?? DEFAULT_ACCURACY_MODE;

  const roofAreaMode = Math.round(input(spec, inputs, "roofAreaMode", 0, 0, 1));
  const projectSlopeAreaM2 = input(spec, inputs, "projectSlopeAreaM2", 100, 1, 10000);
  const planProjectionAreaM2 = input(spec, inputs, "planProjectionAreaM2", 80, 1, 10000);
  const slopeDeg = input(spec, inputs, "slopeDeg", 30, 1, 75);
  const slopeFactor = 1 / Math.cos((slopeDeg * Math.PI) / 180);
  const selectedSlopeAreaM2 = roofAreaMode === 1
    ? planProjectionAreaM2 * slopeFactor
    : projectSlopeAreaM2;

  const roofingType = Math.round(input(spec, inputs, "roofingType", 0, 0, 5));
  const roofingTypeSpec = spec.normative_formula.roofing_types.find((item) => item.id === roofingType)
    ?? spec.normative_formula.roofing_types[0];
  const primaryPackageUnit = spec.material_rules.primary_package_units[String(roofingType)] ?? "единиц";
  const primaryCoverageM2 = input(spec, inputs, "primaryCoverageM2", 0, 0, 1000);
  const primaryReservePercent = input(spec, inputs, "primaryReservePercent", 10, 0, 50);

  const ridgeProjectM = input(spec, inputs, "ridgeProjectM", 0, 0, 10000);
  const ridgeReservePercent = input(spec, inputs, "ridgeReservePercent", 5, 0, 30);
  const ridgeElementUsefulLengthM = input(spec, inputs, "ridgeElementUsefulLengthM", 0, 0, 100);
  const valleyProjectM = input(spec, inputs, "valleyProjectM", 0, 0, 10000);
  const valleyReservePercent = input(spec, inputs, "valleyReservePercent", 10, 0, 50);
  const valleyElementUsefulLengthM = input(spec, inputs, "valleyElementUsefulLengthM", 0, 0, 100);
  const eavesProjectM = input(spec, inputs, "eavesProjectM", 0, 0, 10000);
  const eavesReservePercent = input(spec, inputs, "eavesReservePercent", 5, 0, 30);
  const eavesElementUsefulLengthM = input(spec, inputs, "eavesElementUsefulLengthM", 0, 0, 100);

  const membraneProjectAreaM2 = input(spec, inputs, "membraneProjectAreaM2", 0, 0, 10000);
  const membraneReservePercent = input(spec, inputs, "membraneReservePercent", 15, 0, 50);
  const membraneRollCoverageM2 = input(spec, inputs, "membraneRollCoverageM2", 0, 0, 1000);
  const deckProjectAreaM2 = input(spec, inputs, "deckProjectAreaM2", 0, 0, 10000);
  const deckReservePercent = input(spec, inputs, "deckReservePercent", 10, 0, 50);
  const deckSheetAreaM2 = input(spec, inputs, "deckSheetAreaM2", 0, 0, 100);

  const battenProjectLengthM = input(spec, inputs, "battenProjectLengthM", 0, 0, 100000);
  const battenReservePercent = input(spec, inputs, "battenReservePercent", 5, 0, 30);
  const battenBoardLengthM = input(spec, inputs, "battenBoardLengthM", 0, 0, 20);
  const counterBattenProjectLengthM = input(spec, inputs, "counterBattenProjectLengthM", 0, 0, 100000);
  const counterBattenReservePercent = input(spec, inputs, "counterBattenReservePercent", 5, 0, 30);
  const counterBattenBoardLengthM = input(spec, inputs, "counterBattenBoardLengthM", 0, 0, 20);

  const fastenersProjectPcs = input(spec, inputs, "fastenersProjectPcs", 0, 0, 1000000);
  const fastenersReservePercent = input(spec, inputs, "fastenersReservePercent", 5, 0, 30);
  const fastenersPackagePcs = input(spec, inputs, "fastenersPackagePcs", 0, 0, 100000);
  const snowGuardProjectM = input(spec, inputs, "snowGuardProjectM", 0, 0, 10000);
  const snowGuardReservePercent = input(spec, inputs, "snowGuardReservePercent", 5, 0, 30);
  const snowGuardSectionUsefulLengthM = input(spec, inputs, "snowGuardSectionUsefulLengthM", 0, 0, 100);
  const sealingTapeProjectM = input(spec, inputs, "sealingTapeProjectM", 0, 0, 100000);
  const sealingTapeReservePercent = input(spec, inputs, "sealingTapeReservePercent", 10, 0, 50);
  const sealingTapeRollLengthM = input(spec, inputs, "sealingTapeRollLengthM", 0, 0, 1000);

  const materials: CanonicalMaterialResult[] = [];

  const primary = packagedMaterial(
    `${roofingTypeSpec.label} — выбранный товар`,
    "Основное покрытие",
    selectedSlopeAreaM2,
    primaryReservePercent,
    primaryCoverageM2,
    "м²",
    primaryPackageUnit,
    "Полезную площадь одной покупной единицы вводят по маркировке и инструкции выбранного товара с учётом штатных нахлёстов",
  );
  if (primary) materials.push(primary);

  const projectLines: Array<CanonicalMaterialResult | undefined> = [
    packagedMaterial(
      "Коньковый элемент из проектной ведомости",
      "Доборные элементы",
      ridgeProjectM,
      ridgeReservePercent,
      ridgeElementUsefulLengthM,
      "м",
      "шт",
      "Полезную длину элемента вводят после учёта штатного нахлёста выбранной системы",
    ),
    packagedMaterial(
      "Ендовный элемент из проектной ведомости",
      "Доборные элементы",
      valleyProjectM,
      valleyReservePercent,
      valleyElementUsefulLengthM,
      "м",
      "шт",
      "Число, длину, слои и узлы ендов переносят из проекта кровли",
    ),
    packagedMaterial(
      "Карнизная планка из проектной ведомости",
      "Доборные элементы",
      eavesProjectM,
      eavesReservePercent,
      eavesElementUsefulLengthM,
      "м",
      "шт",
      "Общую длину карнизов и полезную длину планки берут из проекта и паспорта системы",
    ),
    packagedMaterial(
      "Кровельная мембрана по проекту",
      "Изоляция",
      membraneProjectAreaM2,
      membraneReservePercent,
      membraneRollCoverageM2,
      "м²",
      "рулонов",
      "Тип мембраны, стороны монтажа, нахлёсты и вентиляционные зазоры калькулятор не назначает",
    ),
    packagedMaterial(
      "Сплошное листовое основание по проекту",
      "Основание",
      deckProjectAreaM2,
      deckReservePercent,
      deckSheetAreaM2,
      "м²",
      "листов",
      "Материал, толщину, шаг опор, зазоры и схему стыков принимают по проекту кровельной системы",
    ),
    packagedMaterial(
      "Обрешётка — одна позиция пиломатериала из проекта",
      "Пиломатериал",
      battenProjectLengthM,
      battenReservePercent,
      battenBoardLengthM,
      "м",
      "досок",
      "Сечение, сорт, шаг и раскрой должны соответствовать проекту и выбранному покрытию",
    ),
    packagedMaterial(
      "Контробрешётка — одна позиция пиломатериала из проекта",
      "Пиломатериал",
      counterBattenProjectLengthM,
      counterBattenReservePercent,
      counterBattenBoardLengthM,
      "м",
      "брусков",
      "Сечение, длины и вентиляционный зазор переносят из проекта",
    ),
    packagedMaterial(
      "Крепёж из проектной ведомости",
      "Крепёж",
      fastenersProjectPcs,
      fastenersReservePercent,
      fastenersPackagePcs,
      "шт",
      "упаковок",
      "Тип, размер, материал, покрытие, шаг и зоны крепления калькулятор не назначает",
    ),
    packagedMaterial(
      "Снегозадержание из проектной ведомости",
      "Безопасность",
      snowGuardProjectM,
      snowGuardReservePercent,
      snowGuardSectionUsefulLengthM,
      "м",
      "секций",
      "Ряды, опоры и зоны снегозадержания определяют по снеговым нагрузкам, геометрии и проекту",
    ),
    packagedMaterial(
      "Системная лента для мембран и примыканий",
      "Герметизация",
      sealingTapeProjectM,
      sealingTapeReservePercent,
      sealingTapeRollLengthM,
      "м",
      "рулонов",
      "Длину стыков и совместимость ленты переносят из раскладки и инструкции системы",
    ),
  ];
  for (const material of projectLines) {
    if (material) materials.push(material);
  }

  const cleanPrimaryUnits = primaryCoverageM2 > 0
    ? selectedSlopeAreaM2 / primaryCoverageM2
    : 0;
  const primaryPackageLabel = `roof-covering-${roofingType}`;
  const scenarios = buildPrimaryScenarios(
    cleanPrimaryUnits,
    primaryReservePercent,
    spec.scenario_policy.max_reserve_floor_percent,
    primaryPackageLabel,
    primaryPackageUnit,
  );

  const warnings: string[] = [
    "Это закупочный расчёт по принятому проекту: стропила, прогоны, обрешётка, кровельный пирог, нагрузки, водоотвод и снегозадержание здесь не проектируются",
  ];
  if (roofAreaMode === 1) {
    warnings.push(
      "Площадь по проекции и уклону допустима только для простой одно- или двухскатной крыши с одинаковым уклоном; для сложной крыши введите сумму площадей скатов из проекта",
    );
  }
  if (primaryCoverageM2 <= 0) {
    warnings.push("Основное покрытие не рассчитано: заполните полезную площадь одной покупной единицы выбранного товара");
  }

  const missingPackageWarnings: Array<[number, number, string]> = [
    [ridgeProjectM, ridgeElementUsefulLengthM, "Длина конька задана, но полезная длина одного конькового элемента не заполнена"],
    [valleyProjectM, valleyElementUsefulLengthM, "Длина ендов задана, но полезная длина одного ендовного элемента не заполнена"],
    [eavesProjectM, eavesElementUsefulLengthM, "Длина карнизов задана, но полезная длина одной планки не заполнена"],
    [membraneProjectAreaM2, membraneRollCoverageM2, "Площадь мембраны задана, но полезная площадь рулона не заполнена"],
    [deckProjectAreaM2, deckSheetAreaM2, "Площадь сплошного основания задана, но площадь одного листа не заполнена"],
    [battenProjectLengthM, battenBoardLengthM, "Длина обрешётки задана, но длина покупной доски не заполнена"],
    [counterBattenProjectLengthM, counterBattenBoardLengthM, "Длина контробрешётки задана, но длина покупного бруска не заполнена"],
    [fastenersProjectPcs, fastenersPackagePcs, "Количество крепежа задано, но количество в упаковке не заполнено"],
    [snowGuardProjectM, snowGuardSectionUsefulLengthM, "Длина снегозадержания задана, но полезная длина одной секции не заполнена"],
    [sealingTapeProjectM, sealingTapeRollLengthM, "Длина ленты задана, но длина одного рулона не заполнена"],
  ];
  for (const [projectQuantity, packageSize, warning] of missingPackageWarnings) {
    if (projectQuantity > 0 && packageSize <= 0) warnings.push(warning);
  }
  if (materials.length === 0) {
    warnings.push("Не рассчитана ни одна закупочная позиция");
  }

  const practicalNotes = [
    roofAreaMode === 0
      ? "Используется суммарная площадь скатов из проекта или обмера — предпочтительный режим для закупки"
      : `Для простой крыши площадь скатов получена как ${roundDisplay(planProjectionAreaM2, 3)} м² / cos(${roundDisplay(slopeDeg, 1)}°)`,
    "MIN/REC/MAX относятся только к основному покрытию; остальные позиции показывают собственные проектное количество, явный запас и округление по фактической фасовке",
    "Разные типоразмеры листов, планок, досок и крепежа считайте отдельными запусками и сверяйте с раскладкой",
  ];

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      roofAreaMode,
      projectSlopeAreaM2: roundDisplay(projectSlopeAreaM2, 3),
      planProjectionAreaM2: roundDisplay(planProjectionAreaM2, 3),
      slopeDeg: roundDisplay(slopeDeg, 3),
      slopeFactor: roundDisplay(slopeFactor, 6),
      selectedSlopeAreaM2: roundDisplay(selectedSlopeAreaM2, 3),
      roofingType,
      primaryCoverageM2: roundDisplay(primaryCoverageM2, 3),
      primaryUnits: primary?.packageInfo?.count ?? 0,
      primaryPurchaseAreaM2: primary?.purchaseQty ?? 0,
      ridgeElements: projectLines[0]?.packageInfo?.count ?? 0,
      valleyElements: projectLines[1]?.packageInfo?.count ?? 0,
      eavesElements: projectLines[2]?.packageInfo?.count ?? 0,
      membraneRolls: projectLines[3]?.packageInfo?.count ?? 0,
      deckSheets: projectLines[4]?.packageInfo?.count ?? 0,
      battenBoards: projectLines[5]?.packageInfo?.count ?? 0,
      counterBattenBoards: projectLines[6]?.packageInfo?.count ?? 0,
      fastenerPackages: projectLines[7]?.packageInfo?.count ?? 0,
      snowGuardSections: projectLines[8]?.packageInfo?.count ?? 0,
      sealingTapeRolls: projectLines[9]?.packageInfo?.count ?? 0,
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
