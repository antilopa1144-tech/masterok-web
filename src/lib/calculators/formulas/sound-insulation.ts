import type { CalculatorDefinition, CalculatorScenario, MaterialResult } from "../types";
import { withSiteMetaTitle } from "../meta";
import { ACCURACY_MODE_LABELS, DEFAULT_ACCURACY_MODE, type AccuracyMode } from "../../../../engine/accuracy";
import soundInsulationSpec from "../../../../configs/calculators/sound-insulation-canonical.v1.json";

const WEB_FORMULA_VERSION = "sound-insulation-web-product-v1";

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

export const soundInsulationDef: CalculatorDefinition = {
  id: "insulation_sound",
  slug: "zvukoizolyaciya",
  formulaVersion: WEB_FORMULA_VERSION,
  title: "Калькулятор звукоизоляции",
  h1: "Калькулятор звукоизоляции — материалы по фактической фасовке",
  description: "Рассчитайте основной звукоизоляционный материал по площади и фактической упаковке, а обшивку, крепёж и другие позиции добавляйте только по проектной ведомости.",
  metaTitle: withSiteMetaTitle("Калькулятор звукоизоляции: материалы и фасовка"),
  metaDescription: "Бесплатный калькулятор звукоизоляции: рассчитайте основной материал по площади, явному запасу и фактической фасовке без скрытой комплектной системы.",
  category: "interior",
  categorySlug: "otdelka",
  tags: ["звукоизоляция", "шумоизоляция", "звукоизоляция стен", "звукоизоляция потолка", "звукоизоляция пола"],
  popularity: 58,
  complexity: 3,
  fields: [
    {
      key: "area",
      label: "Площадь изолируемой поверхности",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 2000,
      step: 1,
      defaultValue: 25,
      hint: "Чистая площадь выбранной поверхности. Ниши, проёмы, колонны и сложный раскрой учитывайте в обмере и явном запасе.",
      fullWidth: true,
    },
    {
      key: "systemType",
      label: "Какой основной материал считается",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Каркасная облицовка стены — акустический заполнитель" },
        { value: 1, label: "Стена или потолок — панели выбранной системы" },
        { value: 2, label: "Плавающий пол — упругий материал под стяжку" },
        { value: 3, label: "Каркасный потолок — акустический заполнитель" },
      ],
      hint: "Выбор меняет только товарную модель расчёта. Он не подбирает конструкцию, не подтверждает Rw/Lnw и не назначает состав системы.",
      fullWidth: true,
    },
    {
      key: "reservePercent",
      label: "Ваш запас основного материала",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: [
        { value: 0, label: "0% — чистая площадь" },
        { value: 5, label: "5%" },
        { value: 10, label: "10%" },
        { value: 15, label: "15%" },
        { value: 20, label: "20%" },
        { value: 30, label: "30%" },
      ],
      hint: "Выберите по раскрою, повторному использованию обрезков и требованию одной партии. MIN/REC/MAX не добавляют второй процент.",
    },
    {
      key: "acousticLayers",
      label: "Слоёв акустического заполнителя",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "1 слой по проекту" },
        { value: 2, label: "2 слоя по проекту" },
        { value: 3, label: "3 слоя по проекту" },
      ],
      hideIf: [
        { key: "systemType", op: "eq", value: 1 },
        { key: "systemType", op: "eq", value: 2 },
      ],
      hint: "Число слоёв должно следовать из принятого узла. Калькулятор не выбирает толщину и плотность материала.",
    },
    {
      key: "acousticPackCoverageM2",
      label: "Площадь материала в одной упаковке",
      type: "number",
      unit: "м²",
      min: 0.01,
      max: 1000,
      step: 0.01,
      defaultValue: 6,
      hideIf: [
        { key: "systemType", op: "eq", value: 1 },
        { key: "systemType", op: "eq", value: 2 },
      ],
      hint: "Перенесите фактическую площадь с упаковки выбранной толщины. 6 м² — видимый стартовый пример, а не универсальная фасовка.",
    },
    {
      key: "panelWidthMm",
      label: "Рабочая ширина панели",
      type: "number",
      unit: "мм",
      min: 50,
      max: 3000,
      step: 1,
      defaultValue: 600,
      hideIf: { key: "systemType", op: "ne", value: 1 },
      hint: "Используйте рабочий размер конкретной панели с учётом её соединения, а не размер другой модификации.",
    },
    {
      key: "panelHeightMm",
      label: "Рабочая высота панели",
      type: "number",
      unit: "мм",
      min: 50,
      max: 5000,
      step: 1,
      defaultValue: 1200,
      hideIf: { key: "systemType", op: "ne", value: 1 },
      hint: "Фактический рабочий размер выбранного изделия. Калькулятор строит только прямоугольный площадной эквивалент.",
    },
    {
      key: "panelsPerPack",
      label: "Панелей в неделимой упаковке",
      type: "number",
      unit: "шт",
      min: 1,
      max: 500,
      step: 1,
      integerOnly: true,
      defaultValue: 1,
      hideIf: { key: "systemType", op: "ne", value: 1 },
      hint: "Оставьте 1 при поштучной продаже. Для неделимой упаковки введите её фактическую кратность.",
    },
    {
      key: "floorRollCoverageM2",
      label: "Площадь выбранного рулона или упаковки",
      type: "number",
      unit: "м²",
      min: 0.01,
      max: 5000,
      step: 0.01,
      defaultValue: 10,
      hideIf: { key: "systemType", op: "ne", value: 2 },
      hint: "Фактическая площадь упругого материала нужного типа и толщины. 10 м² — редактируемый пример.",
      fullWidth: true,
    },
    {
      key: "sheetEnabled",
      label: "Добавить обшивочные листы из принятого узла",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — состав обшивки не задан" },
        { value: 1, label: "Да — введу лист, слои и запас" },
      ],
      hideIf: { key: "systemType", op: "eq", value: 2 },
      hint: "Калькулятор не назначает ГКЛ, ГВЛ или акустический триплекс автоматически. Включайте только по спецификации выбранной системы.",
      fullWidth: true,
    },
    {
      key: "sheetLayers",
      label: "Число слоёв обшивочных листов",
      type: "select",
      defaultValue: 2,
      options: [
        { value: 1, label: "1 слой" },
        { value: 2, label: "2 слоя" },
        { value: 3, label: "3 слоя" },
        { value: 4, label: "4 слоя" },
      ],
      hideIf: [
        { key: "systemType", op: "eq", value: 2 },
        { key: "sheetEnabled", op: "eq", value: 0 },
      ],
      hint: "Введите фактическое число слоёв на рассчитываемой стороне. Для перегородки не переносите автоматически обшивку второй стороны.",
    },
    {
      key: "sheetLengthM",
      label: "Длина выбранного листа",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 10,
      step: 0.01,
      defaultValue: 2.5,
      hideIf: [
        { key: "systemType", op: "eq", value: 2 },
        { key: "sheetEnabled", op: "eq", value: 0 },
      ],
      hint: "Фактический товарный размер листа.",
    },
    {
      key: "sheetWidthM",
      label: "Ширина выбранного листа",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 5,
      step: 0.01,
      defaultValue: 1.2,
      hideIf: [
        { key: "systemType", op: "eq", value: 2 },
        { key: "sheetEnabled", op: "eq", value: 0 },
      ],
      hint: "Фактический товарный размер; раскладка листов и смещение стыков отдельно не моделируются.",
    },
    {
      key: "sheetReservePercent",
      label: "Ваш запас обшивочных листов",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: [
        { value: 0, label: "0%" },
        { value: 5, label: "5%" },
        { value: 10, label: "10%" },
        { value: 15, label: "15%" },
        { value: 20, label: "20%" },
      ],
      hideIf: [
        { key: "systemType", op: "eq", value: 2 },
        { key: "sheetEnabled", op: "eq", value: 0 },
      ],
      hint: "Отдельный явный запас по карте раскроя листов.",
    },
    {
      key: "projectItemsEnabled",
      label: "Добавить готовые позиции из проектной ведомости",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — ведомость узлов не задана" },
        { value: 1, label: "Да — введу готовые длины и количества" },
      ],
      hint: "Введите уже определённые проектом значения. Калькулятор не восстанавливает профиль, виброузлы, крепёж и герметизацию из одной площади.",
      fullWidth: true,
    },
    {
      key: "projectProfileLengthM",
      label: "Суммарная длина профиля по проекту",
      type: "number",
      unit: "м",
      min: 0,
      max: 50000,
      step: 0.1,
      defaultValue: 0,
      hideIf: [
        { key: "projectItemsEnabled", op: "eq", value: 0 },
        { key: "systemType", op: "eq", value: 1 },
        { key: "systemType", op: "eq", value: 2 },
      ],
      hint: "Готовая длина всех типов профиля из спецификации. Разные типы лучше считать отдельными запусками.",
    },
    {
      key: "profileBarLengthM",
      label: "Длина одного товарного профиля",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 20,
      step: 0.1,
      defaultValue: 3,
      hideIf: [
        { key: "projectItemsEnabled", op: "eq", value: 0 },
        { key: "systemType", op: "eq", value: 1 },
        { key: "systemType", op: "eq", value: 2 },
      ],
      hint: "Фактическая длина одной планки выбранного профиля.",
    },
    {
      key: "projectMountCount",
      label: "Виброузлы или подвесы по проекту",
      type: "number",
      unit: "шт",
      min: 0,
      max: 100000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
      hideIf: [
        { key: "projectItemsEnabled", op: "eq", value: 0 },
        { key: "systemType", op: "eq", value: 1 },
        { key: "systemType", op: "eq", value: 2 },
      ],
      hint: "Готовое количество по схеме каркаса, нагрузке и паспорту узла.",
    },
    {
      key: "projectFastenerCount",
      label: "Крепёж по проектной ведомости",
      type: "number",
      unit: "шт",
      min: 0,
      max: 1000000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
      hideIf: { key: "projectItemsEnabled", op: "eq", value: 0 },
      hint: "Введите число одного конкретного вида крепежа. Разные типоразмеры считайте отдельными запусками.",
    },
    {
      key: "fastenersPerPack",
      label: "Крепежа в упаковке",
      type: "number",
      unit: "шт",
      min: 1,
      max: 100000,
      step: 1,
      integerOnly: true,
      defaultValue: 200,
      hideIf: { key: "projectItemsEnabled", op: "eq", value: 0 },
      hint: "Фактическая фасовка выбранного вида крепежа.",
    },
    {
      key: "projectTapeLengthM",
      label: "Длина ленты по проектной схеме",
      type: "number",
      unit: "м",
      min: 0,
      max: 100000,
      step: 0.1,
      defaultValue: 0,
      hideIf: { key: "projectItemsEnabled", op: "eq", value: 0 },
      hint: "Суммарная длина конкретной ленты по примыканиям и узлам проекта; периметр из площади не угадывается.",
    },
    {
      key: "tapeRollLengthM",
      label: "Длина ленты в одном рулоне",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 10000,
      step: 0.1,
      defaultValue: 30,
      hideIf: { key: "projectItemsEnabled", op: "eq", value: 0 },
      hint: "Фактическая длина неделимого рулона.",
    },
    {
      key: "projectSealantCartridges",
      label: "Картриджи герметика по проекту или техкарте",
      type: "number",
      unit: "шт",
      min: 0,
      max: 100000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
      hideIf: { key: "projectItemsEnabled", op: "eq", value: 0 },
      hint: "Готовое количество для конкретного герметика, сечения шва и схемы нанесения.",
    },
    {
      key: "screedEnabled",
      label: "Добавить смесь плавающей стяжки по паспорту",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — стяжка не рассчитана" },
        { value: 1, label: "Да — введу паспортный расход" },
      ],
      hideIf: { key: "systemType", op: "ne", value: 2 },
      hint: "Толщина, масса, прочность, армирование и нагрузка на перекрытие должны быть уже проверены. Калькулятор не подставляет универсальную плотность.",
      fullWidth: true,
    },
    {
      key: "screedConsumptionKgM2",
      label: "Паспортный расход смеси на выбранную толщину",
      type: "number",
      unit: "кг/м²",
      min: 0,
      max: 1000,
      step: 0.1,
      defaultValue: 0,
      hideIf: [
        { key: "systemType", op: "ne", value: 2 },
        { key: "screedEnabled", op: "eq", value: 0 },
      ],
      hint: "Расход уже должен соответствовать выбранному продукту и проектной толщине. Ноль исключает смесь из результата.",
    },
    {
      key: "screedReservePercent",
      label: "Ваш запас смеси",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: [
        { value: 0, label: "0%" },
        { value: 5, label: "5%" },
        { value: 10, label: "10%" },
        { value: 15, label: "15%" },
      ],
      hideIf: [
        { key: "systemType", op: "ne", value: 2 },
        { key: "screedEnabled", op: "eq", value: 0 },
      ],
      hint: "Явный запас по условиям основания и работ.",
    },
    {
      key: "screedBagKg",
      label: "Масса одного мешка смеси",
      type: "number",
      unit: "кг",
      min: 0.1,
      max: 2000,
      step: 0.1,
      defaultValue: 25,
      hideIf: [
        { key: "systemType", op: "ne", value: 2 },
        { key: "screedEnabled", op: "eq", value: 0 },
      ],
      hint: "Фактическая масса мешка выбранной смеси.",
    },
  ],
  calculate(inputs) {
    const area = clamp(readNumber(inputs.area, 25), 1, 2000);
    const systemType = clampInteger(readNumber(inputs.systemType ?? inputs.system, 0), 0, 3);
    const reservePercent = clamp(readNumber(inputs.reservePercent, 0), 0, 30);
    const reserveMultiplier = 1 + reservePercent / 100;
    const acousticLayers = clampInteger(readNumber(inputs.acousticLayers, 1), 1, 3);
    const acousticPackCoverageM2 = clamp(readNumber(inputs.acousticPackCoverageM2, 6), 0.01, 1000);
    const panelWidthMm = clamp(readNumber(inputs.panelWidthMm, 600), 50, 3000);
    const panelHeightMm = clamp(readNumber(inputs.panelHeightMm, 1200), 50, 5000);
    const panelsPerPack = clampInteger(readNumber(inputs.panelsPerPack, 1), 1, 500);
    const floorRollCoverageM2 = clamp(readNumber(inputs.floorRollCoverageM2, 10), 0.01, 5000);
    const panelWorkingAreaM2 = panelWidthMm * panelHeightMm / 1_000_000;

    const primaryNeedM2 = systemType === 0 || systemType === 3
      ? area * acousticLayers
      : area;
    const primaryReservedM2 = primaryNeedM2 * reserveMultiplier;

    let primaryCleanItems = 0;
    let primaryReservedItems = 0;
    let primaryPurchasePackages = 0;
    let primaryPurchaseItems = 0;
    let primaryPurchasedM2 = 0;
    let primaryLeftoverItems = 0;

    const materials: MaterialResult[] = [];

    if (systemType === 1) {
      primaryCleanItems = area / panelWorkingAreaM2;
      primaryReservedItems = primaryCleanItems * reserveMultiplier;
      primaryPurchasePackages = ceilPositive(primaryReservedItems / panelsPerPack);
      primaryPurchaseItems = primaryPurchasePackages * panelsPerPack;
      primaryPurchasedM2 = primaryPurchaseItems * panelWorkingAreaM2;
      primaryLeftoverItems = Math.max(0, primaryPurchaseItems - primaryReservedItems);

      materials.push({
        name: "Панели выбранной системы — по рабочим размерам",
        quantity: round(primaryCleanItems),
        unit: "шт",
        withReserve: round(primaryReservedItems),
        purchaseQty: primaryPurchaseItems,
        category: "Основной материал",
        packageInfo: panelsPerPack > 1
          ? { count: primaryPurchasePackages, size: panelsPerPack, packageUnit: "упаковок" }
          : undefined,
        subtitle: `${formatRuNumber(area)} м² / ${formatRuNumber(panelWorkingAreaM2, 4)} м² × ${formatRuNumber(reserveMultiplier, 2)} = ${formatRuNumber(primaryReservedItems)} шт; к покупке ${primaryPurchaseItems} шт. Рабочие размеры и комплектность сверяйте по выбранной модели.`,
        highlight: true,
      });
    } else {
      const unitCoverageM2 = systemType === 2 ? floorRollCoverageM2 : acousticPackCoverageM2;
      primaryCleanItems = primaryNeedM2 / unitCoverageM2;
      primaryReservedItems = primaryReservedM2 / unitCoverageM2;
      primaryPurchasePackages = ceilPositive(primaryReservedItems);
      primaryPurchaseItems = primaryPurchasePackages;
      primaryPurchasedM2 = primaryPurchasePackages * unitCoverageM2;
      primaryLeftoverItems = Math.max(0, primaryPurchasePackages - primaryReservedItems);
      const packageUnit = systemType === 2 ? "рулонов" : "упаковок";
      const primaryName = systemType === 2
        ? "Звукоизоляционный материал плавающего пола — по площади рулона"
        : systemType === 3
          ? "Акустический материал каркасного потолка — по площади упаковки"
          : "Акустический материал каркасной облицовки — по площади упаковки";

      materials.push({
        name: primaryName,
        quantity: round(primaryNeedM2),
        unit: "м²",
        withReserve: round(primaryReservedM2),
        purchaseQty: round(primaryPurchasedM2),
        category: "Основной материал",
        packageInfo: {
          count: primaryPurchasePackages,
          size: unitCoverageM2,
          packageUnit,
        },
        subtitle: `${formatRuNumber(primaryNeedM2)} м² × ${formatRuNumber(reserveMultiplier, 2)} = ${formatRuNumber(primaryReservedM2)} м²; ${primaryPurchasePackages} ${pluralRu(primaryPurchasePackages, systemType === 2 ? "рулон" : "упаковка", systemType === 2 ? "рулона" : "упаковки", packageUnit)} × ${formatRuNumber(unitCoverageM2)} м².`,
        highlight: true,
      });
    }

    const primaryLeftoverM2 = Math.max(0, primaryPurchasedM2 - primaryReservedM2);

    const sheetEnabled = systemType !== 2
      ? clampInteger(readNumber(inputs.sheetEnabled, 0), 0, 1)
      : 0;
    const sheetLayers = clampInteger(readNumber(inputs.sheetLayers, 2), 1, 4);
    const sheetLengthM = clamp(readNumber(inputs.sheetLengthM, 2.5), 0.1, 10);
    const sheetWidthM = clamp(readNumber(inputs.sheetWidthM, 1.2), 0.1, 5);
    const sheetReservePercent = clamp(readNumber(inputs.sheetReservePercent, 0), 0, 20);
    const sheetAreaM2 = sheetLengthM * sheetWidthM;
    const cleanSheetNeed = sheetEnabled === 1 ? area * sheetLayers / sheetAreaM2 : 0;
    const reservedSheetNeed = cleanSheetNeed * (1 + sheetReservePercent / 100);
    const sheetPurchaseCount = ceilPositive(reservedSheetNeed);

    if (sheetPurchaseCount > 0) {
      materials.push({
        name: "Обшивочный лист из принятой спецификации",
        quantity: round(cleanSheetNeed),
        unit: "шт",
        withReserve: round(reservedSheetNeed),
        purchaseQty: sheetPurchaseCount,
        category: "Обшивка",
        subtitle: `${formatRuNumber(area)} м² × ${sheetLayers} ${pluralRu(sheetLayers, "слой", "слоя", "слоёв")} / ${formatRuNumber(sheetAreaM2)} м² × ${formatRuNumber(1 + sheetReservePercent / 100, 2)}; карта раскроя и смещение стыков не моделируются.`,
      });
    }

    const projectItemsEnabled = clampInteger(readNumber(inputs.projectItemsEnabled, 0), 0, 1);
    const projectProfileLengthM = projectItemsEnabled === 1 && (systemType === 0 || systemType === 3)
      ? clamp(readNumber(inputs.projectProfileLengthM, 0), 0, 50000)
      : 0;
    const profileBarLengthM = clamp(readNumber(inputs.profileBarLengthM, 3), 0.1, 20);
    const profileBars = ceilPositive(projectProfileLengthM / profileBarLengthM);
    const projectMountCount = projectItemsEnabled === 1 && (systemType === 0 || systemType === 3)
      ? clampInteger(readNumber(inputs.projectMountCount, 0), 0, 100000)
      : 0;
    const projectFastenerCount = projectItemsEnabled === 1
      ? clampInteger(readNumber(inputs.projectFastenerCount, 0), 0, 1_000_000)
      : 0;
    const fastenersPerPack = clampInteger(readNumber(inputs.fastenersPerPack, 200), 1, 100000);
    const fastenerPacks = ceilPositive(projectFastenerCount / fastenersPerPack);
    const projectTapeLengthM = projectItemsEnabled === 1
      ? clamp(readNumber(inputs.projectTapeLengthM, 0), 0, 100000)
      : 0;
    const tapeRollLengthM = clamp(readNumber(inputs.tapeRollLengthM, 30), 0.1, 10000);
    const tapeRolls = ceilPositive(projectTapeLengthM / tapeRollLengthM);
    const projectSealantCartridges = projectItemsEnabled === 1
      ? clampInteger(readNumber(inputs.projectSealantCartridges, 0), 0, 100000)
      : 0;

    if (profileBars > 0) {
      materials.push({
        name: "Профиль по проектной ведомости",
        quantity: round(projectProfileLengthM / profileBarLengthM),
        unit: "шт",
        withReserve: round(projectProfileLengthM / profileBarLengthM),
        purchaseQty: profileBars,
        category: "Проектные позиции",
        subtitle: `${formatRuNumber(projectProfileLengthM)} м / ${formatRuNumber(profileBarLengthM)} м; типы профилей не смешивайте в одной строке.`,
      });
    }
    if (projectMountCount > 0) {
      materials.push({
        name: "Виброузлы по проектной ведомости",
        quantity: projectMountCount,
        unit: "шт",
        withReserve: projectMountCount,
        purchaseQty: projectMountCount,
        category: "Проектные позиции",
        subtitle: "Количество перенесено из принятой схемы без автоматической нормы на квадратный метр.",
      });
    }
    if (fastenerPacks > 0) {
      materials.push({
        name: "Крепёж по проектной ведомости",
        quantity: projectFastenerCount,
        unit: "шт",
        withReserve: projectFastenerCount,
        purchaseQty: fastenerPacks * fastenersPerPack,
        category: "Проектные позиции",
        packageInfo: { count: fastenerPacks, size: fastenersPerPack, packageUnit: "упаковок" },
        subtitle: `${projectFastenerCount} шт по спецификации; ${fastenerPacks} ${pluralRu(fastenerPacks, "упаковка", "упаковки", "упаковок")} по ${fastenersPerPack} шт.`,
      });
    }
    if (tapeRolls > 0) {
      materials.push({
        name: "Лента по проектной ведомости",
        quantity: round(projectTapeLengthM),
        unit: "м",
        withReserve: round(projectTapeLengthM),
        purchaseQty: round(tapeRolls * tapeRollLengthM),
        category: "Проектные позиции",
        packageInfo: { count: tapeRolls, size: tapeRollLengthM, packageUnit: "рулонов" },
        subtitle: `${formatRuNumber(projectTapeLengthM)} м по схеме; ${tapeRolls} ${pluralRu(tapeRolls, "рулон", "рулона", "рулонов")} по ${formatRuNumber(tapeRollLengthM)} м.`,
      });
    }
    if (projectSealantCartridges > 0) {
      materials.push({
        name: "Герметик по проектной ведомости",
        quantity: projectSealantCartridges,
        unit: "шт",
        withReserve: projectSealantCartridges,
        purchaseQty: projectSealantCartridges,
        category: "Проектные позиции",
        subtitle: "Количество перенесено из техкарты выбранного герметика и фактической схемы швов.",
      });
    }

    const screedEnabled = systemType === 2
      ? clampInteger(readNumber(inputs.screedEnabled, 0), 0, 1)
      : 0;
    const screedConsumptionKgM2 = clamp(readNumber(inputs.screedConsumptionKgM2, 0), 0, 1000);
    const screedReservePercent = clamp(readNumber(inputs.screedReservePercent, 0), 0, 15);
    const screedBagKg = clamp(readNumber(inputs.screedBagKg, 25), 0.1, 2000);
    const screedCleanKg = screedEnabled === 1 ? area * screedConsumptionKgM2 : 0;
    const screedReservedKg = screedCleanKg * (1 + screedReservePercent / 100);
    const screedBags = ceilPositive(screedReservedKg / screedBagKg);

    if (screedBags > 0) {
      materials.push({
        name: "Смесь по паспортному расходу на проектную толщину",
        quantity: round(screedCleanKg),
        unit: "кг",
        withReserve: round(screedReservedKg),
        purchaseQty: round(screedBags * screedBagKg),
        category: "Плавающая стяжка",
        packageInfo: { count: screedBags, size: screedBagKg, packageUnit: "мешков" },
        subtitle: `${formatRuNumber(area)} м² × ${formatRuNumber(screedConsumptionKgM2)} кг/м² × ${formatRuNumber(1 + screedReservePercent / 100, 2)}; расход должен уже соответствовать продукту и проектной толщине.`,
      });
    }

    const requestedAccuracyMode = inputs.accuracyMode as unknown as AccuracyMode | undefined;
    const accuracyMode = requestedAccuracyMode && requestedAccuracyMode in ACCURACY_MODE_LABELS
      ? requestedAccuracyMode
      : DEFAULT_ACCURACY_MODE;

    const scenarioExactNeed = systemType === 1 ? primaryReservedItems : primaryReservedM2;
    const scenarioPurchaseQuantity = systemType === 1 ? primaryPurchaseItems : primaryPurchasedM2;
    const scenarioLeftover = systemType === 1 ? primaryLeftoverItems : primaryLeftoverM2;
    const scenarioPackageSize = systemType === 1
      ? panelsPerPack
      : systemType === 2
        ? floorRollCoverageM2
        : acousticPackCoverageM2;
    const scenario: CalculatorScenario = {
      exact_need: round(scenarioExactNeed),
      purchase_quantity: round(scenarioPurchaseQuantity),
      leftover: round(scenarioLeftover),
      assumptions: [
        `formula_version:${WEB_FORMULA_VERSION}`,
        `system_type:${systemType}`,
        `area_m2:${round(area)}`,
        `reserve_percent:${round(reservePercent)}`,
        `package_size:${round(scenarioPackageSize)}`,
        "acoustic_result_not_calculated:true",
      ],
      key_factors: { field_multiplier: 1 },
      buy_plan: {
        package_label: systemType === 1 ? "selected-panel-pack" : systemType === 2 ? "selected-floor-roll" : "selected-acoustic-pack",
        package_size: round(scenarioPackageSize),
        packages_count: primaryPurchasePackages,
        unit: systemType === 1 ? "шт" : "м²",
      },
    };

    const warnings = [
      "Калькулятор считает закупочное количество, но не вычисляет Rw, ΔRw, Lnw или ΔLnw и не подтверждает выполнение СП 51.13330.2011. Для акустического результата нужны исходная конструкция, полный испытанный узел, примыкания и монтаж.",
      `Запас ${formatRuNumber(reservePercent)}% задан пользователем и применяется один раз. MIN/REC/MAX и режим точности не добавляют скрытые множители.`,
      "Название варианта задаёт только способ товарного расчёта. Оно не выбирает комплектную систему, допустимое основание, массу, толщину, пожарные характеристики, крепёж и несущую способность.",
      "ГКЛ/ГВЛ, профиль, виброузлы, крепёж, ленты, герметик, мембраны и другие компоненты не назначаются автоматически: их состав и количество зависят от спецификации комплектной системы и проектных узлов.",
    ];

    if (systemType === 1) {
      warnings.push("Панели рассчитаны прямоугольным площадным эквивалентом. Направление монтажа, пазы, подрезка рядов, штатный крепёж, дополнительная обшивка и требования к основанию сверяются по инструкции конкретной модели.");
    }
    if (systemType === 2) {
      warnings.push("Для плавающего пола отдельно проверяют ровность основания, упругий материал, кромочные узлы, разделительный слой, массу и прочность стяжки, армирование, деформационные швы и нагрузку на перекрытие.");
    }
    if (sheetEnabled === 1) {
      warnings.push("Листы посчитаны только по площади и числу слоёв. Реальная раскладка, смещение стыков, проёмы и пригодность обрезков могут изменить количество.");
    }
    if (projectItemsEnabled === 0) {
      warnings.push("Проектные позиции выключены: основной материал не является полной ведомостью системы.");
    }
    if (screedEnabled === 1 && screedConsumptionKgM2 === 0) {
      warnings.push("Смесь включена, но паспортный расход равен 0 кг/м², поэтому мешки не добавлены.");
    }

    const practicalNotes = [
      `Площадь поверхности: ${formatRuNumber(area)} м²; явный запас основного материала: ${formatRuNumber(reservePercent)}%.`,
      systemType === 1
        ? `Рабочая площадь панели: ${formatRuNumber(panelWorkingAreaM2, 4)} м²; расчётная потребность с запасом: ${formatRuNumber(primaryReservedItems)} шт; к покупке ${primaryPurchaseItems} шт.`
        : `Потребность с учётом слоёв и запаса: ${formatRuNumber(primaryReservedM2)} м²; товарное покрытие к покупке: ${formatRuNumber(primaryPurchasedM2)} м².`,
      `Эквивалентный остаток основного материала: ${formatRuNumber(primaryLeftoverM2)} м². Его пригодность зависит от фактического раскроя.`,
      "До заказа выберите испытанный узел под исходную стену, потолок или перекрытие и перенесите его спецификацию в дополнительные поля.",
    ];

    return {
      materials,
      totals: {
        area: round(area),
        systemType,
        reservePercent: round(reservePercent),
        acousticLayers: systemType === 0 || systemType === 3 ? acousticLayers : 0,
        acousticPackCoverageM2: systemType === 0 || systemType === 3 ? round(acousticPackCoverageM2) : 0,
        floorRollCoverageM2: systemType === 2 ? round(floorRollCoverageM2) : 0,
        panelWidthMm: systemType === 1 ? round(panelWidthMm) : 0,
        panelHeightMm: systemType === 1 ? round(panelHeightMm) : 0,
        panelWorkingAreaM2: systemType === 1 ? round(panelWorkingAreaM2) : 0,
        panelsPerPack: systemType === 1 ? panelsPerPack : 0,
        primaryNeedM2: round(primaryNeedM2),
        primaryReservedM2: round(primaryReservedM2),
        primaryCleanItems: round(primaryCleanItems),
        primaryReservedItems: round(primaryReservedItems),
        primaryPurchasePackages,
        primaryPurchaseItems,
        primaryPurchasedM2: round(primaryPurchasedM2),
        primaryLeftoverM2: round(primaryLeftoverM2),
        primaryLeftoverItems: round(primaryLeftoverItems),
        sheetPurchaseCount,
        profileBars,
        projectMountCount,
        fastenerPacks,
        tapeRolls,
        projectSealantCartridges,
        screedBags,
        minExactNeed: round(scenarioExactNeed),
        recExactNeed: round(scenarioExactNeed),
        maxExactNeed: round(scenarioExactNeed),
        minPurchase: round(scenarioPurchaseQuantity),
        recPurchase: round(scenarioPurchaseQuantity),
        maxPurchase: round(scenarioPurchaseQuantity),
      },
      warnings,
      scenarios: { MIN: scenario, REC: scenario, MAX: scenario },
      formulaVersion: WEB_FORMULA_VERSION,
      canonicalSpecId: soundInsulationSpec.calculator_id,
      practicalNotes,
      accuracyMode,
      accuracyExplanation: {
        mode: accuracyMode,
        modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
        combinedMultiplier: 1,
        appliedModifiers: [],
        notes: ["Режим точности не меняет количество: применяются только введённые слои, явные запасы и фактические фасовки."],
      },
      summaryCards: [
        {
          icon: "▧",
          label: "Площадь",
          value: formatRuNumber(area),
          unit: "м²",
          hint: systemType === 0 || systemType === 3 ? `${acousticLayers} ${pluralRu(acousticLayers, "слой", "слоя", "слоёв")}` : "чистая поверхность",
          tone: "violet",
        },
        {
          icon: "+",
          label: "С вашим запасом",
          value: formatRuNumber(systemType === 1 ? primaryReservedItems : primaryReservedM2),
          unit: systemType === 1 ? "шт" : "м²",
          hint: `${formatRuNumber(reservePercent)}%, применяется один раз`,
          tone: "slate",
        },
        {
          icon: "◉",
          label: "Основного к покупке",
          value: formatRuNumber(systemType === 1 ? primaryPurchaseItems : primaryPurchasedM2),
          unit: systemType === 1 ? "шт" : "м²",
          hint: `${primaryPurchasePackages} ${pluralRu(primaryPurchasePackages, systemType === 2 ? "рулон" : "упаковка", systemType === 2 ? "рулона" : "упаковки", systemType === 2 ? "рулонов" : "упаковок")}`,
          tone: "emerald",
        },
      ],
    };
  },
  formulaDescription: `
**Основной материал по фактической фасовке:**
- Каркасная стена или потолок: площадь × число проектных слоёв × (1 + явный запас) → округление до площади реальной упаковки.
- Панельная система: площадь / рабочая площадь панели × (1 + явный запас) → округление до неделимой упаковки.
- Плавающий пол: площадь × (1 + явный запас) → округление до площади фактического рулона или упаковки.

Обшивочные листы считаются только после включения по их реальным размерам и числу слоёв. Профиль, виброузлы, крепёж, ленты, герметик и смесь появляются только из введённой проектной ведомости или паспортного расхода.
  `,
  howToUse: [
    "Введите чистую площадь выбранной поверхности",
    "Выберите товарную модель основного материала",
    "Укажите фактическую площадь упаковки или рабочие размеры панели",
    "Выберите собственный запас после оценки раскроя",
    "Добавьте обшивку и проектные позиции только при наличии спецификации",
    "Сверьте результат с комплектной системой и документацией производителя",
  ],
  faq: [
    {
      question: "Рассчитывает ли калькулятор Rw или снижение ударного шума?",
      answer: "Нет. Он считает количество материалов по введённой фасовке. Акустический результат относится к полному испытанному узлу с конкретным основанием, обшивками, виброразвязкой, примыканиями и монтажом.",
    },
    {
      question: "Почему профиль и крепёж не добавляются автоматически?",
      answer: "Одна площадь не определяет высоту стены, шаг стоек и подвесов, нагрузку, тип профиля, число сторон, проёмы и узлы примыканий. Перенесите готовые длины и количества из спецификации выбранной системы.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что действительно считает калькулятор звукоизоляции</h2>
<p>Это закупочный калькулятор по уже выбранному материалу и принятому узлу. Он переводит площадь в полные упаковки акустического заполнителя, панели или рулоны материала плавающего пола. Запас, число слоёв и фасовка видимы и задаются пользователем.</p>
<p>Калькулятор не вычисляет индексы Rw, ΔRw, Lnw или ΔLnw, не выбирает конструкцию и не подтверждает нормативную звукоизоляцию. Одинаковое название материала не делает произвольный набор компонентов эквивалентом испытанной комплектной системы.</p>

<h2>Прозрачная закупочная формула</h2>
<ul>
  <li><strong>Каркасная облицовка стены или потолка:</strong> площадь умножается на введённое число слоёв и явный запас, затем округляется вверх до фактической площади упаковки.</li>
  <li><strong>Панельная система:</strong> площадь делится на введённую рабочую площадь панели; результат округляется до целой панели или указанной кратности упаковки.</li>
  <li><strong>Плавающий пол:</strong> площадь с явным запасом округляется до площади фактического рулона или упаковки упругого материала.</li>
</ul>
<p>Обшивочные листы можно включить отдельно по фактическим размерам и числу слоёв. Профиль, виброузлы, крепёж, лента и герметик появляются только после переноса готовых проектных значений. Смесь для стяжки считается только по паспортному расходу для уже выбранной толщины.</p>

<h2>Почему одной площади недостаточно для полной системы</h2>
<p>Комплектная система задаёт исходное основание, массу и число обшивок, тип и шаг каркаса, виброузлы, крепёж, ленты, герметизацию, проходки и примыкания. Например, официальная система КНАУФ С 112 публикует собственный состав на 1 м² и прямо отмечает, что количества ориентировочные, не учитывают потери на раскрой и уточняются по проекту. Панели ЗИПС имеют отдельные инструкции по основанию, расположению панелей, виброузлам, лентам и дополнительной обшивке. Эти спецификации нельзя заменить одним универсальным набором коэффициентов.</p>

<h2>Плавающий пол — отдельный проектный узел</h2>
<p>Упругий слой работает вместе с самонесущей стяжкой и отсутствием жёстких связей со стенами, колоннами и коммуникациями. Тип материала, ровность основания, кромочные участки, разделительный слой, толщина, прочность, армирование, деформационные швы и нагрузка на перекрытие проверяются по проекту и техкарте выбранной системы. Поэтому калькулятор не назначает универсальные 50 мм и условную плотность смеси.</p>

<h2>Первичные нормативные и системные источники</h2>
<ul>
  <li><a href="https://protect.gost.ru/sp/details/04d467f1-c956-4238-8bc6-a066ecb17990" rel="noopener noreferrer">СП 51.13330.2011 «Защита от шума»</a> устанавливает требования к защите от шума и нормативным параметрам акустической среды.</li>
  <li><a href="https://protect.gost.ru/gost/details/1e7aea97-2a9d-4647-9ddc-7e466b85724a" rel="noopener noreferrer">ГОСТ 27296-2012</a> устанавливает методы лабораторных и натурных измерений звукоизоляции ограждающих конструкций.</li>
  <li><a href="https://www.knauf.ru/systems/peregorodki/s-112-dfh3ir/" rel="noopener noreferrer">Комплектная система КНАУФ С 112</a> показывает, что состав и расход материалов относятся к конкретной конструкции и требуют уточнения по проекту.</li>
  <li><a href="https://www.acoustic.ru/productions/zips/zips_z4/" rel="noopener noreferrer">Официальная страница ЗИПС-Z4</a> содержит область применения и отдельную инструкцию монтажа выбранной панельной системы.</li>
  <li><a href="https://www.acoustic.ru/albom_solutions/flats/zvukoizolyaciya_pola_kvartiry/" rel="noopener noreferrer">Официальные решения Acoustic Group для звукоизоляции пола</a> показывают различие конструкций плавающего пола, материалов и испытанных узлов.</li>
</ul>
`,
    faq: [
      {
        question: "Сколько упаковок акустического материала нужно на 25 м²?",
        answer: "<p>При одном слое, запасе 0% и фактической площади упаковки 6 м² требуется <strong>25 м²</strong>, то есть <strong>5 упаковок</strong> и 30 м² товарного покрытия. Эквивалентный остаток — 5 м²; его реальная пригодность зависит от размеров плит и раскроя каркаса.</p>",
      },
      {
        question: "Можно ли по этому расчёту обещать конкретное значение Rw?",
        answer: "<p>Нет. Значение относится к полному испытанному узлу и исходной конструкции. Замена листа, профиля, крепежа, толщины заполнения, примыкания или нарушение монтажа меняет результат.</p>",
      },
      {
        question: "Как посчитать панели ЗИПС или другой бескаркасной системы?",
        answer: "<p>Введите рабочие размеры конкретной панели, явный запас и кратность упаковки. Калькулятор даст площадной эквивалент. Раскладку рядов, подрезку, штатный крепёж, ленты, основание и дополнительную обшивку проверьте по инструкции выбранной модификации.</p>",
      },
      {
        question: "Почему калькулятор не назначает толщину плавающей стяжки?",
        answer: "<p>Толщина и масса связаны с выбранным упругим материалом, прочностью и армированием, нагрузкой на перекрытие, площадью участков и деформационными швами. После принятия узла можно ввести паспортный расход смеси на проектную толщину и массу мешка.</p>",
      },
    ],
  },
};
