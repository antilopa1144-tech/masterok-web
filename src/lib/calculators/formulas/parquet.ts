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
import parquetSpec from "../../../../configs/calculators/parquet-canonical.v1.json";

const WEB_FORMULA_VERSION = "parquet-web-purchase-v1";

const LAYOUT_LABELS: Record<number, string> = {
  0: "прямая раскладка",
  1: "диагональная раскладка",
  2: "раскладка ёлочкой",
};

const INSTALLATION_LABELS: Record<number, string> = {
  0: "способ монтажа не выбран",
  1: "плавающий монтаж",
  2: "клеевой монтаж",
};

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
  value > 0 ? Math.ceil(value - 1e-10) : 0;

const applyReserve = (value: number, reservePercent: number): number =>
  round(value * (1 + reservePercent / 100), 6);

const formatRuNumber = (value: number, maximumFractionDigits = 3): string =>
  value.toLocaleString("ru-RU", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  });

const pluralRu = (
  value: number,
  one: string,
  few: string,
  many: string,
): string => {
  const integer = Math.abs(Math.trunc(value));
  const mod100 = integer % 100;
  const mod10 = integer % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
};

export const parquetDef: CalculatorDefinition = {
  id: "floors_parquet",
  slug: "parket",
  formulaVersion: WEB_FORMULA_VERSION,
  title: "Калькулятор паркетной доски",
  h1: "Калькулятор паркетной доски — площадь, запас и пачки",
  description:
    "Рассчитайте паркетную доску по площади помещения, своему запасу после раскладки и фактической площади пачки. Подложку, клей и доборные материалы добавляйте только по проектным данным.",
  metaTitle: withSiteMetaTitle("Калькулятор паркетной доски: площадь и пачки"),
  metaDescription:
    "Бесплатный калькулятор паркетной доски: рассчитайте площадь, явный запас, пачки и остаток, а подложку, клей и плинтус — только по проектным данным.",
  category: "flooring",
  categorySlug: "poly",
  tags: [
    "паркетная доска",
    "расчёт паркета",
    "площадь упаковки",
    "пачки паркета",
    "запас на раскрой",
  ],
  popularity: 62,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода площади",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По длине и ширине" },
        { value: 1, label: "Готовая площадь" },
      ],
      group: "Помещение",
      fullWidth: true,
    },
    {
      key: "length",
      label: "Длина прямоугольного участка",
      type: "slider",
      unit: "м",
      min: 1,
      max: 30,
      step: 0.1,
      defaultValue: 5,
      group: "bySize",
      hint: "Для сложного контура выберите готовую площадь по фактическому обмеру.",
    },
    {
      key: "width",
      label: "Ширина прямоугольного участка",
      type: "slider",
      unit: "м",
      min: 1,
      max: 30,
      step: 0.1,
      defaultValue: 4,
      group: "bySize",
    },
    {
      key: "area",
      label: "Готовая площадь покрытия",
      type: "number",
      unit: "м²",
      min: 1,
      max: 5000,
      step: 0.1,
      defaultValue: 20,
      group: "byArea",
      hint:
        "Сумма участков пола после обмера. Ниши, выступы и сложный контур должны быть учтены в этой площади до ввода.",
    },
    {
      key: "layoutType",
      label: "Название принятой раскладки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Прямая" },
        { value: 1, label: "Диагональная" },
        { value: 2, label: "Ёлочка — только совместимая коллекция" },
      ],
      hint:
        "Название не добавляет скрытый процент. Определите пригодные обрезки и запас по фактической карте раскладки, затем введите его отдельным полем.",
      group: "Покрытие",
      fullWidth: true,
    },
    {
      key: "installationMethod",
      label: "Способ монтажа",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Не выбран — считаю только покрытие" },
        { value: 1, label: "Плавающий — по инструкции коллекции" },
        { value: 2, label: "Клеевой — по инструкции и техкарте клея" },
      ],
      hint:
        "Способ монтажа не включает материалы автоматически: состав слоёв зависит от основания и документации выбранной системы.",
      group: "Покрытие",
      fullWidth: true,
    },
    {
      key: "packArea",
      label: "Площадь паркета в одной пачке",
      type: "number",
      unit: "м²",
      min: 0.1,
      max: 20,
      step: 0.001,
      defaultValue: 1.892,
      hint:
        "Введите значение с этикетки выбранного артикула. Не переносите площадь от другой коллекции или формата.",
      group: "Покрытие",
    },
    {
      key: "reservePercent",
      label: "Ваш запас после карты раскладки",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hint:
        "Явный запас применяется один раз до округления по пачкам. MIN/REC/MAX не добавляют второй процент.",
      group: "Покрытие",
    },
    {
      key: "underlaymentEnabled",
      label: "Добавить подложку из проекта",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — подложка не подтверждена" },
        { value: 1, label: "Да — введу площадь и фасовку" },
      ],
      hint:
        "Подложка не назначается автоматически по названию покрытия. Проверьте способ монтажа и совместимость с конкретной доской.",
      group: "Подложка",
      fullWidth: true,
    },
    {
      key: "projectUnderlaymentAreaM2",
      label: "Площадь подложки по проекту",
      type: "number",
      unit: "м²",
      min: 0,
      max: 100000,
      step: 0.1,
      defaultValue: 0,
      hideIf: { key: "underlaymentEnabled", op: "eq", value: 0 },
      hint: "Готовая площадь по схеме полос или плит без запаса этого поля.",
      group: "Подложка",
    },
    {
      key: "underlaymentReservePercent",
      label: "Ваш запас подложки",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hideIf: { key: "underlaymentEnabled", op: "eq", value: 0 },
      group: "Подложка",
    },
    {
      key: "underlaymentPackAreaM2",
      label: "Полезная площадь упаковки подложки",
      type: "number",
      unit: "м²",
      min: 0.1,
      max: 10000,
      step: 0.1,
      defaultValue: 10,
      hideIf: { key: "underlaymentEnabled", op: "eq", value: 0 },
      hint: "Фактическая полезная площадь рулона, пачки или гармошки.",
      group: "Подложка",
    },
    {
      key: "glueEnabled",
      label: "Добавить паркетный клей из техкарты",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — клей не выбран" },
        { value: 1, label: "Да — введу площадь, расход и ведро" },
      ],
      hint:
        "Расход зависит от основания, шпателя, формата доски и выбранного клея. Универсальная норма по площади не подставляется.",
      group: "Клей",
      fullWidth: true,
    },
    {
      key: "projectGlueAreaM2",
      label: "Площадь приклеивания по проекту",
      type: "number",
      unit: "м²",
      min: 0,
      max: 100000,
      step: 0.1,
      defaultValue: 0,
      hideIf: { key: "glueEnabled", op: "eq", value: 0 },
      group: "Клей",
    },
    {
      key: "glueRateKgPerM2",
      label: "Паспортный расход клея",
      type: "number",
      unit: "кг/м²",
      min: 0.01,
      max: 20,
      step: 0.01,
      defaultValue: 1,
      hideIf: { key: "glueEnabled", op: "eq", value: 0 },
      hint: "Значение из технического листа для принятого основания и шпателя.",
      group: "Клей",
    },
    {
      key: "glueReservePercent",
      label: "Ваш запас клея",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hideIf: { key: "glueEnabled", op: "eq", value: 0 },
      group: "Клей",
    },
    {
      key: "glueBucketKg",
      label: "Масса клея в одном ведре",
      type: "number",
      unit: "кг",
      min: 0.1,
      max: 1000,
      step: 0.1,
      defaultValue: 10,
      hideIf: { key: "glueEnabled", op: "eq", value: 0 },
      hint: "Фактическая масса покупаемой упаковки.",
      group: "Клей",
    },
    {
      key: "plinthEnabled",
      label: "Добавить плинтус по обмеру",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — длина не измерена" },
        { value: 1, label: "Да — введу готовую длину и планку" },
      ],
      hint:
        "Калькулятор не восстанавливает периметр квадратом и не вычитает условные дверные проёмы.",
      group: "Доборные",
      fullWidth: true,
    },
    {
      key: "projectPlinthLengthM",
      label: "Длина плинтуса по обмеру",
      type: "number",
      unit: "м",
      min: 0,
      max: 100000,
      step: 0.1,
      defaultValue: 0,
      hideIf: { key: "plinthEnabled", op: "eq", value: 0 },
      hint: "Сумма реально закрываемых участков без проёмов и незакрываемых зон.",
      group: "Доборные",
    },
    {
      key: "plinthReservePercent",
      label: "Ваш запас плинтуса",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hideIf: { key: "plinthEnabled", op: "eq", value: 0 },
      group: "Доборные",
    },
    {
      key: "plinthPieceLengthM",
      label: "Товарная длина одной планки",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 30,
      step: 0.1,
      defaultValue: 2.5,
      hideIf: { key: "plinthEnabled", op: "eq", value: 0 },
      hint: "Фактическая длина выбранного плинтуса.",
      group: "Доборные",
    },
    {
      key: "thresholdsEnabled",
      label: "Добавить порожки из проектной ведомости",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — узлы переходов не заданы" },
        { value: 1, label: "Да — введу количество и фасовку" },
      ],
      hint:
        "Порожек не назначается автоматически на каждую дверь: переход может быть беспороговым или иметь другой узел.",
      group: "Доборные",
      fullWidth: true,
    },
    {
      key: "projectThresholdCount",
      label: "Порожков по проекту",
      type: "number",
      unit: "шт",
      min: 0,
      max: 100000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
      hideIf: { key: "thresholdsEnabled", op: "eq", value: 0 },
      group: "Доборные",
    },
    {
      key: "thresholdsPerPack",
      label: "Порожков в неделимой упаковке",
      type: "number",
      unit: "шт",
      min: 1,
      max: 10000,
      step: 1,
      integerOnly: true,
      defaultValue: 1,
      hideIf: { key: "thresholdsEnabled", op: "eq", value: 0 },
      hint: "Если продаются поштучно, оставьте 1.",
      group: "Доборные",
    },
    {
      key: "moistureLayerEnabled",
      label: "Добавить влагозащитный слой по проекту",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — слой не подтверждён" },
        { value: 1, label: "Да — введу площадь и рулон" },
      ],
      hint:
        "Необходимость, тип, нахлёсты и герметизация зависят от основания и инструкции покрытия.",
      group: "Основание",
      fullWidth: true,
    },
    {
      key: "projectMoistureLayerAreaM2",
      label: "Площадь влагозащитного слоя по проекту",
      type: "number",
      unit: "м²",
      min: 0,
      max: 100000,
      step: 0.1,
      defaultValue: 0,
      hideIf: { key: "moistureLayerEnabled", op: "eq", value: 0 },
      group: "Основание",
    },
    {
      key: "moistureLayerReservePercent",
      label: "Ваш запас слоя",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hideIf: { key: "moistureLayerEnabled", op: "eq", value: 0 },
      hint: "Введите принятый запас на нахлёсты и раскрой полотен.",
      group: "Основание",
    },
    {
      key: "moistureLayerRollAreaM2",
      label: "Площадь выбранного рулона",
      type: "number",
      unit: "м²",
      min: 0.1,
      max: 10000,
      step: 0.1,
      defaultValue: 15,
      hideIf: { key: "moistureLayerEnabled", op: "eq", value: 0 },
      hint: "Фактическая площадь одного покупаемого рулона.",
      group: "Основание",
    },
  ],
  calculate(inputs) {
    const inputMode = clampInteger(readNumber(inputs.inputMode, 0), 0, 1);
    const length = clamp(readNumber(inputs.length ?? inputs.roomLength, 5), 1, 30);
    const width = clamp(readNumber(inputs.width ?? inputs.roomWidth, 4), 1, 30);
    const area = inputMode === 0
      ? round(length * width, 6)
      : round(clamp(readNumber(inputs.area, 20), 1, 5000), 6);
    const layoutType = clampInteger(readNumber(inputs.layoutType, 0), 0, 2);
    const installationMethod = clampInteger(
      readNumber(inputs.installationMethod, 0),
      0,
      2,
    );
    const packArea = clamp(readNumber(inputs.packArea, 1.892), 0.1, 20);
    const reservePercent = clamp(readNumber(inputs.reservePercent, 0), 0, 30);

    const coverageRequiredAreaM2 = applyReserve(area, reservePercent);
    const parquetPacks = ceilPositive(coverageRequiredAreaM2 / packArea);
    const parquetPurchaseAreaM2 = round(parquetPacks * packArea, 6);
    const parquetLeftoverAreaM2 = round(
      Math.max(0, parquetPurchaseAreaM2 - coverageRequiredAreaM2),
      6,
    );

    const underlaymentEnabled = readNumber(inputs.underlaymentEnabled, 0) > 0;
    const projectUnderlaymentAreaM2 = underlaymentEnabled
      ? clamp(readNumber(inputs.projectUnderlaymentAreaM2, 0), 0, 100000)
      : 0;
    const underlaymentReservePercent = underlaymentEnabled
      ? clamp(readNumber(inputs.underlaymentReservePercent, 0), 0, 30)
      : 0;
    const underlaymentPackAreaM2 = clamp(
      readNumber(inputs.underlaymentPackAreaM2, 10),
      0.1,
      10000,
    );
    const underlaymentRequiredAreaM2 = applyReserve(
      projectUnderlaymentAreaM2,
      underlaymentReservePercent,
    );
    const underlaymentPacks = ceilPositive(
      underlaymentRequiredAreaM2 / underlaymentPackAreaM2,
    );
    const underlaymentPurchaseAreaM2 = round(
      underlaymentPacks * underlaymentPackAreaM2,
      6,
    );

    const glueEnabled = readNumber(inputs.glueEnabled, 0) > 0;
    const projectGlueAreaM2 = glueEnabled
      ? clamp(readNumber(inputs.projectGlueAreaM2, 0), 0, 100000)
      : 0;
    const glueRateKgPerM2 = clamp(
      readNumber(inputs.glueRateKgPerM2, 1),
      0.01,
      20,
    );
    const glueReservePercent = glueEnabled
      ? clamp(readNumber(inputs.glueReservePercent, 0), 0, 30)
      : 0;
    const glueBucketKg = clamp(readNumber(inputs.glueBucketKg, 10), 0.1, 1000);
    const glueExactKg = round(projectGlueAreaM2 * glueRateKgPerM2, 6);
    const glueRequiredKg = applyReserve(glueExactKg, glueReservePercent);
    const glueBuckets = ceilPositive(glueRequiredKg / glueBucketKg);
    const gluePurchaseKg = round(glueBuckets * glueBucketKg, 6);

    const plinthEnabled = readNumber(inputs.plinthEnabled, 0) > 0;
    const projectPlinthLengthM = plinthEnabled
      ? clamp(readNumber(inputs.projectPlinthLengthM, 0), 0, 100000)
      : 0;
    const plinthReservePercent = plinthEnabled
      ? clamp(readNumber(inputs.plinthReservePercent, 0), 0, 30)
      : 0;
    const plinthPieceLengthM = clamp(
      readNumber(inputs.plinthPieceLengthM, 2.5),
      0.1,
      30,
    );
    const plinthRequiredM = applyReserve(
      projectPlinthLengthM,
      plinthReservePercent,
    );
    const plinthPieces = ceilPositive(plinthRequiredM / plinthPieceLengthM);
    const plinthPurchaseM = round(plinthPieces * plinthPieceLengthM, 6);

    const thresholdsEnabled = readNumber(inputs.thresholdsEnabled, 0) > 0;
    const projectThresholdCount = thresholdsEnabled
      ? clampInteger(readNumber(inputs.projectThresholdCount, 0), 0, 100000)
      : 0;
    const thresholdsPerPack = clampInteger(
      readNumber(inputs.thresholdsPerPack, 1),
      1,
      10000,
    );
    const thresholdPacks = ceilPositive(projectThresholdCount / thresholdsPerPack);
    const thresholdPurchaseCount = thresholdPacks * thresholdsPerPack;

    const moistureLayerEnabled = readNumber(inputs.moistureLayerEnabled, 0) > 0;
    const projectMoistureLayerAreaM2 = moistureLayerEnabled
      ? clamp(readNumber(inputs.projectMoistureLayerAreaM2, 0), 0, 100000)
      : 0;
    const moistureLayerReservePercent = moistureLayerEnabled
      ? clamp(readNumber(inputs.moistureLayerReservePercent, 0), 0, 30)
      : 0;
    const moistureLayerRollAreaM2 = clamp(
      readNumber(inputs.moistureLayerRollAreaM2, 15),
      0.1,
      10000,
    );
    const moistureLayerRequiredAreaM2 = applyReserve(
      projectMoistureLayerAreaM2,
      moistureLayerReservePercent,
    );
    const moistureLayerRolls = ceilPositive(
      moistureLayerRequiredAreaM2 / moistureLayerRollAreaM2,
    );
    const moistureLayerPurchaseAreaM2 = round(
      moistureLayerRolls * moistureLayerRollAreaM2,
      6,
    );

    const materials: MaterialResult[] = [
      {
        name: `Паркетная доска (${formatRuNumber(packArea)} м² в пачке)`,
        subtitle: `${LAYOUT_LABELS[layoutType]}; явный запас ${formatRuNumber(reservePercent)}%`,
        quantity: area,
        unit: "м²",
        withReserve: coverageRequiredAreaM2,
        purchaseQty: parquetPurchaseAreaM2,
        category: "Покрытие",
        packageInfo: {
          count: parquetPacks,
          size: packArea,
          packageUnit: "пачек",
        },
        highlight: true,
      },
    ];

    if (underlaymentEnabled && projectUnderlaymentAreaM2 > 0) {
      materials.push({
        name: "Подложка по проекту",
        subtitle: `Полезная площадь упаковки ${formatRuNumber(underlaymentPackAreaM2)} м²`,
        quantity: round(projectUnderlaymentAreaM2, 6),
        unit: "м²",
        withReserve: underlaymentRequiredAreaM2,
        purchaseQty: underlaymentPurchaseAreaM2,
        category: "Подложка",
        packageInfo: {
          count: underlaymentPacks,
          size: underlaymentPackAreaM2,
          packageUnit: "упаковок",
        },
      });
    }

    if (glueEnabled && projectGlueAreaM2 > 0) {
      materials.push({
        name: "Клей для паркета по техкарте",
        subtitle: `${formatRuNumber(projectGlueAreaM2)} м² × ${formatRuNumber(glueRateKgPerM2)} кг/м²`,
        quantity: glueExactKg,
        unit: "кг",
        withReserve: glueRequiredKg,
        purchaseQty: gluePurchaseKg,
        category: "Клей",
        packageInfo: {
          count: glueBuckets,
          size: glueBucketKg,
          packageUnit: "вёдер",
        },
      });
    }

    if (plinthEnabled && projectPlinthLengthM > 0) {
      materials.push({
        name: "Плинтус по обмеру",
        subtitle: `Товарная планка ${formatRuNumber(plinthPieceLengthM)} м`,
        quantity: round(projectPlinthLengthM, 6),
        unit: "м",
        withReserve: plinthRequiredM,
        purchaseQty: plinthPurchaseM,
        category: "Плинтус",
        packageInfo: {
          count: plinthPieces,
          size: plinthPieceLengthM,
          packageUnit: "планок",
        },
      });
    }

    if (thresholdsEnabled && projectThresholdCount > 0) {
      materials.push({
        name: "Порожки по проекту",
        subtitle: thresholdsPerPack === 1
          ? "Поштучная закупка"
          : `${thresholdsPerPack} шт в неделимой упаковке`,
        quantity: projectThresholdCount,
        unit: "шт",
        withReserve: projectThresholdCount,
        purchaseQty: thresholdPurchaseCount,
        category: "Доборные",
        packageInfo: {
          count: thresholdPacks,
          size: thresholdsPerPack,
          packageUnit: thresholdsPerPack === 1 ? "штук" : "упаковок",
        },
      });
    }

    if (moistureLayerEnabled && projectMoistureLayerAreaM2 > 0) {
      materials.push({
        name: "Влагозащитный слой по проекту",
        subtitle: `Рулон ${formatRuNumber(moistureLayerRollAreaM2)} м²`,
        quantity: round(projectMoistureLayerAreaM2, 6),
        unit: "м²",
        withReserve: moistureLayerRequiredAreaM2,
        purchaseQty: moistureLayerPurchaseAreaM2,
        category: "Основание",
        packageInfo: {
          count: moistureLayerRolls,
          size: moistureLayerRollAreaM2,
          packageUnit: "рулонов",
        },
      });
    }

    const requestedAccuracyMode = inputs.accuracyMode as unknown as
      | AccuracyMode
      | undefined;
    const accuracyMode =
      requestedAccuracyMode &&
      requestedAccuracyMode in ACCURACY_MODE_LABELS
        ? requestedAccuracyMode
        : DEFAULT_ACCURACY_MODE;

    const scenario: CalculatorScenario = {
      exact_need: coverageRequiredAreaM2,
      purchase_quantity: parquetPurchaseAreaM2,
      leftover: parquetLeftoverAreaM2,
      assumptions: [
        `formula_version:${WEB_FORMULA_VERSION}`,
        `layout_type:${layoutType}`,
        `installation_method:${installationMethod}`,
        `explicit_reserve_percent:${reservePercent}`,
        `pack_area_m2:${round(packArea, 6)}`,
      ],
      key_factors: {
        explicit_reserve_percent: reservePercent,
        hidden_multiplier: 1,
      },
      buy_plan: {
        package_label: "parquet-pack",
        package_size: round(packArea, 6),
        packages_count: parquetPacks,
        unit: "м²",
      },
    };

    const warnings: string[] = [
      "Площадь не заменяет карты раскладки: сложный контур, направление света, смещение торцевых стыков, подбор рисунка и пригодность обрезков проверьте по обмеру помещения и инструкции коллекции.",
      "Калькулятор не проверяет основание, влажность, ровность, прочность, совместимость с тёплым полом, максимальный размер поля, деформационные зазоры и узлы примыканий.",
      `Выбрана ${LAYOUT_LABELS[layoutType]}, но её процент отхода не назначен автоматически. В расчёте действует только введённый запас ${formatRuNumber(reservePercent)}%.`,
      `${INSTALLATION_LABELS[installationMethod]}: состав подложки, влагозащиты, грунтовки, клея и других слоёв нужно подтвердить документацией выбранных материалов.`,
      "Скотч, клинья, грунтовка, ремонтные составы, соединители и компенсационные профили автоматически не рассчитаны: их количества и фасовки не заданы.",
    ];

    if (layoutType === 1) {
      warnings.push(
        "Для диагональной раскладки сначала составьте карту рядов и угловых подрезок; общий процент без размеров доски и контура не гарантирует достаточную закупку.",
      );
    }
    if (layoutType === 2) {
      warnings.push(
        "Укладка ёлочкой допустима только для совместимой коллекции и замка; направление элементов, парность и краевые подрезки нужно подтвердить раскладкой производителя.",
      );
    }
    if (reservePercent === 0) {
      warnings.push(
        "Запас покрытия равен 0%. Это допустимо только если карта раскладки, пригодные остатки и возможность добора той же партии уже подтверждены.",
      );
    }
    if (area < 5) {
      warnings.push(
        "На малой площади одна дополнительная пачка даёт большую относительную разницу; ориентируйтесь на фактический раскрой, а не на усреднённый процент.",
      );
    }
    if (underlaymentEnabled && projectUnderlaymentAreaM2 <= 0) {
      warnings.push(
        "Подложка включена, но проектная площадь равна 0 — позиция не добавлена.",
      );
    }
    if (glueEnabled && projectGlueAreaM2 <= 0) {
      warnings.push(
        "Клей включён, но площадь приклеивания равна 0 — позиция не добавлена.",
      );
    }
    if (plinthEnabled && projectPlinthLengthM <= 0) {
      warnings.push(
        "Плинтус включён, но измеренная длина равна 0 — позиция не добавлена.",
      );
    }
    if (thresholdsEnabled && projectThresholdCount <= 0) {
      warnings.push(
        "Порожки включены, но проектное количество равно 0 — позиция не добавлена.",
      );
    }
    if (moistureLayerEnabled && projectMoistureLayerAreaM2 <= 0) {
      warnings.push(
        "Влагозащитный слой включён, но проектная площадь равна 0 — позиция не добавлена.",
      );
    }
    if (installationMethod === 1 && glueEnabled) {
      warnings.push(
        "Для плавающего монтажа включён клей. Проверьте, относится ли он к принятому узлу и допускает ли его инструкция коллекции.",
      );
    }
    if (installationMethod === 2 && underlaymentEnabled) {
      warnings.push(
        "Для клеевого монтажа включена подложка. Проверьте совместимость всей системы по документации покрытия, подложки и клея.",
      );
    }

    const practicalNotes = [
      `Площадь покрытия ${formatRuNumber(area)} м²; после явного запаса ${formatRuNumber(reservePercent)}% требуется ${formatRuNumber(coverageRequiredAreaM2)} м².`,
      `Пачка ${formatRuNumber(packArea)} м²: к покупке ${parquetPacks} ${pluralRu(parquetPacks, "пачка", "пачки", "пачек")} (${formatRuNumber(parquetPurchaseAreaM2)} м²), расчётный остаток ${formatRuNumber(parquetLeftoverAreaM2)} м².`,
      "Заказывайте покрытие одной партии и до вскрытия пачек проверьте артикул, оттенок, формат, комплектность и условия возврата.",
      "Перед монтажом сверьте основание, влажность, климат помещения, акклиматизацию, зазоры и совместимость слоёв с инструкцией конкретной коллекции.",
    ];

    return {
      canonicalSpecId: parquetSpec.calculator_id,
      formulaVersion: WEB_FORMULA_VERSION,
      materials,
      totals: {
        inputMode,
        ...(inputMode === 0
          ? { length: round(length, 6), width: round(width, 6) }
          : {}),
        area,
        layoutType,
        installationMethod,
        packArea: round(packArea, 6),
        reservePercent: round(reservePercent, 3),
        coverageRequiredAreaM2,
        parquetPacks,
        parquetPurchaseAreaM2,
        parquetLeftoverAreaM2,
        projectUnderlaymentAreaM2: round(projectUnderlaymentAreaM2, 6),
        underlaymentRequiredAreaM2,
        underlaymentPacks,
        underlaymentPurchaseAreaM2,
        projectGlueAreaM2: round(projectGlueAreaM2, 6),
        glueExactKg,
        glueRequiredKg,
        glueBuckets,
        gluePurchaseKg,
        projectPlinthLengthM: round(projectPlinthLengthM, 6),
        plinthRequiredM,
        plinthPieces,
        plinthPurchaseM,
        projectThresholdCount,
        thresholdPacks,
        thresholdPurchaseCount,
        projectMoistureLayerAreaM2: round(projectMoistureLayerAreaM2, 6),
        moistureLayerRequiredAreaM2,
        moistureLayerRolls,
        moistureLayerPurchaseAreaM2,
        minExactNeedArea: coverageRequiredAreaM2,
        recExactNeedArea: coverageRequiredAreaM2,
        maxExactNeedArea: coverageRequiredAreaM2,
        minPurchaseArea: parquetPurchaseAreaM2,
        recPurchaseArea: parquetPurchaseAreaM2,
        maxPurchaseArea: parquetPurchaseAreaM2,
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
          "Режим точности не меняет закупку: учитываются только введённые площадь, явный запас и фактическая площадь пачки.",
        ],
      },
      summaryCards: [
        {
          icon: "▤",
          label: "К покупке",
          value: String(parquetPacks),
          unit: pluralRu(parquetPacks, "пачка", "пачки", "пачек"),
          hint: `${formatRuNumber(parquetPurchaseAreaM2)} м² по ${formatRuNumber(packArea)} м²`,
          tone: "violet",
        },
        {
          icon: "□",
          label: "С запасом",
          value: formatRuNumber(coverageRequiredAreaM2),
          unit: "м²",
          hint: `${formatRuNumber(area)} м² + ${formatRuNumber(reservePercent)}%`,
          tone: "amber",
        },
        {
          icon: "≈",
          label: "Остаток после округления",
          value: formatRuNumber(parquetLeftoverAreaM2),
          unit: "м²",
          hint: "от потребности с вашим запасом",
          tone: "emerald",
        },
      ],
    };
  },
  formulaDescription: `
**Паркетная доска:** площадь покрытия умножается только на введённый пользователем запас после карты раскладки. Затем результат округляется вверх по фактической площади пачки.

**Сопутствующие материалы:** подложка, клей, плинтус, порожки и влагозащитный слой по умолчанию выключены. Каждая позиция считается только по отдельному проектному количеству, явному запасу и фактической фасовке.

**Граница модели:** название прямой, диагональной или раскладки ёлочкой не назначает универсальный процент. Калькулятор не проектирует основание, деформационные швы, технологию монтажа и узлы примыканий.
  `,
  howToUse: [
    "Введите длину и ширину прямоугольного участка или готовую площадь сложного помещения",
    "Выберите название принятой раскладки и способ монтажа без автоматического добавления материалов",
    "Перенесите с этикетки площадь одной пачки и задайте собственный запас после карты раскладки",
    "При необходимости включите только подтверждённые проектом материалы и введите их количества и фасовки",
    "Нажмите «Рассчитать» — получите потребность, целые пачки, площадь к покупке и расчётный остаток",
  ],
  expertTips: [
    {
      title: "Сначала раскладка, потом процент",
      content:
        "Для диагонали и ёлочки расход определяется не названием узора, а размерами элементов, контуром, направлением рядов, стыками и пригодностью обрезков. Зафиксируйте карту раскладки и только после этого вводите запас.",
      author: "Мастер по напольным покрытиям",
    },
    {
      title: "Пачка важнее бренда",
      content:
        "У одной марки разные коллекции имеют разную площадь пачки. Переносите значение с этикетки конкретного артикула и заказывайте материал одной партии.",
      author: "Прораб",
    },
  ],
  faq: [
    {
      question: "Почему калькулятор не добавляет запас по типу раскладки автоматически?",
      answer:
        "Потому что одинаковое название раскладки не задаёт размеры доски, контур помещения, направление рядов, смещение стыков и пригодность обрезков. Введите запас, который следует из вашей карты раскладки и условий добора партии.",
    },
    {
      question: "Почему по умолчанию нет подложки, клея и плинтуса?",
      answer:
        "Состав зависит от способа монтажа, основания и инструкции конкретной коллекции. Включите только подтверждённые позиции и укажите их проектную площадь или длину, паспортный расход и реальную фасовку.",
    },
    {
      question: "Что показывает расчётный остаток?",
      answer:
        "Это разница между площадью купленных целых пачек и потребностью после введённого запаса. Он не гарантирует, что отдельные доски или обрезки подойдут к конкретным рядам и участкам рисунка.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор паркетной доски</h2>
<p>Основной результат строится из трёх проверяемых величин: площади покрытия, вашего явного запаса после карты раскладки и площади одной пачки выбранного артикула.</p>
<p><strong>N<sub>пачек</sub> = &lceil;S × (1 + З/100) / S<sub>пачки</sub>&rceil;</strong></p>
<ul>
  <li><strong>S</strong> — измеренная площадь покрытия;</li>
  <li><strong>З</strong> — введённый пользователем запас после проверки раскладки;</li>
  <li><strong>S<sub>пачки</sub></strong> — площадь одной фактической пачки с этикетки.</li>
</ul>
<p>Потребность и площадь к покупке показываются отдельно. Округление выполняется только на последнем этапе до целых пачек, а MIN/REC/MAX не добавляют скрытый процент.</p>

<h2>Почему раскладка не равна фиксированному запасу</h2>
<p>Прямая, диагональная и раскладка ёлочкой описывают направление и рисунок, но не задают размеры элементов, контур помещения, смещение стыков, подбор ламелей и пригодность обрезков. Для ёлочки дополнительно нужна совместимая коллекция. Поэтому калькулятор предупреждает о сложности, но применяет только введённый запас.</p>

<h2>Как считаются дополнительные материалы</h2>
<ul>
  <li><strong>Подложка</strong> — по проектной площади, отдельному запасу и полезной площади упаковки;</li>
  <li><strong>Паркетный клей</strong> — по площади приклеивания, паспортному расходу, запасу и массе ведра;</li>
  <li><strong>Плинтус</strong> — по измеренной закрываемой длине, запасу и товарной длине планки;</li>
  <li><strong>Порожки</strong> — по готовому проектному количеству и неделимой фасовке;</li>
  <li><strong>Влагозащитный слой</strong> — по принятой схеме, запасу на нахлёсты и площади рулона.</li>
</ul>
<p>Скотч, клинья, грунтовка, соединители и компенсационные профили не назначаются автоматически: без проектных узлов и фасовок это была бы фиктивная ведомость.</p>

<h2>Нормативная и техническая граница</h2>
<ul>
  <li><a href="https://protect.gost.ru/gost/details/0c43efed-c787-4403-bd67-d536850409b2" target="_blank" rel="noopener noreferrer">ГОСТ 862.3-2020</a> устанавливает технические требования к многослойному паркету;</li>
  <li><a href="https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939" target="_blank" rel="noopener noreferrer">СП 71.13330.2017</a> регулирует производство и приёмку изоляционных, отделочных работ и покрытий полов;</li>
  <li><a href="https://www.tarkett.ru/documents/filter/role-is-installation/category-is-parketnaya-doska/apply/" target="_blank" rel="noopener noreferrer">официальные инструкции Tarkett по паркетной доске</a> показывают, что основание и монтаж нужно сверять с конкретной коллекцией.</li>
</ul>
<p>Стандарт на изделие и площадь помещения не заменяют инструкцию производителя, проверку влажности и ровности основания, карту раскладки, деформационные зазоры и проект узлов перехода.</p>
`,
    faq: [
      {
        question: "Сколько пачек паркетной доски нужно на 20 м²?",
        answer:
          "<p>Сначала задайте запас по своей раскладке и площадь конкретной пачки. Например, при запасе 10% требуется 22 м². Если пачка содержит 1,892 м², нужно 12 целых пачек, то есть 22,704 м² к покупке. Расчётный остаток 0,704 м² не гарантирует пригодность отдельных досок в раскладке.</p>",
      },
      {
        question: "Можно ли автоматически назначить подложку под паркетную доску?",
        answer:
          "<p>Нет. Подложка относится к принятой системе плавающего монтажа и должна быть совместима с покрытием и основанием. При клеевом монтаже действуют другая подготовка и техкарта клея. Поэтому калькулятор добавляет подложку только после явного включения и ввода проектной площади.</p>",
      },
      {
        question: "Почему калькулятор не считает компенсационные профили по площади?",
        answer:
          "<p>Одна площадь не задаёт длину и форму помещения, дверные переходы, максимальный размер поля и ограничения выбранной коллекции. Количество и расположение швов нужно определить по геометрии и инструкции, а не по универсальной границе площади.</p>",
      },
    ],
  },
};
