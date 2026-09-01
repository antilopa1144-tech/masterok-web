import type {
  CalculatorDefinition,
  CalculatorScenario,
  MaterialResult,
} from "../types";
import { withSiteMetaTitle } from "../meta";
import {
  ACCURACY_MODE_LABELS,
  DEFAULT_ACCURACY_MODE,
  type AccuracyMode,
} from "../../../../engine/accuracy";
import ceilingCassetteSpec from "../../../../configs/calculators/ceiling-cassette-canonical.v1.json";

const WEB_FORMULA_VERSION = "ceiling-cassette-web-layout-v1";

const RESERVE_OPTIONS = [
  { value: 0, label: "0% — без запаса" },
  { value: 3, label: "3%" },
  { value: 5, label: "5%" },
  { value: 7, label: "7%" },
  { value: 10, label: "10%" },
  { value: 15, label: "15%" },
  { value: 20, label: "20%" },
  { value: 25, label: "25%" },
  { value: 30, label: "30%" },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const clampInteger = (value: number, min: number, max: number): number =>
  Math.round(clamp(value, min, max));

const readNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const round = (value: number, digits = 3): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const ceilPositive = (value: number): number =>
  value > 0 ? Math.ceil(value - 1e-9) : 0;

const applyReserve = (value: number, reservePercent: number): number =>
  round(value * (1 + reservePercent / 100), 6);

const formatRuNumber = (value: number): string =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(value);

const plural = (
  value: number,
  one: string,
  few: string,
  many: string,
): string => {
  const absolute = Math.abs(value) % 100;
  const last = absolute % 10;
  if (absolute > 10 && absolute < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
};

interface AxisLayout {
  positions: number;
  fullModules: number;
  borderCutMm: number;
}

const calculateBalancedAxis = (
  fieldLengthM: number,
  moduleMm: number,
): AxisLayout => {
  const fieldMm = fieldLengthM * 1000;
  const completeModules = Math.floor(fieldMm / moduleMm + 1e-9);
  const remainderMm = round(fieldMm - completeModules * moduleMm, 6);

  if (Math.abs(remainderMm) < 1e-6) {
    return {
      positions: completeModules,
      fullModules: completeModules,
      borderCutMm: 0,
    };
  }

  if (completeModules === 0) {
    return {
      positions: 1,
      fullModules: 0,
      borderCutMm: round(fieldMm, 3),
    };
  }

  const fullModules = completeModules - 1;
  return {
    positions: fullModules + 2,
    fullModules,
    borderCutMm: round((fieldMm - fullModules * moduleMm) / 2, 3),
  };
};

interface LinearPurchase {
  requiredLengthM: number;
  pieces: number;
  purchaseLengthM: number;
  leftoverLengthM: number;
}

const calculateLinearPurchase = (
  projectLengthM: number,
  reservePercent: number,
  pieceLengthM: number,
): LinearPurchase => {
  const requiredLengthM = applyReserve(projectLengthM, reservePercent);
  const pieces = ceilPositive(requiredLengthM / pieceLengthM);
  const purchaseLengthM = round(pieces * pieceLengthM, 6);
  return {
    requiredLengthM,
    pieces,
    purchaseLengthM,
    leftoverLengthM: round(
      Math.max(0, purchaseLengthM - requiredLengthM),
      6,
    ),
  };
};

interface CountPurchase {
  requiredCount: number;
  packs: number;
  purchaseCount: number;
}

const calculateCountPurchase = (
  projectCount: number,
  reservePercent: number,
  itemsPerPack: number,
): CountPurchase => {
  const requiredCount = ceilPositive(
    projectCount * (1 + reservePercent / 100),
  );
  const packs = ceilPositive(requiredCount / itemsPerPack);
  return {
    requiredCount,
    packs,
    purchaseCount: packs * itemsPerPack,
  };
};

export const ceilingCassetteDef: CalculatorDefinition = {
  id: "ceilings_cassette",
  slug: "kassetnyi-potolok",
  title: "Калькулятор кассетного потолка",
  h1: "Калькулятор кассетного потолка — раскладка и проектные материалы",
  description:
    "Рассчитайте кассеты по фактическому модулю простой сетки или перенесите готовую ведомость, затем добавьте только подтверждённые системой профили и подвесы.",
  metaTitle: withSiteMetaTitle(
    "Калькулятор кассетного потолка: раскладка и закупка",
  ),
  metaDescription:
    "Бесплатный калькулятор кассетного потолка: рассчитайте модульную сетку, симметричные крайние подрезки, упаковки и подтверждённые проектом комплектующие.",
  category: "ceiling",
  categorySlug: "potolki",
  tags: [
    "кассетный потолок",
    "расчёт кассет",
    "модуль потолка",
    "раскладка кассет",
    "проект потолка",
  ],
  popularity: 58,
  complexity: 3,
  fields: [
    {
      key: "inputMode",
      label: "Источник количества кассет",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Прямоугольник — оценить модульную сетку" },
        { value: 1, label: "Готовая ведомость — ввести число кассет" },
      ],
      hint:
        "Простой режим подходит для одного прямоугольного поля с одинаковым модулем. Для ниш, колонн, диагонали, нескольких типоразмеров, светильников и сложного контура перенесите готовое число изделий из раскладки.",
      fullWidth: true,
    },
    {
      key: "ceilingLengthM",
      label: "Длина потолочного поля",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 100,
      step: 0.01,
      defaultValue: 5,
      hint:
        "Чистый размер одного прямоугольного поля. Ниши, короба, колонны и разрывы требуют отдельной карты раскладки.",
      group: "Простая геометрия",
      hideIf: { key: "inputMode", op: "eq", value: 1 },
    },
    {
      key: "ceilingWidthM",
      label: "Ширина потолочного поля",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 100,
      step: 0.01,
      defaultValue: 4,
      hint:
        "Второй чистый размер поля. Калькулятор симметрично распределяет крайние подрезки по обеим осям.",
      group: "Простая геометрия",
      hideIf: { key: "inputMode", op: "eq", value: 1 },
    },
    {
      key: "cassetteModuleLengthMm",
      label: "Модуль вдоль длины",
      type: "number",
      unit: "мм",
      min: 100,
      max: 3000,
      step: 1,
      defaultValue: 600,
      hint:
        "Введите повторяющийся монтажный модуль системы, а не только лицевой размер кассеты. Например, изделие 595×595 мм обычно работает в сетке с модулем 600×600 мм.",
      group: "Простая геометрия",
      hideIf: { key: "inputMode", op: "eq", value: 1 },
    },
    {
      key: "cassetteModuleWidthMm",
      label: "Модуль вдоль ширины",
      type: "number",
      unit: "мм",
      min: 100,
      max: 3000,
      step: 1,
      defaultValue: 600,
      hint:
        "Для прямоугольных кассет два модуля могут различаться. Ориентацию изделия возьмите из согласованной раскладки.",
      group: "Простая геометрия",
      hideIf: { key: "inputMode", op: "eq", value: 1 },
    },
    {
      key: "projectCeilingAreaM2",
      label: "Площадь потолка по проекту",
      type: "number",
      unit: "м²",
      min: 0.1,
      max: 10000,
      step: 0.01,
      defaultValue: 20,
      hint:
        "Справочная площадь готовой раскладки. Она не заменяет число кассет и не используется для автоматического расчёта каркаса.",
      group: "Готовая ведомость",
      hideIf: { key: "inputMode", op: "eq", value: 0 },
    },
    {
      key: "projectCassettePieceCount",
      label: "Кассет по готовой раскладке",
      type: "number",
      unit: "шт",
      min: 0,
      max: 100000,
      step: 1,
      defaultValue: 63,
      hint:
        "Перенесите готовое количество изделий с учётом крайних подрезок и модулей, занятых светильниками, люками, вентиляцией и другими вставками. Запас добавляется ниже отдельно.",
      group: "Готовая ведомость",
      hideIf: { key: "inputMode", op: "eq", value: 0 },
    },
    {
      key: "cassetteReservePercent",
      label: "Ваш запас кассет",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hint:
        "Выберите запас по утверждённой раскладке, хрупкости изделия, числу подрезок и правилам выбранной коллекции. Калькулятор не добавляет скрытые проценты.",
      group: "Кассеты и упаковка",
    },
    {
      key: "cassettesPerPack",
      label: "Кассет в неделимой упаковке",
      type: "number",
      unit: "шт",
      min: 1,
      max: 10000,
      step: 1,
      defaultValue: 1,
      hint:
        "Введите фактическую фасовку артикула. Если продавец отпускает кассеты поштучно, оставьте 1.",
      group: "Кассеты и упаковка",
    },
    {
      key: "mainRunnerEnabled",
      label: "Добавить главные направляющие по проекту",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — схема каркаса не готова" },
        { value: 1, label: "Да — введу проектную длину" },
      ],
      hint:
        "Марка, направление, шаг и длина главных профилей зависят от конкретной открытой или скрытой системы, нагрузки и раскладки. По площади они не назначаются.",
      group: "Главные направляющие",
      fullWidth: true,
    },
    {
      key: "projectMainRunnerLengthM",
      label: "Длина главных направляющих по проекту",
      type: "number",
      unit: "м",
      min: 0,
      max: 100000,
      step: 0.01,
      defaultValue: 0,
      group: "Главные направляющие",
      hideIf: { key: "mainRunnerEnabled", op: "eq", value: 0 },
    },
    {
      key: "mainRunnerReservePercent",
      label: "Ваш запас главных направляющих",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      group: "Главные направляющие",
      hideIf: { key: "mainRunnerEnabled", op: "eq", value: 0 },
    },
    {
      key: "mainRunnerPieceLengthM",
      label: "Длина одной главной направляющей",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 30,
      step: 0.01,
      defaultValue: 3.6,
      hint: "Сверьте товарную длину выбранной системы.",
      group: "Главные направляющие",
      hideIf: { key: "mainRunnerEnabled", op: "eq", value: 0 },
    },
    {
      key: "crossProfileAEnabled",
      label: "Добавить поперечные профили типа 1",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет" },
        { value: 1, label: "Да — введу количество из ведомости" },
      ],
      hint:
        "Один однородный артикул поперечного профиля. Его длину и место в сетке калькулятор не угадывает.",
      group: "Поперечные профили — тип 1",
      fullWidth: true,
    },
    {
      key: "projectCrossProfileACount",
      label: "Профилей типа 1 по проекту",
      type: "number",
      unit: "шт",
      min: 0,
      max: 100000,
      step: 1,
      defaultValue: 0,
      group: "Поперечные профили — тип 1",
      hideIf: { key: "crossProfileAEnabled", op: "eq", value: 0 },
    },
    {
      key: "crossProfileAReservePercent",
      label: "Ваш запас профилей типа 1",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      group: "Поперечные профили — тип 1",
      hideIf: { key: "crossProfileAEnabled", op: "eq", value: 0 },
    },
    {
      key: "crossProfilesAPerPack",
      label: "Профилей типа 1 в упаковке",
      type: "number",
      unit: "шт",
      min: 1,
      max: 10000,
      step: 1,
      defaultValue: 1,
      group: "Поперечные профили — тип 1",
      hideIf: { key: "crossProfileAEnabled", op: "eq", value: 0 },
    },
    {
      key: "crossProfileBEnabled",
      label: "Добавить поперечные профили типа 2",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет" },
        { value: 1, label: "Да — введу количество из ведомости" },
      ],
      hint:
        "Второй однородный артикул нужен только если он присутствует в схеме выбранной системы.",
      group: "Поперечные профили — тип 2",
      fullWidth: true,
    },
    {
      key: "projectCrossProfileBCount",
      label: "Профилей типа 2 по проекту",
      type: "number",
      unit: "шт",
      min: 0,
      max: 100000,
      step: 1,
      defaultValue: 0,
      group: "Поперечные профили — тип 2",
      hideIf: { key: "crossProfileBEnabled", op: "eq", value: 0 },
    },
    {
      key: "crossProfileBReservePercent",
      label: "Ваш запас профилей типа 2",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      group: "Поперечные профили — тип 2",
      hideIf: { key: "crossProfileBEnabled", op: "eq", value: 0 },
    },
    {
      key: "crossProfilesBPerPack",
      label: "Профилей типа 2 в упаковке",
      type: "number",
      unit: "шт",
      min: 1,
      max: 10000,
      step: 1,
      defaultValue: 1,
      group: "Поперечные профили — тип 2",
      hideIf: { key: "crossProfileBEnabled", op: "eq", value: 0 },
    },
    {
      key: "perimeterEnabled",
      label: "Добавить периметральный профиль по проекту",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — примыкание не выбрано" },
        { value: 1, label: "Да — введу измеренную длину" },
      ],
      hint:
        "Тип примыкания зависит от кромки кассеты и системы. Введите длину только после выбора узла.",
      group: "Периметр",
      fullWidth: true,
    },
    {
      key: "projectPerimeterLengthM",
      label: "Длина периметрального профиля",
      type: "number",
      unit: "м",
      min: 0,
      max: 100000,
      step: 0.01,
      defaultValue: 0,
      group: "Периметр",
      hideIf: { key: "perimeterEnabled", op: "eq", value: 0 },
    },
    {
      key: "perimeterReservePercent",
      label: "Ваш запас периметрального профиля",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      group: "Периметр",
      hideIf: { key: "perimeterEnabled", op: "eq", value: 0 },
    },
    {
      key: "perimeterPieceLengthM",
      label: "Длина одного периметрального профиля",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 30,
      step: 0.01,
      defaultValue: 3,
      group: "Периметр",
      hideIf: { key: "perimeterEnabled", op: "eq", value: 0 },
    },
    {
      key: "hangerEnabled",
      label: "Добавить подвесы по проектной ведомости",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — схема подвесов не готова" },
        { value: 1, label: "Да — введу готовое количество" },
      ],
      hint:
        "Количество и тип подвесов определяются схемой каркаса, основанием, нагрузкой, высотой опуска и инженерными элементами.",
      group: "Подвесы",
      fullWidth: true,
    },
    {
      key: "projectHangerCount",
      label: "Подвесов по проекту",
      type: "number",
      unit: "шт",
      min: 0,
      max: 100000,
      step: 1,
      defaultValue: 0,
      group: "Подвесы",
      hideIf: { key: "hangerEnabled", op: "eq", value: 0 },
    },
    {
      key: "hangersPerPack",
      label: "Подвесов в неделимой упаковке",
      type: "number",
      unit: "шт",
      min: 1,
      max: 10000,
      step: 1,
      defaultValue: 1,
      group: "Подвесы",
      hideIf: { key: "hangerEnabled", op: "eq", value: 0 },
    },
  ],
  calculate(inputs) {
    const inputMode = clampInteger(readNumber(inputs.inputMode, 0), 0, 1);
    const ceilingLengthM = inputMode === 0
      ? clamp(readNumber(inputs.ceilingLengthM, 5), 0.1, 100)
      : 0;
    const ceilingWidthM = inputMode === 0
      ? clamp(readNumber(inputs.ceilingWidthM, 4), 0.1, 100)
      : 0;
    const cassetteModuleLengthMm = inputMode === 0
      ? clamp(readNumber(inputs.cassetteModuleLengthMm, 600), 100, 3000)
      : 0;
    const cassetteModuleWidthMm = inputMode === 0
      ? clamp(readNumber(inputs.cassetteModuleWidthMm, 600), 100, 3000)
      : 0;
    const projectCeilingAreaM2 = inputMode === 1
      ? clamp(readNumber(inputs.projectCeilingAreaM2, 20), 0.1, 10000)
      : 0;
    const projectCassettePieceCount = inputMode === 1
      ? clampInteger(readNumber(inputs.projectCassettePieceCount, 63), 0, 100000)
      : 0;
    const cassetteReservePercent = clamp(
      readNumber(inputs.cassetteReservePercent, 0),
      0,
      30,
    );
    const cassettesPerPack = clampInteger(
      readNumber(inputs.cassettesPerPack, 1),
      1,
      10000,
    );

    const area = round(
      inputMode === 0
        ? ceilingLengthM * ceilingWidthM
        : projectCeilingAreaM2,
      6,
    );
    const lengthLayout = inputMode === 0
      ? calculateBalancedAxis(ceilingLengthM, cassetteModuleLengthMm)
      : { positions: 0, fullModules: 0, borderCutMm: 0 };
    const widthLayout = inputMode === 0
      ? calculateBalancedAxis(ceilingWidthM, cassetteModuleWidthMm)
      : { positions: 0, fullModules: 0, borderCutMm: 0 };
    const gridColumns = lengthLayout.positions;
    const gridRows = widthLayout.positions;
    const layoutCassettePieces = inputMode === 0
      ? gridColumns * gridRows
      : projectCassettePieceCount;
    const requiredCassettePieces = ceilPositive(
      layoutCassettePieces * (1 + cassetteReservePercent / 100),
    );
    const cassettePacks = ceilPositive(
      requiredCassettePieces / cassettesPerPack,
    );
    const purchaseCassettePieces = cassettePacks * cassettesPerPack;
    const cassettePurchasedSurplusPieces = Math.max(
      0,
      purchaseCassettePieces - layoutCassettePieces,
    );

    const mainRunnerEnabled = readNumber(inputs.mainRunnerEnabled, 0) > 0;
    const projectMainRunnerLengthM = mainRunnerEnabled
      ? clamp(readNumber(inputs.projectMainRunnerLengthM, 0), 0, 100000)
      : 0;
    const mainRunnerReservePercent = mainRunnerEnabled
      ? clamp(readNumber(inputs.mainRunnerReservePercent, 0), 0, 30)
      : 0;
    const mainRunnerPieceLengthM = clamp(
      readNumber(inputs.mainRunnerPieceLengthM, 3.6),
      0.1,
      30,
    );
    const mainRunners = calculateLinearPurchase(
      projectMainRunnerLengthM,
      mainRunnerReservePercent,
      mainRunnerPieceLengthM,
    );

    const crossProfileAEnabled =
      readNumber(inputs.crossProfileAEnabled, 0) > 0;
    const projectCrossProfileACount = crossProfileAEnabled
      ? clampInteger(readNumber(inputs.projectCrossProfileACount, 0), 0, 100000)
      : 0;
    const crossProfileAReservePercent = crossProfileAEnabled
      ? clamp(readNumber(inputs.crossProfileAReservePercent, 0), 0, 30)
      : 0;
    const crossProfilesAPerPack = clampInteger(
      readNumber(inputs.crossProfilesAPerPack, 1),
      1,
      10000,
    );
    const crossProfilesA = calculateCountPurchase(
      projectCrossProfileACount,
      crossProfileAReservePercent,
      crossProfilesAPerPack,
    );

    const crossProfileBEnabled =
      readNumber(inputs.crossProfileBEnabled, 0) > 0;
    const projectCrossProfileBCount = crossProfileBEnabled
      ? clampInteger(readNumber(inputs.projectCrossProfileBCount, 0), 0, 100000)
      : 0;
    const crossProfileBReservePercent = crossProfileBEnabled
      ? clamp(readNumber(inputs.crossProfileBReservePercent, 0), 0, 30)
      : 0;
    const crossProfilesBPerPack = clampInteger(
      readNumber(inputs.crossProfilesBPerPack, 1),
      1,
      10000,
    );
    const crossProfilesB = calculateCountPurchase(
      projectCrossProfileBCount,
      crossProfileBReservePercent,
      crossProfilesBPerPack,
    );

    const perimeterEnabled = readNumber(inputs.perimeterEnabled, 0) > 0;
    const projectPerimeterLengthM = perimeterEnabled
      ? clamp(readNumber(inputs.projectPerimeterLengthM, 0), 0, 100000)
      : 0;
    const perimeterReservePercent = perimeterEnabled
      ? clamp(readNumber(inputs.perimeterReservePercent, 0), 0, 30)
      : 0;
    const perimeterPieceLengthM = clamp(
      readNumber(inputs.perimeterPieceLengthM, 3),
      0.1,
      30,
    );
    const perimeter = calculateLinearPurchase(
      projectPerimeterLengthM,
      perimeterReservePercent,
      perimeterPieceLengthM,
    );

    const hangerEnabled = readNumber(inputs.hangerEnabled, 0) > 0;
    const projectHangerCount = hangerEnabled
      ? clampInteger(readNumber(inputs.projectHangerCount, 0), 0, 100000)
      : 0;
    const hangersPerPack = clampInteger(
      readNumber(inputs.hangersPerPack, 1),
      1,
      10000,
    );
    const hangers = calculateCountPurchase(
      projectHangerCount,
      0,
      hangersPerPack,
    );

    const materials: MaterialResult[] = [
      {
        name: inputMode === 0
          ? "Кассеты по простой модульной раскладке"
          : "Кассеты по проектной ведомости",
        subtitle: inputMode === 0
          ? `${gridColumns} × ${gridRows} позиций; модуль ${formatRuNumber(cassetteModuleLengthMm)} × ${formatRuNumber(cassetteModuleWidthMm)} мм`
          : `${layoutCassettePieces} ${plural(layoutCassettePieces, "кассета", "кассеты", "кассет")} из готовой карты потолка`,
        quantity: layoutCassettePieces,
        unit: "шт",
        withReserve: requiredCassettePieces,
        purchaseQty: purchaseCassettePieces,
        category: "Кассеты",
        highlight: true,
        packageInfo: {
          count: cassettesPerPack === 1
            ? purchaseCassettePieces
            : cassettePacks,
          size: cassettesPerPack,
          packageUnit: cassettesPerPack === 1 ? "кассет" : "упаковок",
        },
      },
    ];

    if (mainRunnerEnabled && projectMainRunnerLengthM > 0) {
      materials.push({
        name: "Главные направляющие по проекту",
        subtitle: `Элемент ${formatRuNumber(mainRunnerPieceLengthM)} м; запас ${formatRuNumber(mainRunnerReservePercent)}%`,
        quantity: round(projectMainRunnerLengthM, 6),
        unit: "м",
        withReserve: mainRunners.requiredLengthM,
        purchaseQty: mainRunners.purchaseLengthM,
        category: "Несущая система",
        packageInfo: {
          count: mainRunners.pieces,
          size: mainRunnerPieceLengthM,
          packageUnit: "направляющих",
        },
      });
    }

    if (crossProfileAEnabled && projectCrossProfileACount > 0) {
      materials.push({
        name: "Поперечные профили — тип 1",
        subtitle: `Готовое количество из проекта; запас ${formatRuNumber(crossProfileAReservePercent)}%`,
        quantity: projectCrossProfileACount,
        unit: "шт",
        withReserve: crossProfilesA.requiredCount,
        purchaseQty: crossProfilesA.purchaseCount,
        category: "Несущая система",
        packageInfo: {
          count: crossProfilesAPerPack === 1
            ? crossProfilesA.purchaseCount
            : crossProfilesA.packs,
          size: crossProfilesAPerPack,
          packageUnit: crossProfilesAPerPack === 1 ? "профилей" : "упаковок",
        },
      });
    }

    if (crossProfileBEnabled && projectCrossProfileBCount > 0) {
      materials.push({
        name: "Поперечные профили — тип 2",
        subtitle: `Готовое количество из проекта; запас ${formatRuNumber(crossProfileBReservePercent)}%`,
        quantity: projectCrossProfileBCount,
        unit: "шт",
        withReserve: crossProfilesB.requiredCount,
        purchaseQty: crossProfilesB.purchaseCount,
        category: "Несущая система",
        packageInfo: {
          count: crossProfilesBPerPack === 1
            ? crossProfilesB.purchaseCount
            : crossProfilesB.packs,
          size: crossProfilesBPerPack,
          packageUnit: crossProfilesBPerPack === 1 ? "профилей" : "упаковок",
        },
      });
    }

    if (perimeterEnabled && projectPerimeterLengthM > 0) {
      materials.push({
        name: "Периметральный профиль по проекту",
        subtitle: `Элемент ${formatRuNumber(perimeterPieceLengthM)} м; запас ${formatRuNumber(perimeterReservePercent)}%`,
        quantity: round(projectPerimeterLengthM, 6),
        unit: "м",
        withReserve: perimeter.requiredLengthM,
        purchaseQty: perimeter.purchaseLengthM,
        category: "Периметр",
        packageInfo: {
          count: perimeter.pieces,
          size: perimeterPieceLengthM,
          packageUnit: "профилей",
        },
      });
    }

    if (hangerEnabled && projectHangerCount > 0) {
      materials.push({
        name: "Подвесы по проектной ведомости",
        subtitle: hangersPerPack === 1
          ? "Поштучная закупка выбранного типа подвеса"
          : `${hangersPerPack} шт в неделимой упаковке выбранного типа подвеса`,
        quantity: projectHangerCount,
        unit: "шт",
        withReserve: hangers.requiredCount,
        purchaseQty: hangers.purchaseCount,
        category: "Подвесы",
        packageInfo: {
          count: hangersPerPack === 1
            ? hangers.purchaseCount
            : hangers.packs,
          size: hangersPerPack,
          packageUnit: hangersPerPack === 1 ? "подвесов" : "упаковок",
        },
      });
    }

    const requestedAccuracyMode = inputs.accuracyMode as unknown as
      | AccuracyMode
      | undefined;
    const accuracyMode =
      requestedAccuracyMode && requestedAccuracyMode in ACCURACY_MODE_LABELS
        ? requestedAccuracyMode
        : DEFAULT_ACCURACY_MODE;

    const scenario: CalculatorScenario = {
      exact_need: layoutCassettePieces,
      purchase_quantity: purchaseCassettePieces,
      leftover: Math.max(
        0,
        purchaseCassettePieces - requiredCassettePieces,
      ),
      assumptions: [
        `formula_version:${WEB_FORMULA_VERSION}`,
        `input_mode:${inputMode}`,
        `layout_cassette_pieces:${layoutCassettePieces}`,
        `cassette_reserve_percent:${round(cassetteReservePercent, 6)}`,
        `cassettes_per_pack:${cassettesPerPack}`,
      ],
      key_factors: {
        hidden_multiplier: 1,
      },
      buy_plan: {
        package_label: cassettesPerPack === 1
          ? "cassette-piece"
          : `cassette-pack-${cassettesPerPack}`,
        package_size: cassettesPerPack,
        packages_count: cassettePacks,
        unit: "шт",
      },
    };

    const warnings: string[] = [
      "Простой режим оценивает одно прямоугольное поле с одинаковым модулем и считает каждую крайнюю позицию отдельной кассетой. Повторное использование обрезков подтверждается только картой раскроя.",
      "Монтажный модуль, лицевой размер, кромка и тип кассеты — разные параметры. Возьмите два модуля и ориентацию из документации выбранной системы.",
      "Главные и поперечные профили, периметр, подвесы, соединители и крепёж не выводятся из площади: их схема зависит от системы, основания, нагрузки, высоты опуска и инженерных узлов.",
      "Модули светильников, вентиляции, люков, датчиков и других вставок простой режим не вычитает. Для такого потолка используйте готовое число кассет из проектной ведомости.",
      "Пожарные, акустические, влагостойкие, коррозионные, санитарные и эксплуатационные характеристики проверяйте по документам конкретной системы и помещения.",
    ];

    if (inputMode === 1 && projectCassettePieceCount <= 0) {
      warnings.push(
        "Готовая ведомость выбрана, но число кассет равно 0 — проверьте карту потолка до заказа.",
      );
    }
    if (mainRunnerEnabled && projectMainRunnerLengthM <= 0) {
      warnings.push(
        "Главные направляющие включены, но проектная длина равна 0 — позиция не добавлена.",
      );
    }
    if (crossProfileAEnabled && projectCrossProfileACount <= 0) {
      warnings.push(
        "Поперечные профили типа 1 включены, но проектное количество равно 0 — позиция не добавлена.",
      );
    }
    if (crossProfileBEnabled && projectCrossProfileBCount <= 0) {
      warnings.push(
        "Поперечные профили типа 2 включены, но проектное количество равно 0 — позиция не добавлена.",
      );
    }
    if (perimeterEnabled && projectPerimeterLengthM <= 0) {
      warnings.push(
        "Периметральный профиль включён, но измеренная длина равна 0 — позиция не добавлена.",
      );
    }
    if (hangerEnabled && projectHangerCount <= 0) {
      warnings.push(
        "Подвесы включены, но проектное количество равно 0 — позиция не добавлена.",
      );
    }

    const projectPositionCount = materials.length - 1;
    const practicalNotes = [
      inputMode === 0
        ? `Поле ${formatRuNumber(ceilingLengthM)} × ${formatRuNumber(ceilingWidthM)} м содержит сетку ${gridColumns} × ${gridRows} позиций по модулю ${formatRuNumber(cassetteModuleLengthMm)} × ${formatRuNumber(cassetteModuleWidthMm)} мм. Полных центральных модулей: ${lengthLayout.fullModules} × ${widthLayout.fullModules}; крайние подрезки: ${lengthLayout.borderCutMm > 0 ? `по ${formatRuNumber(lengthLayout.borderCutMm)} мм вдоль длины` : "не нужны вдоль длины"}, ${widthLayout.borderCutMm > 0 ? `по ${formatRuNumber(widthLayout.borderCutMm)} мм вдоль ширины` : "не нужны вдоль ширины"}.`
        : `Из готовой раскладки принято ${layoutCassettePieces} ${plural(layoutCassettePieces, "кассета", "кассеты", "кассет")} для площади ${formatRuNumber(area)} м².`,
      `К покупке принято ${purchaseCassettePieces} ${plural(purchaseCassettePieces, "кассета", "кассеты", "кассет")}; явный запас — ${formatRuNumber(cassetteReservePercent)}%.`,
      "До заказа согласуйте оси сетки, ширину крайних подрезок, кромку, цвет и партию, все типы профилей, светильники, вентиляцию, люки и доступ к коммуникациям.",
      "Не смешивайте кассеты, профили и подвесы разных систем без письменного подтверждения геометрической совместимости и несущей способности.",
    ];

    return {
      canonicalSpecId: ceilingCassetteSpec.calculator_id,
      formulaVersion: WEB_FORMULA_VERSION,
      materials,
      totals: {
        inputMode,
        area,
        ceilingLengthM: round(ceilingLengthM, 6),
        ceilingWidthM: round(ceilingWidthM, 6),
        cassetteModuleLengthMm: round(cassetteModuleLengthMm, 6),
        cassetteModuleWidthMm: round(cassetteModuleWidthMm, 6),
        gridColumns,
        gridRows,
        fullColumns: lengthLayout.fullModules,
        fullRows: widthLayout.fullModules,
        borderCutLengthMm: lengthLayout.borderCutMm,
        borderCutWidthMm: widthLayout.borderCutMm,
        layoutCassettePieces,
        cassetteReservePercent: round(cassetteReservePercent, 6),
        requiredCassettePieces,
        cassettePacks,
        purchaseCassettePieces,
        cassettePurchasedSurplusPieces,
        projectMainRunnerLengthM: round(projectMainRunnerLengthM, 6),
        requiredMainRunnerLengthM: mainRunners.requiredLengthM,
        mainRunnerPieces: mainRunners.pieces,
        purchaseMainRunnerLengthM: mainRunners.purchaseLengthM,
        leftoverMainRunnerLengthM: mainRunners.leftoverLengthM,
        projectCrossProfileACount,
        requiredCrossProfileACount: crossProfilesA.requiredCount,
        crossProfileAPacks: crossProfilesA.packs,
        purchaseCrossProfileACount: crossProfilesA.purchaseCount,
        projectCrossProfileBCount,
        requiredCrossProfileBCount: crossProfilesB.requiredCount,
        crossProfileBPacks: crossProfilesB.packs,
        purchaseCrossProfileBCount: crossProfilesB.purchaseCount,
        projectPerimeterLengthM: round(projectPerimeterLengthM, 6),
        requiredPerimeterLengthM: perimeter.requiredLengthM,
        perimeterPieces: perimeter.pieces,
        purchasePerimeterLengthM: perimeter.purchaseLengthM,
        leftoverPerimeterLengthM: perimeter.leftoverLengthM,
        projectHangerCount,
        hangerPacks: hangers.packs,
        purchaseHangerCount: hangers.purchaseCount,
        projectPositionCount,
        minExactNeed: layoutCassettePieces,
        recExactNeed: layoutCassettePieces,
        maxExactNeed: layoutCassettePieces,
        minPurchase: purchaseCassettePieces,
        recPurchase: purchaseCassettePieces,
        maxPurchase: purchaseCassettePieces,
      },
      warnings,
      practicalNotes,
      scenarios: { MIN: scenario, REC: scenario, MAX: scenario },
      accuracyMode,
      accuracyExplanation: {
        mode: accuracyMode,
        modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
        combinedMultiplier: 1,
        appliedModifiers: [],
        notes: [
          "Режим точности не меняет раскладку и закупку: учитываются только введённые размеры, модуль, явный запас, фасовка и проектные позиции.",
        ],
      },
      summaryCards: [
        {
          icon: "□",
          label: "Площадь потолка",
          value: formatRuNumber(area),
          unit: "м²",
          hint: inputMode === 0 ? "по простой геометрии" : "по проекту",
          tone: "violet",
        },
        {
          icon: "▦",
          label: inputMode === 0 ? "Позиции сетки" : "Кассеты по ведомости",
          value: String(layoutCassettePieces),
          unit: "шт",
          hint: inputMode === 0
            ? `${gridColumns} × ${gridRows} позиций`
            : "до явного запаса",
          tone: "slate",
        },
        {
          icon: "▤",
          label: "Кассет к покупке",
          value: String(purchaseCassettePieces),
          unit: "шт",
          hint: cassettesPerPack === 1
            ? `${projectPositionCount} ${plural(projectPositionCount, "проектная позиция", "проектные позиции", "проектных позиций")}`
            : `${cassettePacks} ${plural(cassettePacks, "упаковка", "упаковки", "упаковок")}`,
          tone: "emerald",
        },
      ],
    };
  },
  formulaDescription: `
**Простое прямоугольное поле:**
- Позиции вдоль оси = модульная раскладка с симметричными крайними подрезками
- Базовое число кассет = позиции вдоль длины × позиции вдоль ширины
- С явным запасом = ⌈базовое число × (1 + запас / 100)⌉
- К покупке = целые упаковки по фактической фасовке

**Сложная раскладка:** готовое число кассет переносится из проектной ведомости с учётом светильников, люков, вентиляции и разных типоразмеров.

**Каркас и комплектующие:** главные и поперечные профили, периметр и подвесы по умолчанию выключены и считаются только по проектным длинам или количеству.
  `,
  howToUse: [
    "Выберите простой прямоугольник или готовую проектную ведомость",
    "Для прямоугольника задайте длину, ширину и оба фактических монтажных модуля системы",
    "Введите собственный запас кассет и фактическую фасовку артикула",
    "Для сложного потолка перенесите готовое число кассет из карты с учётом светильников и других вставок",
    "Добавляйте главные и поперечные профили, периметр и подвесы только по проектной ведомости",
    "Нажмите «Рассчитать» и проверьте сетку, крайние подрезки, упаковки и остаток",
  ],
  expertTips: [
    {
      title: "Разделяйте модуль и лицевой размер",
      content:
        "Кассета может иметь лицевой размер, отличный от повторяющегося шага сетки. Для раскладки нужен модуль системы по обеим осям и согласованная ориентация изделия.",
      author: "Проектировщик потолочных систем",
    },
    {
      title: "Сначала согласуйте крайние подрезки",
      content:
        "Смещение осей меняет ширину крайних элементов и положение профилей. Светильники, люки, вентиляция и датчики должны быть нанесены на карту до заказа кассет и каркаса.",
      author: "Монтажник подвесных потолков",
    },
  ],
  faq: [
    {
      question: "Что вводить: размер кассеты или монтажный модуль?",
      answer:
        "Введите повторяющийся монтажный модуль по обеим осям из документации системы. Лицевой размер и кромка кассеты могут отличаться от шага сетки.",
    },
    {
      question: "Почему каркас и подвесы не считаются автоматически по площади?",
      answer:
        "Открытые и скрытые системы, разные модули и кромки используют разные профили, шаги и узлы. Их количество зависит от раскладки, нагрузки, основания, высоты опуска, светильников и инженерии, поэтому его переносят из проекта.",
    },
    {
      question: "Учитывает ли простой режим светильники и вентиляционные решётки?",
      answer:
        "Нет. Простой режим оценивает все позиции одинаковой сетки как кассеты. Если отдельные модули заняты светильниками, люками, вентиляцией или кассетами другого типа, используйте готовое число изделий из проектной ведомости.",
    },
    {
      question: "Можно ли использовать обрезок одной крайней кассеты для другой стороны?",
      answer:
        "Только если это разрешают материал, рисунок, кромка, направление перфорации и карта раскроя. Простой режим не обещает такое повторное использование и считает каждую крайнюю позицию отдельным изделием.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор кассетного потолка</h2>
<p>Калькулятор разделяет простую модульную раскладку кассет и проектную комплектацию подвесной системы. Для одного прямоугольного поля задаются длина, ширина и фактический монтажный модуль по обеим осям. Сетка центрируется: если размер не кратен модулю, остаток распределяется между противоположными краями после уменьшения числа полных центральных модулей.</p>
<p>Полученное число — оценка позиций одинаковой сетки. Каждая крайняя позиция считается отдельной кассетой: повторное использование обрезков не обещается без карты раскроя. Для ниш, колонн, нескольких типоразмеров, диагонали, светильников, люков и вентиляции перенесите готовое число кассет из проекта. Явный запас применяется один раз, затем результат округляется до фактической упаковки.</p>

<h2>Почему модуль не равен общему названию кассеты</h2>
<p>Лицевой размер, монтажный модуль, кромка и способ крепления — разные параметры. Кассета номинального размера около 595 мм может работать в сетке 600 мм, а прямоугольные и скрытые системы используют другие комбинации. Поэтому форма не предлагает универсальные пресеты 595/600/300 и не назначает систему по одному размеру.</p>
<p>Официальная документация <a href="https://albes.ru/catalog/kassetnye-potolki/otkrytaya-podvesnaya-sistema/c-otkrytoy-podvesnoy-sistemoy-albes/" target="_blank" rel="noopener noreferrer">кассетных систем ALBES</a> показывает разные модули, кромки и состав профилей, а периметральные элементы указывает считать по проекту. Руководство <a href="https://www.knaufceilingsolutions.com/fileadmin/knaufceilingsolutions/01_products/01_mineral/installation_guides/india/IG_Installation_Manual_Mineral_KCS_EN_IN.pdf" target="_blank" rel="noopener noreferrer">Knauf Ceiling Solutions по монтажной раскладке</a> отдельно начинает работу с планирования сетки и симметричных крайних подрезок. Эти документы подтверждают различия систем, а не задают универсальную норму для любого потолка.</p>

<h2>Каркас, подвесы и инженерные модули</h2>
<p>Главные и поперечные профили, периметр, подвесы, соединители и крепёж не выводятся из площади. Для них нужны марка системы, направление профилей, проектные шаги и крайние отступы, основание, высота опуска, нагрузки от кассет и инженерных элементов. В калькулятор переносятся только готовые длины и количества однородных позиций.</p>
<p>Светильники, вентиляционные решётки, люки, громкоговорители, датчики, пожарные устройства и другие вставки могут занимать модуль либо требовать отдельного усиления. Простой режим их не вычитает и не комплектует. Перед заказом проверяют совместимость кромок и профилей, допустимые нагрузки, коррозионную стойкость, пожарные и санитарные характеристики конкретной системы.</p>

<h2>Нормативная граница</h2>
<p>Действующий <a href="https://protect.gost.ru/gost/details/346d371b-7eb7-4be0-a7da-d18a7758931b" target="_blank" rel="noopener noreferrer">ГОСТ Р 70939-2023</a> распространяется на подвесные потолки и их элементы, устанавливает классификацию, технические требования, правила приёмки и методы испытаний. Он не назначает один модуль, каркас или расход профилей для всех кассетных систем. Общие правила отделочных работ содержит действующий <a href="https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939" target="_blank" rel="noopener noreferrer">СП 71.13330.2017</a>. Конкретную раскладку, узлы, нагрузки и комплектность берут из проектной и технической документации выбранной системы.</p>

<h2>Что подготовить для точной ведомости</h2>
<ul>
  <li>обмер каждого потолочного поля, ниши, колонны и другие разрывы;</li>
  <li>артикул кассеты, лицевой размер, кромку и монтажный модуль по обеим осям;</li>
  <li>оси сетки, направление прямоугольных изделий и ширину крайних подрезок;</li>
  <li>раскладку светильников, вентиляции, люков, датчиков и других вставок;</li>
  <li>марки и количества главных и поперечных профилей, периметра, подвесов и соединителей;</li>
  <li>фасовку каждой позиции, согласованный запас и требования к замене кассет;</li>
  <li>основание, высоту опуска, нагрузки и требования помещения.</li>
</ul>
`,
    faq: [
      {
        question: "Сколько кассет нужно для поля 5×4 м при модуле 600×600 мм?",
        answer:
          "<p>Простая симметричная сетка содержит 9 позиций вдоль длины и 7 вдоль ширины, всего 63 позиции. Без запаса и при поштучной продаже к покупке — 63 кассеты. Точное число может измениться после размещения светильников, люков, вентиляции, разных типоразмеров и проверки повторного использования допустимых обрезков.</p>",
      },
      {
        question: "Почему калькулятор не предлагает готовые системы 595×595 и 600×600?",
        answer:
          "<p>Лицевой размер кассеты сам по себе не определяет шаг сетки, кромку, тип профилей и способ крепления. Пользователь вводит фактический модуль выбранной системы по обеим осям, а каркас переносит из её проектной ведомости.</p>",
      },
      {
        question: "Как учитывать запас кассет?",
        answer:
          "<p>Запас задаётся явно после готовой простой или проектной раскладки и применяется один раз до округления по упаковкам. Его величина зависит от материала, хрупкости, числа подрезок, рисунка, партии и требований к будущей замене; калькулятор не подставляет скрытые 10%.</p>",
      },
      {
        question: "Как считать открытый и скрытый кассетный потолок?",
        answer:
          "<p>Кассеты можно оценить по фактическому модулю простой сетки. Профили и подвесы для открытой и скрытой систем отличаются, поэтому их длины, типы и количества вводятся только из документации и проекта выбранной системы.</p>",
      },
    ],
  },
};
