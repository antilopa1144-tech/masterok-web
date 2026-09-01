import type {
  CalculatorDefinition,
  CalculatorScenario,
  MaterialResult,
  SummaryCard,
} from "../types";
import { withSiteMetaTitle } from "../meta";
import {
  ACCURACY_MODE_LABELS,
  DEFAULT_ACCURACY_MODE,
  type AccuracyMode,
} from "../../../../engine/accuracy";
import terraceSpec from "../../../../configs/calculators/terrace-canonical.v1.json";

const WEB_FORMULA_VERSION = "terrace-web-purchase-v1";

const BOARD_TYPE_LABELS: Record<number, string> = {
  0: "Террасная доска из ДПК",
  1: "Террасная доска из лиственницы",
  2: "Террасная доска из сосны",
  3: "Планкен для настила",
};

const TREATMENT_LABELS: Record<number, string> = {
  1: "Масло для дерева",
  2: "Антисептик для дерева",
};

const RESERVE_OPTIONS = [
  { value: 0, label: "0% — без запаса" },
  { value: 5, label: "5%" },
  { value: 10, label: "10%" },
  { value: 15, label: "15%" },
  { value: 20, label: "20%" },
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

const round = (value: number, digits = 6): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const ceilPositive = (value: number): number =>
  value > 0 ? Math.ceil(value - Number.EPSILON) : 0;

const formatRuNumber = (value: number, maximumFractionDigits = 2): string =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits }).format(value);

const pluralRu = (count: number, one: string, few: string, many: string): string => {
  const lastTwo = Math.abs(count) % 100;
  const last = lastTwo % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
};

export const terraceDef: CalculatorDefinition = {
  id: "terrace",
  slug: "kalkulyator-terrasnoy-doski",
  formulaVersion: WEB_FORMULA_VERSION,
  title: "Калькулятор террасной доски",
  h1: "Калькулятор террасной доски — раскрой и закупка по фактическому профилю",
  description:
    "Рассчитайте доску по направлению рядов, рабочей ширине, зазору, длине товара, явному запасу и фасовке. Лаги, крепёж и подготовку добавляйте только по проектной ведомости.",
  metaTitle: withSiteMetaTitle("Калькулятор террасной доски: раскрой и закупка"),
  metaDescription:
    "Бесплатный калькулятор террасной доски: рассчитайте ряды, раскрой, запас и пачки, а лаги, крепёж и геотекстиль — только по проектным данным.",
  category: "facade",
  categorySlug: "fasad",
  tags: [
    "террасная доска",
    "декинг",
    "расчёт террасной доски",
    "раскрой террасной доски",
    "ДПК",
    "лаги для террасы",
  ],
  popularity: 58,
  complexity: 3,
  fields: [
    {
      key: "length",
      label: "Длина одного ряда вдоль досок",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 30,
      step: 0.1,
      defaultValue: 5,
      hint:
        "Размер настила в выбранном направлении досок. Для другого направления поменяйте размеры местами или используйте инструмент раскладки.",
      group: "Настил",
      fullWidth: true,
    },
    {
      key: "width",
      label: "Ширина настила поперёк досок",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 30,
      step: 0.1,
      defaultValue: 3,
      hint: "По этой ширине определяется число рядов с учётом рабочего модуля.",
      group: "Настил",
      fullWidth: true,
    },
    {
      key: "boardType",
      label: "Название материала настила",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Террасная доска из ДПК" },
        { value: 1, label: "Террасная доска из лиственницы" },
        { value: 2, label: "Террасная доска из сосны" },
        { value: 3, label: "Планкен для настила" },
      ],
      hint:
        "Название меняет позицию в ведомости, но не подставляет скрытый шаг лаг, крепёж или обработку.",
      group: "Настил",
    },
    {
      key: "boardLength",
      label: "Товарная длина одной доски",
      type: "number",
      unit: "мм",
      min: 500,
      max: 12000,
      step: 10,
      defaultValue: 3000,
      hint: "Фактическая длина выбранного артикула.",
      group: "Настил",
    },
    {
      key: "boardWidthMm",
      label: "Рабочая ширина одной доски",
      type: "number",
      unit: "мм",
      min: 50,
      max: 400,
      step: 1,
      defaultValue: 150,
      hint:
        "Закрываемая ширина профиля без междосочного зазора. Сверьте обозначение с паспортом производителя.",
      group: "Настил",
    },
    {
      key: "gapMm",
      label: "Зазор между соседними рядами",
      type: "number",
      unit: "мм",
      min: 0,
      max: 30,
      step: 0.5,
      defaultValue: 5,
      hint:
        "Введите принятый боковой зазор для выбранного материала, температуры и крепёжной системы.",
      group: "Настил",
    },
    {
      key: "offcutReuseMode",
      label: "Переносить пригодные обрезки между рядами",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — безопасный предварительный раскрой" },
        { value: 1, label: "Да — подтверждено схемой раскладки" },
      ],
      hint:
        "Оптимистичный перенос сокращает покупку только при допустимой разбежке стыков и опорах под каждым соединением.",
      group: "Настил",
      fullWidth: true,
    },
    {
      key: "boardReservePercent",
      label: "Ваш запас доски после раскроя",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hint:
        "Явный запас применяется один раз после выбранной модели раскроя. MIN/REC/MAX не добавляют второй процент.",
      group: "Настил",
    },
    {
      key: "boardsPerPack",
      label: "Досок в неделимой пачке",
      type: "number",
      unit: "шт",
      min: 1,
      max: 1000,
      step: 1,
      integerOnly: true,
      defaultValue: 1,
      hint:
        "Если товар отпускают поштучно, оставьте 1. Для неделимой упаковки введите фактическое количество досок.",
      group: "Настил",
    },
    {
      key: "substructureEnabled",
      label: "Добавить лаги из проектной ведомости",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — схема подконструкции не задана" },
        { value: 1, label: "Да — введу готовую длину и товарную лагу" },
      ],
      hint:
        "Калькулятор не выводит лаги из универсального шага: стыки, края, нагрузки, опоры и материал требуют готовой схемы.",
      group: "Подконструкция",
      fullWidth: true,
    },
    {
      key: "projectLagLengthM",
      label: "Суммарная длина лаг по проекту",
      type: "number",
      unit: "м",
      min: 0,
      max: 100000,
      step: 0.1,
      defaultValue: 0,
      hideIf: { key: "substructureEnabled", op: "eq", value: 0 },
      hint:
        "Готовая длина всех рядовых, крайних и дополнительных лаг под стыками.",
      group: "Подконструкция",
    },
    {
      key: "lagReservePercent",
      label: "Ваш запас лаг",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hideIf: { key: "substructureEnabled", op: "eq", value: 0 },
      hint: "Явный запас по схеме раскроя товарных лаг.",
      group: "Подконструкция",
    },
    {
      key: "lagLengthM",
      label: "Товарная длина одной лаги",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 30,
      step: 0.1,
      defaultValue: 3,
      hideIf: { key: "substructureEnabled", op: "eq", value: 0 },
      hint: "Фактическая длина выбранной лаги или профиля.",
      group: "Подконструкция",
    },
    {
      key: "fastenersEnabled",
      label: "Добавить крепёж из проектной ведомости",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — крепёжная схема не задана" },
        { value: 1, label: "Да — введу готовые количества и фасовки" },
      ],
      hint:
        "Клипсы и саморезы зависят от профиля, лаг, краёв, стыков и системы производителя; по площади они автоматически не назначаются.",
      group: "Крепёж",
      fullWidth: true,
    },
    {
      key: "projectClipCount",
      label: "Клипс или скрытых креплений по проекту",
      type: "number",
      unit: "шт",
      min: 0,
      max: 1000000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
      hideIf: { key: "fastenersEnabled", op: "eq", value: 0 },
      hint: "Готовое количество основных, стартовых и финишных креплений.",
      group: "Крепёж",
    },
    {
      key: "clipPackCount",
      label: "Клипс в упаковке",
      type: "number",
      unit: "шт",
      min: 1,
      max: 100000,
      step: 1,
      integerOnly: true,
      defaultValue: 100,
      hideIf: { key: "fastenersEnabled", op: "eq", value: 0 },
      hint: "Фактическая фасовка выбранной системы.",
      group: "Крепёж",
    },
    {
      key: "projectScrewCount",
      label: "Саморезов по проекту",
      type: "number",
      unit: "шт",
      min: 0,
      max: 1000000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
      hideIf: { key: "fastenersEnabled", op: "eq", value: 0 },
      hint:
        "Готовое количество саморезов для выбранных креплений и подконструкции. Материал, диаметр и длина здесь не подбираются.",
      group: "Крепёж",
    },
    {
      key: "fastenerPackCount",
      label: "Саморезов в упаковке",
      type: "number",
      unit: "шт",
      min: 1,
      max: 100000,
      step: 1,
      integerOnly: true,
      defaultValue: 100,
      hideIf: { key: "fastenersEnabled", op: "eq", value: 0 },
      hint: "Фактическая фасовка выбранного крепежа.",
      group: "Крепёж",
    },
    {
      key: "fastenerReservePercent",
      label: "Ваш запас крепежа",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hideIf: { key: "fastenersEnabled", op: "eq", value: 0 },
      hint: "Один явный запас применяется к обеим введённым позициям.",
      group: "Крепёж",
    },
    {
      key: "withTreatment",
      label: "Добавить обработку деревянного настила",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — продукт не выбран" },
        { value: 1, label: "Масло — введу паспортный расход" },
        { value: 2, label: "Антисептик — введу паспортный расход" },
      ],
      hint:
        "Обработка не назначается по названию породы. Проверьте заводское покрытие, назначение и инструкцию выбранного продукта.",
      group: "Обработка",
      fullWidth: true,
    },
    {
      key: "treatmentRateLPerM2PerLayer",
      label: "Паспортный расход на один слой",
      type: "number",
      unit: "л/м²",
      min: 0.001,
      max: 10,
      step: 0.001,
      defaultValue: 0.1,
      hideIf: { key: "withTreatment", op: "eq", value: 0 },
      hint: "Расход с этикетки для фактического основания и способа нанесения.",
      group: "Обработка",
    },
    {
      key: "treatmentLayers",
      label: "Количество слоёв обработки",
      type: "number",
      unit: "сл.",
      min: 1,
      max: 10,
      step: 1,
      integerOnly: true,
      defaultValue: 2,
      hideIf: { key: "withTreatment", op: "eq", value: 0 },
      hint: "Фактическое число слоёв по инструкции продукта.",
      group: "Обработка",
    },
    {
      key: "treatmentCanL",
      label: "Объём одной банки",
      type: "number",
      unit: "л",
      min: 0.01,
      max: 1000,
      step: 0.01,
      defaultValue: 2.5,
      hideIf: { key: "withTreatment", op: "eq", value: 0 },
      hint: "Фактическая товарная фасовка.",
      group: "Обработка",
    },
    {
      key: "treatmentReservePercent",
      label: "Ваш запас обработки",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hideIf: { key: "withTreatment", op: "eq", value: 0 },
      hint: "Явный запас на впитываемость, торцы и потери нанесения.",
      group: "Обработка",
    },
    {
      key: "geotextileEnabled",
      label: "Добавить геотекстиль из проекта основания",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — основание не задано" },
        { value: 1, label: "Да — введу проектную площадь и рулон" },
      ],
      hint:
        "Геотекстиль не является автоматическим материалом любого настила. Включайте его только по принятому основанию.",
      group: "Основание",
      fullWidth: true,
    },
    {
      key: "projectGeotextileAreaM2",
      label: "Площадь геотекстиля по проекту",
      type: "number",
      unit: "м²",
      min: 0,
      max: 100000,
      step: 0.1,
      defaultValue: 0,
      hideIf: { key: "geotextileEnabled", op: "eq", value: 0 },
      hint: "Готовая площадь с учётом принятой схемы полос, но без запаса этого поля.",
      group: "Основание",
    },
    {
      key: "geotextileReservePercent",
      label: "Ваш запас геотекстиля",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hideIf: { key: "geotextileEnabled", op: "eq", value: 0 },
      hint: "Явный запас на нахлёсты и раскрой полос.",
      group: "Основание",
    },
    {
      key: "geotextileRollM2",
      label: "Площадь выбранного рулона",
      type: "number",
      unit: "м²",
      min: 0.1,
      max: 10000,
      step: 0.1,
      defaultValue: 50,
      hideIf: { key: "geotextileEnabled", op: "eq", value: 0 },
      hint: "Фактическая площадь одного покупаемого рулона.",
      group: "Основание",
    },
  ],
  calculate(inputs) {
    const length = clamp(readNumber(inputs.length, 5), 0.5, 30);
    const width = clamp(readNumber(inputs.width, 3), 0.5, 30);
    const boardType = clampInteger(readNumber(inputs.boardType, 0), 0, 3);
    const boardLengthMm = clamp(readNumber(inputs.boardLength, 3000), 500, 12000);
    const boardLengthM = boardLengthMm / 1000;
    const boardWidthMm = clamp(readNumber(inputs.boardWidthMm, 150), 50, 400);
    const gapMm = clamp(readNumber(inputs.gapMm, 5), 0, 30);
    const offcutReuseMode = clampInteger(readNumber(inputs.offcutReuseMode, 0), 0, 1);
    const boardReservePercent = clamp(readNumber(inputs.boardReservePercent, 0), 0, 30);
    const boardsPerPack = clampInteger(readNumber(inputs.boardsPerPack, 1), 1, 1000);

    const area = round(length * width, 6);
    const boardPitchM = (boardWidthMm + gapMm) / 1000;
    const rowCount = ceilPositive((width + gapMm / 1000) / boardPitchM);
    const boardsPerRow = ceilPositive(length / boardLengthM);
    const safeBaseBoards = rowCount * boardsPerRow;
    const totalBoardLinearM = round(rowCount * length, 6);
    const sharedCutBaseBoards = totalBoardLinearM / boardLengthM;
    const baseBoardExact = round(
      offcutReuseMode === 1 ? sharedCutBaseBoards : safeBaseBoards,
      6,
    );
    const baseBoardPurchase = ceilPositive(baseBoardExact);
    const baseCutWasteM = round(
      Math.max(0, baseBoardPurchase * boardLengthM - totalBoardLinearM),
      6,
    );
    const boardReservedNeed = round(
      baseBoardExact * (1 + boardReservePercent / 100),
      6,
    );
    const boardPacks = ceilPositive(boardReservedNeed / boardsPerPack);
    const boardPurchaseCount = boardPacks * boardsPerPack;
    const boardPurchaseLinearM = round(boardPurchaseCount * boardLengthM, 6);
    const boardLeftoverCount = round(
      Math.max(0, boardPurchaseCount - boardReservedNeed),
      6,
    );
    const jointCount = Math.max(0, baseBoardPurchase - rowCount);

    const materials: MaterialResult[] = [
      {
        name: `${BOARD_TYPE_LABELS[boardType]} ${formatRuNumber(
          boardWidthMm,
          0,
        )}×${formatRuNumber(boardLengthMm, 0)} мм`,
        subtitle:
          offcutReuseMode === 0
            ? `Безопасный раскрой ${formatRuNumber(rowCount)} рядов; ${formatRuNumber(
                boardReservePercent,
              )}% запаса; ${formatRuNumber(boardsPerPack)} шт/уп.`
            : `Перенос обрезков подтверждён раскладкой; ${formatRuNumber(
                boardReservePercent,
              )}% запаса; ${formatRuNumber(boardsPerPack)} шт/уп.`,
        quantity: baseBoardExact,
        unit: "шт",
        withReserve: boardReservedNeed,
        purchaseQty: boardPurchaseCount,
        category: "Доска",
        packageInfo: {
          count: boardPacks,
          size: boardsPerPack,
          packageUnit: boardsPerPack === 1 ? "досок" : "упаковок",
        },
        highlight: true,
      },
    ];

    const substructureEnabled =
      clampInteger(readNumber(inputs.substructureEnabled, 0), 0, 1) === 1;
    const projectLagLengthM = substructureEnabled
      ? clamp(readNumber(inputs.projectLagLengthM, 0), 0, 100000)
      : 0;
    const lagReservePercent = clamp(
      readNumber(inputs.lagReservePercent, 0),
      0,
      30,
    );
    const lagLengthM = clamp(readNumber(inputs.lagLengthM, 3), 0.1, 30);
    const lagRequiredM = round(
      projectLagLengthM * (1 + lagReservePercent / 100),
      6,
    );
    const lagPieces = ceilPositive(lagRequiredM / lagLengthM);
    const lagPurchaseM = round(lagPieces * lagLengthM, 6);
    const lagLeftoverM = round(Math.max(0, lagPurchaseM - lagRequiredM), 6);

    if (substructureEnabled && projectLagLengthM > 0) {
      materials.push({
        name: "Лаги выбранной системы",
        subtitle: `Проектная длина ${formatRuNumber(
          projectLagLengthM,
        )} м; товарная лага ${formatRuNumber(lagLengthM)} м`,
        quantity: round(projectLagLengthM, 6),
        unit: "м",
        withReserve: lagRequiredM,
        purchaseQty: lagPurchaseM,
        category: "Подконструкция",
        packageInfo: {
          count: lagPieces,
          size: lagLengthM,
          packageUnit: "лаг",
        },
      });
    }

    const fastenersEnabled =
      clampInteger(readNumber(inputs.fastenersEnabled, 0), 0, 1) === 1;
    const projectClipCount = fastenersEnabled
      ? clampInteger(readNumber(inputs.projectClipCount, 0), 0, 1000000)
      : 0;
    const projectScrewCount = fastenersEnabled
      ? clampInteger(readNumber(inputs.projectScrewCount, 0), 0, 1000000)
      : 0;
    const fastenerReservePercent = clamp(
      readNumber(inputs.fastenerReservePercent, 0),
      0,
      30,
    );
    const clipPackCount = clampInteger(
      readNumber(inputs.clipPackCount, 100),
      1,
      100000,
    );
    const fastenerPackCount = clampInteger(
      readNumber(inputs.fastenerPackCount, 100),
      1,
      100000,
    );
    const clipRequiredCount = round(
      projectClipCount * (1 + fastenerReservePercent / 100),
      6,
    );
    const clipPacks = ceilPositive(clipRequiredCount / clipPackCount);
    const clipPurchaseCount = clipPacks * clipPackCount;
    const screwRequiredCount = round(
      projectScrewCount * (1 + fastenerReservePercent / 100),
      6,
    );
    const screwPacks = ceilPositive(screwRequiredCount / fastenerPackCount);
    const screwPurchaseCount = screwPacks * fastenerPackCount;

    if (fastenersEnabled && projectClipCount > 0) {
      materials.push({
        name:
          boardType === 0
            ? "Монтажные клипсы выбранной системы"
            : "Скрытый крепёж выбранной системы",
        subtitle: "Количество перенесено из проектной схемы настила",
        quantity: projectClipCount,
        unit: "шт",
        withReserve: clipRequiredCount,
        purchaseQty: clipPurchaseCount,
        category: "Крепёж",
        packageInfo: {
          count: clipPacks,
          size: clipPackCount,
          packageUnit: "упаковок",
        },
      });
    }

    if (fastenersEnabled && projectScrewCount > 0) {
      materials.push({
        name: "Саморезы для выбранной системы",
        subtitle:
          "Материал, диаметр и длина приняты проектом; калькулятор округляет только введённое количество до упаковки",
        quantity: projectScrewCount,
        unit: "шт",
        withReserve: screwRequiredCount,
        purchaseQty: screwPurchaseCount,
        category: "Крепёж",
        packageInfo: {
          count: screwPacks,
          size: fastenerPackCount,
          packageUnit: "упаковок",
        },
      });
    }

    const withTreatment = clampInteger(
      readNumber(inputs.withTreatment, 0),
      0,
      2,
    );
    const treatmentRate = clamp(
      readNumber(inputs.treatmentRateLPerM2PerLayer, 0.1),
      0.001,
      10,
    );
    const treatmentLayers = clampInteger(
      readNumber(inputs.treatmentLayers, 2),
      1,
      10,
    );
    const treatmentCanL = clamp(
      readNumber(inputs.treatmentCanL, 2.5),
      0.01,
      1000,
    );
    const treatmentReservePercent = clamp(
      readNumber(inputs.treatmentReservePercent, 0),
      0,
      30,
    );
    const treatmentBaseL = round(
      withTreatment > 0 ? area * treatmentRate * treatmentLayers : 0,
      6,
    );
    const treatmentRequiredL = round(
      treatmentBaseL * (1 + treatmentReservePercent / 100),
      6,
    );
    const treatmentCans = ceilPositive(treatmentRequiredL / treatmentCanL);
    const treatmentPurchaseL = round(treatmentCans * treatmentCanL, 6);

    if (withTreatment > 0) {
      materials.push({
        name: TREATMENT_LABELS[withTreatment],
        subtitle: `${formatRuNumber(
          treatmentRate,
          3,
        )} л/м² на слой × ${formatRuNumber(treatmentLayers)} сл.; паспортный ввод`,
        quantity: treatmentBaseL,
        unit: "л",
        withReserve: treatmentRequiredL,
        purchaseQty: treatmentPurchaseL,
        category: "Обработка",
        packageInfo: {
          count: treatmentCans,
          size: treatmentCanL,
          packageUnit: "банок",
        },
      });
    }

    const geotextileEnabled =
      clampInteger(readNumber(inputs.geotextileEnabled, 0), 0, 1) === 1;
    const projectGeotextileAreaM2 = geotextileEnabled
      ? clamp(readNumber(inputs.projectGeotextileAreaM2, 0), 0, 100000)
      : 0;
    const geotextileReservePercent = clamp(
      readNumber(inputs.geotextileReservePercent, 0),
      0,
      30,
    );
    const geotextileRollM2 = clamp(
      readNumber(inputs.geotextileRollM2, 50),
      0.1,
      10000,
    );
    const geotextileRequiredM2 = round(
      projectGeotextileAreaM2 * (1 + geotextileReservePercent / 100),
      6,
    );
    const geotextileRolls = ceilPositive(
      geotextileRequiredM2 / geotextileRollM2,
    );
    const geotextilePurchaseM2 = round(
      geotextileRolls * geotextileRollM2,
      6,
    );

    if (geotextileEnabled && projectGeotextileAreaM2 > 0) {
      materials.push({
        name: "Геотекстиль по проекту основания",
        subtitle: `Проектная площадь ${formatRuNumber(
          projectGeotextileAreaM2,
        )} м²; рулон ${formatRuNumber(geotextileRollM2)} м²`,
        quantity: round(projectGeotextileAreaM2, 6),
        unit: "м²",
        withReserve: geotextileRequiredM2,
        purchaseQty: geotextilePurchaseM2,
        category: "Основание",
        packageInfo: {
          count: geotextileRolls,
          size: geotextileRollM2,
          packageUnit: "рулонов",
        },
      });
    }

    const requestedAccuracyMode = inputs.accuracyMode as
      | AccuracyMode
      | undefined;
    const accuracyMode =
      requestedAccuracyMode &&
      requestedAccuracyMode in ACCURACY_MODE_LABELS
        ? requestedAccuracyMode
        : DEFAULT_ACCURACY_MODE;

    const scenario: CalculatorScenario = {
      exact_need: boardReservedNeed,
      purchase_quantity: boardPurchaseCount,
      leftover: boardLeftoverCount,
      assumptions: [
        `formula_version:${WEB_FORMULA_VERSION}`,
        `row_count:${rowCount}`,
        `offcut_reuse_mode:${offcutReuseMode}`,
        `explicit_reserve_percent:${boardReservePercent}`,
        `boards_per_pack:${boardsPerPack}`,
      ],
      key_factors: {
        explicit_reserve_percent: boardReservePercent,
        hidden_multiplier: 1,
      },
      buy_plan: {
        package_label: "board-pack",
        package_size: boardsPerPack,
        packages_count: boardPacks,
        unit: "шт",
      },
    };

    const warnings: string[] = [
      "Калькулятор не проектирует несущую подконструкцию, опоры, основание, допустимые нагрузки и крепление лаг. Лаги появляются только по готовой проектной длине.",
      "Уклон основания, водоотвод, вентиляция под настилом, контакт с грунтом и защита от увлажнения должны быть решены проектом.",
      "Рабочую ширину, зазоры, допустимые пролёты, крепёж и ограничения применения сверяйте с инструкцией производителя выбранной системы.",
      "Стыки досок требуют допустимой разбежки и опоры под каждым концом; общий расчёт досок не назначает дополнительные лаги автоматически.",
      "MIN/REC/MAX и режим точности совпадают: поверх выбранного раскроя, явного запаса и фасовки скрытые коэффициенты не применяются.",
    ];

    if (offcutReuseMode === 1) {
      warnings.push(
        "Оптимистичный перенос обрезков применён только математически: подтвердите направление, пропил, схему стыков и пригодность каждого остатка в инструменте раскладки.",
      );
    }
    if (jointCount > 0) {
      warnings.push(
        `До явного запаса раскрой содержит не менее ${jointCount} соединений досок; проект должен определить их положение и подконструкцию.`,
      );
    }
    if (!substructureEnabled || !fastenersEnabled) {
      warnings.push(
        "Выключенные лаги или крепёж не означают, что они не нужны: позиции не включены без проектной ведомости.",
      );
    }
    if (substructureEnabled && projectLagLengthM === 0) {
      warnings.push(
        "Лаги включены, но проектная длина равна нулю — позиция не добавлена.",
      );
    }
    if (
      fastenersEnabled &&
      projectClipCount === 0 &&
      projectScrewCount === 0
    ) {
      warnings.push(
        "Крепёж включён, но оба проектных количества равны нулю — позиции не добавлены.",
      );
    }
    if (geotextileEnabled && projectGeotextileAreaM2 === 0) {
      warnings.push(
        "Геотекстиль включён, но проектная площадь равна нулю — позиция не добавлена.",
      );
    }
    if (boardType !== 0 && withTreatment === 0) {
      warnings.push(
        "Для деревянного настила обработка не выбрана: проверьте заводскую защиту, влажность и инструкцию материала.",
      );
    }
    if (area > 50) {
      warnings.push(
        "Для настила более 50 м² особенно важны отдельная раскладка, температурные разрывы, водоотвод и разбивка подконструкции.",
      );
    }

    const summaryCards: SummaryCard[] = [
      {
        icon: "▭",
        label: "Площадь настила",
        value: formatRuNumber(area),
        unit: "м²",
        hint: `${formatRuNumber(length)} × ${formatRuNumber(width)} м`,
        tone: "violet",
      },
      {
        icon: "≡",
        label: "Рядов доски",
        value: formatRuNumber(rowCount),
        unit: pluralRu(rowCount, "ряд", "ряда", "рядов"),
        hint: `модуль ${formatRuNumber(boardWidthMm + gapMm)} мм`,
        tone: "slate",
      },
      {
        icon: "◫",
        label: "Досок к покупке",
        value: formatRuNumber(boardPurchaseCount),
        unit: pluralRu(
          boardPurchaseCount,
          "доска",
          "доски",
          "досок",
        ),
        hint:
          boardsPerPack === 1
            ? `${formatRuNumber(boardPurchaseCount)} шт поштучно`
            : `${formatRuNumber(boardPacks)} ${pluralRu(
                boardPacks,
                "упаковка",
                "упаковки",
                "упаковок",
              )} × ${formatRuNumber(boardsPerPack)} шт`,
        tone: "emerald",
      },
    ];

    return {
      materials,
      totals: {
        length: round(length, 3),
        width: round(width, 3),
        area,
        boardType,
        boardLength: round(boardLengthMm, 3),
        boardWidth: round(boardWidthMm, 3),
        gap: round(gapMm, 3),
        boardPitch: round(boardPitchM, 6),
        offcutReuseMode,
        boardReservePercent: round(boardReservePercent, 3),
        boardsPerPack,
        rowCount,
        boardsPerRow,
        safeBaseBoards,
        baseBoardExact,
        baseBoardPurchase,
        totalBoardLinearM,
        baseCutWasteM,
        jointCount,
        boardReservedNeed,
        boardPacks,
        boardPurchaseCount,
        boardPurchaseLinearM,
        boardLeftoverCount,
        substructureEnabled: substructureEnabled ? 1 : 0,
        projectLagLengthM: round(projectLagLengthM, 6),
        lagReservePercent: round(lagReservePercent, 3),
        lagLengthM: round(lagLengthM, 6),
        lagRequiredM,
        lagPieces,
        lagPurchaseM,
        lagLeftoverM,
        fastenersEnabled: fastenersEnabled ? 1 : 0,
        projectClipCount,
        clipRequiredCount,
        clipPacks,
        clipPurchaseCount,
        projectScrewCount,
        screwRequiredCount,
        screwPacks,
        screwPurchaseCount,
        fastenerReservePercent: round(fastenerReservePercent, 3),
        withTreatment,
        treatmentRate: round(treatmentRate, 6),
        treatmentLayers,
        treatmentBaseL,
        treatmentRequiredL,
        treatmentCans,
        treatmentPurchaseL,
        geotextileEnabled: geotextileEnabled ? 1 : 0,
        projectGeotextileAreaM2: round(projectGeotextileAreaM2, 6),
        geotextileReservePercent: round(geotextileReservePercent, 3),
        geotextileRollM2: round(geotextileRollM2, 6),
        geotextileRequiredM2,
        geotextileRolls,
        geotextilePurchaseM2,
        minExactNeed: scenario.exact_need,
        recExactNeed: scenario.exact_need,
        maxExactNeed: scenario.exact_need,
        minPurchase: scenario.purchase_quantity,
        recPurchase: scenario.purchase_quantity,
        maxPurchase: scenario.purchase_quantity,
      },
      warnings,
      practicalNotes: [
        offcutReuseMode === 0
          ? "Безопасный режим начинает каждый ряд целой доской и не обещает использование остатка в другом ряду"
          : "Перенос обрезков экономит доску только при подтверждённой раскладке, допустимой разбежке и опорах под стыками",
        "Поменяйте длину и ширину местами, чтобы сравнить два направления досок, затем подтвердите решение визуальной раскладкой",
        "Лаги, крепёж, основание и обработка считаются только из введённых проектных или паспортных данных",
      ],
      scenarios: {
        MIN: { ...scenario },
        REC: { ...scenario },
        MAX: { ...scenario },
      },
      formulaVersion: WEB_FORMULA_VERSION,
      canonicalSpecId: terraceSpec.calculator_id,
      accuracyMode,
      accuracyExplanation: {
        mode: accuracyMode,
        modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
        combinedMultiplier: 1,
        appliedModifiers: [],
        notes: [
          "Режим точности не добавляет скрытых коэффициентов: раскрой, запас и фасовка заданы пользователем",
        ],
      },
      summaryCards,
    };
  },
  formulaDescription: `
**Как считается настил:**
- Ряды = округление вверх ((ширина поперёк досок + зазор) / (рабочая ширина доски + зазор))
- Безопасный раскрой = ряды × целые доски на каждый ряд
- Перенос обрезков = суммарная длина рядов / товарная длина; применять только по подтверждённой раскладке
- Явный запас применяется один раз после раскроя
- Покупка округляется вверх до фактической неделимой пачки
- Лаги, крепёж, обработка и геотекстиль считаются только после явного включения
  `,
  howToUse: [
    "Задайте длину ряда вдоль досок и ширину настила поперёк досок",
    "Перенесите товарную длину, рабочую ширину и зазор из паспорта выбранного профиля",
    "Выберите безопасный раскрой или подтвердите перенос обрезков визуальной схемой",
    "Укажите собственный запас и число досок в неделимой пачке",
    "Добавьте лаги, крепёж, обработку и геотекстиль только по готовым проектным и паспортным данным",
  ],
  faq: [
    {
      question: "Сколько террасной доски нужно на площадку 5×3 м?",
      answer:
        "При направлении рядов вдоль 5 м, рабочей ширине 150 мм, зазоре 5 мм и доске 3 м получается 20 рядов и 40 досок в безопасном раскрое без запаса. Запас и неделимую пачку задайте отдельно. Для экономного раскроя постройте реальную схему стыков.",
    },
    {
      question: "Почему лаги не считаются автоматически по шагу?",
      answer:
        "Шаг рядовых лаг не определяет всю подконструкцию. Края, стыки досок, ступени, нагрузки, тип основания и ограничения конкретного профиля требуют проектной схемы. Поэтому калькулятор принимает суммарную готовую длину лаг.",
    },
    {
      question: "Можно ли переносить обрезки в следующий ряд?",
      answer:
        "Только если конкретный остаток пригоден по длине, схема сохраняет допустимую разбежку, а оба конца опираются и крепятся по инструкции системы. Переключатель даёт математическую нижнюю оценку, но не строит узлы.",
    },
    {
      question: "Зачем вводить рабочую ширину и зазор отдельно?",
      answer:
        "Число рядов зависит от закрываемой ширины доски и принятого зазора. Номинальные размеры и требования к зазорам различаются у материалов и производителей, поэтому универсальный профиль не подставляется.",
    },
    {
      question: "Почему геотекстиль выключен по умолчанию?",
      answer:
        "Он относится к конкретному решению основания и раскладке полос. Настил может находиться на разных основаниях, поэтому автоматически приравнивать площадь геотекстиля к площади террасы нельзя.",
    },
    {
      question: "Считает ли калькулятор несущую способность террасы?",
      answer:
        "Нет. Он оценивает закупку доски и явно введённых позиций. Нагрузки, балки, опоры, фундамент, подконструкция, уклон и водоотвод должны быть проверены проектом.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что именно считает калькулятор террасной доски</h2>
<p>Основной результат — количество досок по выбранному направлению рядов, фактической длине товара, рабочей ширине, монтажному зазору, явному запасу и неделимой фасовке. Безопасный режим начинает каждый ряд целой доской. Оптимистичный режим объединяет длину рядов и допустим только после проверки <a href="/instrumenty/raskladka-terrasnoy-doski/">визуальной раскладки террасной доски</a>.</p>

<h2>Почему нет универсального шага лаг и расхода крепежа</h2>
<p><a href="https://protect.gost.ru/gost/details/173319f4-ea75-4a7f-baca-76851db03644">ГОСТ Р 59555-2021</a> задаёт технические требования к профильным изделиям из древесно-полимерного композита для наружного применения, но не превращает площадь настила в готовый проект подконструкции. Для деревянных несущих элементов действует область проектирования <a href="https://protect.gost.ru/sp/details/cbac2ac8-70ea-4899-9b3b-1c402a1260d0">СП 64.13330.2017</a>. Поэтому лаги и крепёж появляются только по готовой ведомости.</p>

<h2>Зазоры, стыки и водоотвод зависят от системы</h2>
<p>Даже одна официальная <a href="https://nav.tn.ru/documents/installinstructions/ast_decking_board_velvet_install_instr/">инструкция ТЕХНОНИКОЛЬ по монтажу террасной и палубной доски из лиственницы</a> отдельно описывает уклон для отвода воды, зазоры и две лаги под стыком торцов. Это пример границы: значения конкретного товара нельзя переносить на ДПК, другую толщину или другой крепёж как универсальную норму. Введите данные выбранной системы, а несущую схему и основание проверьте проектом.</p>

<h2>Как разделены чистая потребность и покупка</h2>
<p>Сначала считается геометрический раскрой. Затем один раз применяется выбранный запас. После этого число досок округляется вверх до фактической пачки. Лаги округляются до товарных длин, клипсы и саморезы — до упаковок, обработка — до банок, геотекстиль — до рулонов. Каждый дополнительный материал выключен, пока пользователь не введёт проектные или паспортные данные.</p>
    `,
    faq: [
      {
        question: "Что покажет default 5×3 м?",
        answer:
          "<p>Для рядов длиной 5 м, ширины настила 3 м, доски 3000×150 мм и зазора 5 мм безопасный расчёт даёт <strong>20 рядов и 40 досок</strong> без запаса. В ведомости нет лаг, крепежа, обработки и геотекстиля, пока они не включены по проекту.</p>",
      },
      {
        question: "Как учесть упаковку по 6 досок?",
        answer:
          "<p>При 40 досках до запаса и явном запасе 10% нужно 44 доски. Неделимая пачка по 6 шт округляет покупку до <strong>8 пачек или 48 досок</strong>; остаток относительно потребности с запасом равен 4 доскам.</p>",
      },
      {
        question: "Почему расчёт не обещает готовую террасу?",
        answer:
          "<p>Площадь и формат доски не задают нагрузки, основание, балки, опоры, уклон, водоотвод, вентиляцию, температурные разрывы и узлы стыков. Калькулятор остаётся закупочным инструментом и не подменяет проект несущей и влажностной части.</p>",
      },
    ],
  },
};
