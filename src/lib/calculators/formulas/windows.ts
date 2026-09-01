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
import windowsSpec from "../../../../configs/calculators/windows-canonical.v1.json";

const WEB_FORMULA_VERSION = "windows-web-joint-v1";

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

const RESERVE_OPTIONS = [
  { value: 0, label: "0% — без запаса" },
  { value: 5, label: "5%" },
  { value: 10, label: "10%" },
  { value: 15, label: "15%" },
  { value: 20, label: "20%" },
  { value: 30, label: "30%" },
];

export const windowsDef: CalculatorDefinition = {
  id: "windows_install",
  slug: "ustanovka-okon",
  formulaVersion: WEB_FORMULA_VERSION,
  title: "Калькулятор материалов для монтажа окон",
  h1: "Калькулятор монтажа окон — пена и материалы по фактическому шву",
  description:
    "Рассчитайте монтажную пену по периметру, ширине и глубине шва и полезному выходу выбранного баллона. Ленты, крепёж и откосы добавляйте только по проектной ведомости.",
  metaTitle: withSiteMetaTitle("Калькулятор монтажа окон: пена и герметизация"),
  metaDescription:
    "Бесплатный калькулятор монтажа окон: рассчитайте пену по геометрии шва и полезному выходу баллона, а ленты, крепёж и откосы — по проектным данным.",
  category: "interior",
  categorySlug: "otdelka",
  tags: [
    "монтаж окон",
    "установка окон",
    "монтажная пена",
    "монтажный шов",
    "герметизация окон",
    "откосы",
  ],
  popularity: 65,
  complexity: 3,
  fields: [
    {
      key: "windowCount",
      label: "Количество одинаковых оконных блоков",
      type: "slider",
      unit: "шт",
      min: 1,
      max: 100,
      step: 1,
      defaultValue: 5,
      hint:
        "Если размеры или монтажные зазоры различаются, рассчитайте каждую группу отдельно и сложите закупку.",
      group: "Центральный слой шва",
      fullWidth: true,
    },
    {
      key: "windowWidth",
      label: "Ширина оконного блока",
      type: "number",
      unit: "мм",
      min: 100,
      max: 6000,
      step: 1,
      defaultValue: 1200,
      hint: "Фактический наружный габарит рассчитываемого блока.",
      group: "Центральный слой шва",
    },
    {
      key: "windowHeight",
      label: "Высота оконного блока",
      type: "number",
      unit: "мм",
      min: 100,
      max: 6000,
      step: 1,
      defaultValue: 1400,
      hint: "Фактический наружный габарит рассчитываемого блока.",
      group: "Центральный слой шва",
    },
    {
      key: "jointGapWidthMm",
      label: "Средняя ширина монтажного зазора",
      type: "number",
      unit: "мм",
      min: 1,
      max: 200,
      step: 1,
      defaultValue: 20,
      hint:
        "Измерьте зазор по сторонам проёма. Для заметно разных значений считайте участки отдельно.",
      group: "Центральный слой шва",
    },
    {
      key: "foamLayerDepthMm",
      label: "Средняя глубина заполнения пеной",
      type: "number",
      unit: "мм",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 70,
      hint:
        "Глубина центрального теплоизоляционного слоя по принятому узлу, а не полная толщина стены.",
      group: "Центральный слой шва",
    },
    {
      key: "foamUsableYieldLPerCan",
      label: "Полезный выход выбранного баллона",
      type: "number",
      unit: "л",
      min: 1,
      max: 100,
      step: 0.1,
      defaultValue: 35,
      hint:
        "Введите консервативный полезный выход для фактических температуры, влажности, баллона и способа нанесения. 35 л — редактируемый пример.",
      group: "Центральный слой шва",
    },
    {
      key: "foamReservePercent",
      label: "Ваш запас монтажной пены",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hint:
        "Учитывайте разброс зазора и условия нанесения один раз. MIN/REC/MAX не добавляют второй процент.",
      group: "Центральный слой шва",
    },
    {
      key: "outerSealEnabled",
      label: "Добавить материал наружного слоя шва",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — материал не задан проектом" },
        { value: 1, label: "Да — введу проектную длину и рулон" },
      ],
      hint:
        "Калькулятор не назначает ПСУЛ, ленту или герметик автоматически: решение зависит от узла, основания, зазора и проектной документации.",
      group: "Наружный слой",
      fullWidth: true,
    },
    {
      key: "projectOuterSealLengthM",
      label: "Длина наружного материала по проекту",
      type: "number",
      unit: "м",
      min: 0,
      max: 100000,
      step: 0.1,
      defaultValue: 0,
      hideIf: { key: "outerSealEnabled", op: "eq", value: 0 },
      hint:
        "Готовая длина из схемы узла. Общий периметр показан в результате как ориентир, но не подставляется автоматически.",
      group: "Наружный слой",
    },
    {
      key: "outerSealReservePercent",
      label: "Ваш запас наружного материала",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hideIf: { key: "outerSealEnabled", op: "eq", value: 0 },
      hint: "Явный запас на нахлёсты, стыки, углы и подрезку.",
      group: "Наружный слой",
    },
    {
      key: "outerSealRollLengthM",
      label: "Длина выбранного рулона наружного материала",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 5000,
      step: 0.1,
      defaultValue: 5.6,
      hideIf: { key: "outerSealEnabled", op: "eq", value: 0 },
      hint: "Фактическая длина товарного рулона выбранного материала.",
      group: "Наружный слой",
    },
    {
      key: "innerSealEnabled",
      label: "Добавить материал внутреннего слоя шва",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — материал не задан проектом" },
        { value: 1, label: "Да — введу проектную длину и рулон" },
      ],
      hint:
        "Внутренний слой может выполняться разными материалами. Включайте только после выбора решения для конкретного узла.",
      group: "Внутренний слой",
      fullWidth: true,
    },
    {
      key: "projectInnerSealLengthM",
      label: "Длина внутреннего материала по проекту",
      type: "number",
      unit: "м",
      min: 0,
      max: 100000,
      step: 0.1,
      defaultValue: 0,
      hideIf: { key: "innerSealEnabled", op: "eq", value: 0 },
      hint: "Готовая длина из проектной схемы внутренней герметизации.",
      group: "Внутренний слой",
    },
    {
      key: "innerSealReservePercent",
      label: "Ваш запас внутреннего материала",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hideIf: { key: "innerSealEnabled", op: "eq", value: 0 },
      hint: "Явный запас на нахлёсты, углы, стыки и подрезку.",
      group: "Внутренний слой",
    },
    {
      key: "innerSealRollLengthM",
      label: "Длина выбранного рулона внутреннего материала",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 5000,
      step: 0.1,
      defaultValue: 8.5,
      hideIf: { key: "innerSealEnabled", op: "eq", value: 0 },
      hint: "Фактическая длина товарного рулона.",
      group: "Внутренний слой",
    },
    {
      key: "fastenersEnabled",
      label: "Добавить крепёж из проектной ведомости",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — схема крепления не задана" },
        { value: 1, label: "Да — введу готовое количество" },
      ],
      hint:
        "Количество, тип и положение креплений зависят от материала рамы, размера, нагрузки, основания и системы. По одному периметру они не назначаются.",
      group: "Крепление",
      fullWidth: true,
    },
    {
      key: "projectFastenerCount",
      label: "Количество крепежей по проекту",
      type: "number",
      unit: "шт",
      min: 0,
      max: 1000000,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
      hideIf: { key: "fastenersEnabled", op: "eq", value: 0 },
      hint: "Готовое количество выбранных анкеров, пластин или другого принятого крепежа.",
      group: "Крепление",
    },
    {
      key: "fastenersPerPack",
      label: "Крепежей в упаковке",
      type: "number",
      unit: "шт",
      min: 1,
      max: 100000,
      step: 1,
      integerOnly: true,
      defaultValue: 50,
      hideIf: { key: "fastenersEnabled", op: "eq", value: 0 },
      hint: "Фактическая фасовка выбранного крепежа.",
      group: "Крепление",
    },
    {
      key: "slopeFinishType",
      label: "Добавить материал внутренних откосов",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Не считать — площадь откосов не задана" },
        { value: 1, label: "Панели — по площади упаковки" },
        { value: 2, label: "Листы — по фактическим размерам" },
        { value: 3, label: "Штукатурка — по паспортному расходу" },
      ],
      hint:
        "Введите готовую площадь откосов из обмера или отдельного калькулятора. Подоконник, доборы, профили, углы и финишные слои не добавляются.",
      group: "Откосы",
      fullWidth: true,
    },
    {
      key: "projectSlopeAreaM2",
      label: "Площадь откосов по обмеру",
      type: "number",
      unit: "м²",
      min: 0,
      max: 100000,
      step: 0.01,
      defaultValue: 0,
      hideIf: { key: "slopeFinishType", op: "eq", value: 0 },
      hint:
        "Суммарная готовая площадь верхних и боковых откосов. Не подставляйте вместо неё полную толщину стены.",
      group: "Откосы",
    },
    {
      key: "slopeReservePercent",
      label: "Ваш запас материала откосов",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hideIf: { key: "slopeFinishType", op: "eq", value: 0 },
      hint: "Явный запас по раскладке, пригодности обрезков и геометрии проёмов.",
      group: "Откосы",
    },
    {
      key: "slopePanelPackCoverageM2",
      label: "Площадь панелей в упаковке",
      type: "number",
      unit: "м²",
      min: 0.01,
      max: 1000,
      step: 0.01,
      defaultValue: 3.6,
      hideIf: { key: "slopeFinishType", op: "ne", value: 1 },
      hint: "Фактическая рабочая площадь выбранного товара в одной упаковке.",
      group: "Откосы",
    },
    {
      key: "slopeSheetLengthM",
      label: "Длина выбранного листа",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 10,
      step: 0.01,
      defaultValue: 2.5,
      hideIf: { key: "slopeFinishType", op: "ne", value: 2 },
      hint: "Фактический товарный размер листа.",
      group: "Откосы",
    },
    {
      key: "slopeSheetWidthM",
      label: "Ширина выбранного листа",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 5,
      step: 0.01,
      defaultValue: 1.2,
      hideIf: { key: "slopeFinishType", op: "ne", value: 2 },
      hint: "Раскладка листа на отдельные откосы и пригодность обрезков отдельно не моделируются.",
      group: "Откосы",
    },
    {
      key: "slopePlasterConsumptionKgM2",
      label: "Паспортный расход штукатурки",
      type: "number",
      unit: "кг/м²",
      min: 0.01,
      max: 500,
      step: 0.01,
      defaultValue: 8,
      hideIf: { key: "slopeFinishType", op: "ne", value: 3 },
      hint:
        "Расход конкретной смеси на принятую среднюю толщину слоя. Калькулятор не задаёт его автоматически.",
      group: "Откосы",
    },
    {
      key: "slopePlasterBagKg",
      label: "Масса мешка штукатурки",
      type: "number",
      unit: "кг",
      min: 0.1,
      max: 100,
      step: 0.1,
      defaultValue: 25,
      hideIf: { key: "slopeFinishType", op: "ne", value: 3 },
      hint: "Фактическая масса одной покупаемой упаковки.",
      group: "Откосы",
    },
  ],
  calculate(inputs) {
    const windowCount = clampInteger(readNumber(inputs.windowCount, 5), 1, 100);
    const windowWidth = clamp(readNumber(inputs.windowWidth, 1200), 100, 6000);
    const windowHeight = clamp(readNumber(inputs.windowHeight, 1400), 100, 6000);
    const jointGapWidthMm = clamp(
      readNumber(inputs.jointGapWidthMm, 20),
      1,
      200,
    );
    const foamLayerDepthMm = clamp(
      readNumber(inputs.foamLayerDepthMm, 70),
      1,
      500,
    );
    const foamUsableYieldLPerCan = clamp(
      readNumber(inputs.foamUsableYieldLPerCan, 35),
      1,
      100,
    );
    const foamReservePercent = clamp(
      readNumber(inputs.foamReservePercent, 0),
      0,
      30,
    );

    const perimeterPerWindowM = round(
      (2 * (windowWidth + windowHeight)) / 1000,
      6,
    );
    const totalJointLengthM = round(perimeterPerWindowM * windowCount, 6);
    const foamJointVolumeL = round(
      (totalJointLengthM * jointGapWidthMm * foamLayerDepthMm) / 1000,
      6,
    );
    const foamCleanCans = round(
      foamJointVolumeL / foamUsableYieldLPerCan,
      6,
    );
    const foamReservedCans = round(
      foamCleanCans * (1 + foamReservePercent / 100),
      6,
    );
    const foamPurchaseCans = ceilPositive(foamReservedCans);
    const foamPurchaseCapacityL = round(
      foamPurchaseCans * foamUsableYieldLPerCan,
      6,
    );
    const foamScenarioLeftoverCans = round(
      Math.max(0, foamPurchaseCans - foamReservedCans),
      6,
    );

    const materials: MaterialResult[] = [
      {
        name: "Монтажная пена выбранного типа",
        quantity: foamCleanCans,
        unit: "баллонов",
        withReserve: foamReservedCans,
        purchaseQty: foamPurchaseCans,
        category: "Центральный слой",
        subtitle: `Эквивалентный объём ${formatRuNumber(
          foamJointVolumeL,
        )} л; полезный выход ${formatRuNumber(
          foamUsableYieldLPerCan,
        )} л/баллон; к расчёту с запасом ${formatRuNumber(
          foamReservedCans,
        )} баллона (${formatRuNumber(foamReservePercent)}%)`,
        highlight: true,
      },
    ];

    const outerSealEnabled =
      clampInteger(readNumber(inputs.outerSealEnabled, 0), 0, 1) === 1;
    const projectOuterSealLengthM = outerSealEnabled
      ? clamp(readNumber(inputs.projectOuterSealLengthM, 0), 0, 100000)
      : 0;
    const outerSealReservePercent = clamp(
      readNumber(inputs.outerSealReservePercent, 0),
      0,
      30,
    );
    const outerSealRollLengthM = clamp(
      readNumber(inputs.outerSealRollLengthM, 5.6),
      0.1,
      5000,
    );
    const outerSealRequiredM = round(
      projectOuterSealLengthM * (1 + outerSealReservePercent / 100),
      6,
    );
    const outerSealRolls =
      outerSealEnabled && outerSealRequiredM > 0
        ? ceilPositive(outerSealRequiredM / outerSealRollLengthM)
        : 0;
    const outerSealPurchasedM = round(
      outerSealRolls * outerSealRollLengthM,
      6,
    );
    const outerSealLeftoverM = round(
      Math.max(0, outerSealPurchasedM - outerSealRequiredM),
      6,
    );

    if (outerSealRolls > 0) {
      materials.push({
        name: "Наружный материал монтажного шва по проекту",
        quantity: round(projectOuterSealLengthM, 6),
        unit: "м",
        withReserve: outerSealRequiredM,
        purchaseQty: outerSealPurchasedM,
        category: "Наружный слой",
        packageInfo: {
          count: outerSealRolls,
          size: outerSealRollLengthM,
          packageUnit: "рулонов",
        },
      });
    }

    const innerSealEnabled =
      clampInteger(readNumber(inputs.innerSealEnabled, 0), 0, 1) === 1;
    const projectInnerSealLengthM = innerSealEnabled
      ? clamp(readNumber(inputs.projectInnerSealLengthM, 0), 0, 100000)
      : 0;
    const innerSealReservePercent = clamp(
      readNumber(inputs.innerSealReservePercent, 0),
      0,
      30,
    );
    const innerSealRollLengthM = clamp(
      readNumber(inputs.innerSealRollLengthM, 8.5),
      0.1,
      5000,
    );
    const innerSealRequiredM = round(
      projectInnerSealLengthM * (1 + innerSealReservePercent / 100),
      6,
    );
    const innerSealRolls =
      innerSealEnabled && innerSealRequiredM > 0
        ? ceilPositive(innerSealRequiredM / innerSealRollLengthM)
        : 0;
    const innerSealPurchasedM = round(
      innerSealRolls * innerSealRollLengthM,
      6,
    );
    const innerSealLeftoverM = round(
      Math.max(0, innerSealPurchasedM - innerSealRequiredM),
      6,
    );

    if (innerSealRolls > 0) {
      materials.push({
        name: "Внутренний материал монтажного шва по проекту",
        quantity: round(projectInnerSealLengthM, 6),
        unit: "м",
        withReserve: innerSealRequiredM,
        purchaseQty: innerSealPurchasedM,
        category: "Внутренний слой",
        packageInfo: {
          count: innerSealRolls,
          size: innerSealRollLengthM,
          packageUnit: "рулонов",
        },
      });
    }

    const fastenersEnabled =
      clampInteger(readNumber(inputs.fastenersEnabled, 0), 0, 1) === 1;
    const projectFastenerCount = fastenersEnabled
      ? clampInteger(readNumber(inputs.projectFastenerCount, 0), 0, 1000000)
      : 0;
    const fastenersPerPack = clampInteger(
      readNumber(inputs.fastenersPerPack, 50),
      1,
      100000,
    );
    const fastenerPacks =
      projectFastenerCount > 0
        ? ceilPositive(projectFastenerCount / fastenersPerPack)
        : 0;
    const fastenerPurchaseCount = fastenerPacks * fastenersPerPack;

    if (fastenerPacks > 0) {
      materials.push({
        name: "Крепёж по проектной ведомости",
        quantity: projectFastenerCount,
        unit: "шт",
        withReserve: projectFastenerCount,
        purchaseQty: fastenerPurchaseCount,
        category: "Крепление",
        packageInfo: {
          count: fastenerPacks,
          size: fastenersPerPack,
          packageUnit: "упаковок",
        },
      });
    }

    const slopeFinishType = clampInteger(
      readNumber(inputs.slopeFinishType, 0),
      0,
      3,
    );
    const projectSlopeAreaM2 =
      slopeFinishType > 0
        ? clamp(readNumber(inputs.projectSlopeAreaM2, 0), 0, 100000)
        : 0;
    const slopeReservePercent = clamp(
      readNumber(inputs.slopeReservePercent, 0),
      0,
      30,
    );
    const slopeReservedAreaM2 = round(
      projectSlopeAreaM2 * (1 + slopeReservePercent / 100),
      6,
    );
    let slopePurchasePackages = 0;
    let slopePurchaseEquivalent = 0;
    let slopeLeftoverEquivalent = 0;

    if (slopeFinishType === 1 && projectSlopeAreaM2 > 0) {
      const slopePanelPackCoverageM2 = clamp(
        readNumber(inputs.slopePanelPackCoverageM2, 3.6),
        0.01,
        1000,
      );
      slopePurchasePackages = ceilPositive(
        slopeReservedAreaM2 / slopePanelPackCoverageM2,
      );
      slopePurchaseEquivalent = round(
        slopePurchasePackages * slopePanelPackCoverageM2,
        6,
      );
      slopeLeftoverEquivalent = round(
        Math.max(0, slopePurchaseEquivalent - slopeReservedAreaM2),
        6,
      );
      materials.push({
        name: "Панели для откосов выбранного типа",
        quantity: round(projectSlopeAreaM2, 6),
        unit: "м²",
        withReserve: slopeReservedAreaM2,
        purchaseQty: slopePurchaseEquivalent,
        category: "Откосы",
        packageInfo: {
          count: slopePurchasePackages,
          size: slopePanelPackCoverageM2,
          packageUnit: "упаковок",
        },
      });
    } else if (slopeFinishType === 2 && projectSlopeAreaM2 > 0) {
      const slopeSheetLengthM = clamp(
        readNumber(inputs.slopeSheetLengthM, 2.5),
        0.1,
        10,
      );
      const slopeSheetWidthM = clamp(
        readNumber(inputs.slopeSheetWidthM, 1.2),
        0.1,
        5,
      );
      const slopeSheetAreaM2 = slopeSheetLengthM * slopeSheetWidthM;
      const cleanSheets = round(projectSlopeAreaM2 / slopeSheetAreaM2, 6);
      const reservedSheets = round(
        (projectSlopeAreaM2 / slopeSheetAreaM2) *
          (1 + slopeReservePercent / 100),
        6,
      );
      slopePurchasePackages = ceilPositive(reservedSheets);
      slopePurchaseEquivalent = slopePurchasePackages;
      slopeLeftoverEquivalent = round(
        Math.max(0, slopePurchasePackages - reservedSheets),
        6,
      );
      materials.push({
        name: "Листы для откосов выбранного типа",
        quantity: cleanSheets,
        unit: "листов",
        withReserve: reservedSheets,
        purchaseQty: slopePurchasePackages,
        category: "Откосы",
        subtitle: `${formatRuNumber(slopeSheetLengthM)} × ${formatRuNumber(
          slopeSheetWidthM,
        )} м; раскладка отдельных деталей не моделируется`,
      });
    } else if (slopeFinishType === 3 && projectSlopeAreaM2 > 0) {
      const slopePlasterConsumptionKgM2 = clamp(
        readNumber(inputs.slopePlasterConsumptionKgM2, 8),
        0.01,
        500,
      );
      const slopePlasterBagKg = clamp(
        readNumber(inputs.slopePlasterBagKg, 25),
        0.1,
        100,
      );
      const cleanKg = round(
        projectSlopeAreaM2 * slopePlasterConsumptionKgM2,
        6,
      );
      const reservedKg = round(
        cleanKg * (1 + slopeReservePercent / 100),
        6,
      );
      slopePurchasePackages = ceilPositive(reservedKg / slopePlasterBagKg);
      slopePurchaseEquivalent = round(
        slopePurchasePackages * slopePlasterBagKg,
        6,
      );
      slopeLeftoverEquivalent = round(
        Math.max(0, slopePurchaseEquivalent - reservedKg),
        6,
      );
      materials.push({
        name: "Штукатурка по паспортному расходу",
        quantity: cleanKg,
        unit: "кг",
        withReserve: reservedKg,
        purchaseQty: slopePurchaseEquivalent,
        category: "Откосы",
        packageInfo: {
          count: slopePurchasePackages,
          size: slopePlasterBagKg,
          packageUnit: "мешков",
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
      exact_need: foamReservedCans,
      purchase_quantity: foamPurchaseCans,
      leftover: foamScenarioLeftoverCans,
      assumptions: [
        `formula_version:${WEB_FORMULA_VERSION}`,
        `joint_length_m:${totalJointLengthM}`,
        `gap_width_mm:${jointGapWidthMm}`,
        `foam_depth_mm:${foamLayerDepthMm}`,
        `usable_yield_l:${foamUsableYieldLPerCan}`,
        `explicit_reserve_percent:${foamReservePercent}`,
      ],
      key_factors: {
        explicit_reserve_percent: foamReservePercent,
        hidden_multiplier: 1,
      },
      buy_plan: {
        package_label: "foam-can",
        package_size: 1,
        packages_count: foamPurchaseCans,
        unit: "баллонов",
      },
    };

    const warnings: string[] = [
      "Объём пены — эквивалентный прямоугольный объём по средней ширине и глубине шва. Неровные, ступенчатые и разные по сторонам зазоры считайте отдельными участками.",
      "Полезный выход баллона зависит от продукта, температуры, влажности, подготовки основания и нанесения. Перенесите консервативное значение из паспорта и условий работ, а не рекламный максимум.",
      "Калькулятор не проектирует положение блока, опорные колодки, крепления, допустимые расстояния, нагрузки и основание. Крепёж появляется только по готовой ведомости.",
      "Площадь откосов и количество облицовки не заменяют раскладку деталей, углов, профилей, подоконника, отлива, доборов и финишных слоёв.",
      "MIN/REC/MAX и режим точности совпадают: поверх введённых размеров, полезного выхода и явных запасов скрытые коэффициенты не применяются.",
    ];

    if (!outerSealEnabled || !innerSealEnabled) {
      warnings.push(
        "Выключенный наружный или внутренний слой не означает, что он не нужен: материал просто не включён без проектного решения и фактической фасовки.",
      );
    }
    if (outerSealEnabled && projectOuterSealLengthM === 0) {
      warnings.push(
        "Наружный слой включён, но проектная длина равна нулю — позиция не добавлена.",
      );
    }
    if (innerSealEnabled && projectInnerSealLengthM === 0) {
      warnings.push(
        "Внутренний слой включён, но проектная длина равна нулю — позиция не добавлена.",
      );
    }
    if (fastenersEnabled && projectFastenerCount === 0) {
      warnings.push(
        "Крепёж включён, но проектное количество равно нулю — позиция не добавлена.",
      );
    }
    if (slopeFinishType > 0 && projectSlopeAreaM2 === 0) {
      warnings.push(
        "Материал откосов выбран, но площадь по обмеру равна нулю — позиция не добавлена.",
      );
    }

    const practicalNotes = [
      "Промерьте монтажный зазор минимум по нескольким точкам каждой стороны: среднее значение удобно для закупки, но не описывает локальные пустоты.",
      "Сверьте температурный диапазон пены и температуру баллона с техническим листом выбранного продукта.",
      "Наружный, центральный и внутренний слои должны работать как единый проектный узел; одна пена не является готовой долговечной герметизацией.",
    ];

    const summaryCards: SummaryCard[] = [
      {
        icon: "▭",
        label: "Длина монтажного шва",
        value: formatRuNumber(totalJointLengthM),
        unit: "м",
        hint: `${formatRuNumber(windowCount)} ${pluralRu(
          windowCount,
          "окно",
          "окна",
          "окон",
        )} одинакового размера`,
        tone: "violet",
      },
      {
        icon: "◫",
        label: "Эквивалентный объём",
        value: formatRuNumber(foamJointVolumeL),
        unit: "л",
        hint: `${formatRuNumber(jointGapWidthMm)} × ${formatRuNumber(
          foamLayerDepthMm,
        )} мм`,
        tone: "slate",
      },
      {
        icon: "◉",
        label: "Пены к покупке",
        value: formatRuNumber(foamPurchaseCans),
        unit: pluralRu(
          foamPurchaseCans,
          "баллон",
          "баллона",
          "баллонов",
        ),
        hint: `полезный выход ${formatRuNumber(
          foamUsableYieldLPerCan,
        )} л/баллон`,
        tone: "emerald",
      },
    ];

    return {
      materials,
      totals: {
        windowCount,
        windowWidth: round(windowWidth, 3),
        windowHeight: round(windowHeight, 3),
        jointGapWidthMm: round(jointGapWidthMm, 3),
        foamLayerDepthMm: round(foamLayerDepthMm, 3),
        foamUsableYieldLPerCan: round(foamUsableYieldLPerCan, 3),
        foamReservePercent: round(foamReservePercent, 3),
        perimeterPerWindowM,
        totalJointLengthM,
        foamJointVolumeL,
        foamCleanCans,
        foamReservedCans,
        foamPurchaseCans,
        foamPurchaseCapacityL,
        foamScenarioLeftoverCans,
        outerSealEnabled: outerSealEnabled ? 1 : 0,
        projectOuterSealLengthM: round(projectOuterSealLengthM, 6),
        outerSealRequiredM,
        outerSealRolls,
        outerSealPurchasedM,
        outerSealLeftoverM,
        innerSealEnabled: innerSealEnabled ? 1 : 0,
        projectInnerSealLengthM: round(projectInnerSealLengthM, 6),
        innerSealRequiredM,
        innerSealRolls,
        innerSealPurchasedM,
        innerSealLeftoverM,
        fastenersEnabled: fastenersEnabled ? 1 : 0,
        projectFastenerCount,
        fastenerPacks,
        fastenerPurchaseCount,
        slopeFinishType,
        projectSlopeAreaM2: round(projectSlopeAreaM2, 6),
        slopeReservedAreaM2,
        slopePurchasePackages,
        slopePurchaseEquivalent,
        slopeLeftoverEquivalent,
        minExactNeed: scenario.exact_need,
        recExactNeed: scenario.exact_need,
        maxExactNeed: scenario.exact_need,
        minPurchase: scenario.purchase_quantity,
        recPurchase: scenario.purchase_quantity,
        maxPurchase: scenario.purchase_quantity,
      },
      warnings,
      scenarios: { MIN: scenario, REC: scenario, MAX: scenario },
      formulaVersion: WEB_FORMULA_VERSION,
      canonicalSpecId: windowsSpec.calculator_id,
      practicalNotes,
      accuracyMode,
      accuracyExplanation: {
        mode: accuracyMode,
        modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
        combinedMultiplier: 1,
        appliedModifiers: [],
        notes: [
          "Режим точности не меняет закупку: применяются только введённая геометрия шва, полезный выход продукта и явные запасы.",
        ],
      },
      summaryCards,
      materialListBanner:
        "Default считает только центральный слой из пены. Наружная и внутренняя герметизация, крепёж и откосы появляются только по проектным данным.",
    };
  },
  formulaDescription: `
**Предварительный расчёт монтажной пены:**
- длина шва = 2 × (ширина блока + высота блока) × количество;
- эквивалентный объём центрального слоя = длина × средняя ширина зазора × средняя глубина заполнения;
- чистая потребность в баллонах = объём / введённый полезный выход одного баллона;
- итог к покупке = округление вверх после однократного явного запаса;
- наружный и внутренний слои, крепёж и откосы считаются только по готовым проектным длинам, количествам и паспортным расходам.

Модель не проектирует узел примыкания и не заменяет обмер неодинаковых участков шва.
  `,
  howToUse: [
    "Сгруппируйте окна с одинаковыми размерами и монтажным зазором.",
    "Введите габариты блока, среднюю ширину зазора и глубину центрального слоя.",
    "Укажите консервативный полезный выход выбранной пены в фактических условиях.",
    "Задайте явный запас и получите целое число баллонов.",
    "При наличии проектной ведомости включите наружный и внутренний слои, крепёж и материал откосов.",
  ],
  expertTips: [
    {
      title: "Не считайте пену по числу окон",
      content:
        "Промерьте зазор по сторонам: одно и то же окно в ровном и разбитом проёме требует разного объёма. Если ширина заметно меняется, разделите шов на участки и сложите результат.",
      author: "Михалыч",
    },
  ],
  faq: [
    {
      question: "Как рассчитать количество монтажной пены для окон?",
      answer:
        "Сначала найдите длину монтажного шва по периметру блоков, затем умножьте её на среднюю ширину зазора и глубину заполнения. Полученный объём в литрах разделите на консервативный полезный выход конкретного баллона и округлите вверх после выбранного запаса.",
    },
    {
      question: "Почему калькулятор не подставляет один расход баллона на метр?",
      answer:
        "Погонный метр узкого и неглубокого шва требует меньше пены, чем метр широкого и глубокого. Кроме того, фактический выход зависит от продукта и условий нанесения. Поэтому фиксированная норма на метр скрывает главные исходные данные.",
    },
    {
      question: "Почему ПСУЛ и внутренняя лента выключены по умолчанию?",
      answer:
        "ГОСТ описывает функции слоёв монтажного шва, но конкретный материал, ширину, совместимость, способ примыкания и длину задаёт проект узла. Калькулятор не заменяет это решение одним универсальным рулоном.",
    },
    {
      question: "Считает ли калькулятор подоконник и полную отделку откосов?",
      answer:
        "Нет. Для откосов можно перевести готовую площадь в упаковки панелей, листы или мешки штукатурки. Подоконник, отлив, доборы, профили, углы, крепёж и финишные слои требуют отдельных размеров и раскладки.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор монтажа окон</h2>
<p>Калькулятор оценивает закупку монтажной пены по измеримой геометрии центрального слоя шва. Он использует периметр одинаковых оконных блоков, среднюю ширину монтажного зазора, глубину заполнения и полезный выход выбранного баллона. Наружный и внутренний слои герметизации, крепёж и отделка откосов появляются только после ввода проектных данных.</p>

<h2>Формула расхода монтажной пены</h2>
<ol>
  <li>Периметр одного блока равен удвоенной сумме его ширины и высоты.</li>
  <li>Общая длина шва равна периметру, умноженному на количество одинаковых блоков.</li>
  <li>Длина умножается на среднюю ширину зазора и глубину заполнения — получается эквивалентный прямоугольный объём в литрах.</li>
  <li>Объём делится на введённый полезный выход конкретного баллона. Явный запас применяется один раз, итог округляется вверх.</li>
</ol>
<p>Для пяти блоков 1200×1400 мм длина шва равна 26 м. При среднем зазоре 20 мм и глубине заполнения 70 мм эквивалентный объём составляет 36,4 л. При полезном выходе 35 л/баллон без запаса расчётная потребность равна 1,04 баллона, к покупке — 2.</p>

<h2>Почему монтажный шов нельзя свести к пене и одному рулону</h2>
<p>Действующий <a href="https://protect.gost.ru/gost/details/09b731bf-531e-428b-8ef9-556ed2d1c110">ГОСТ 30971-2012</a> применяется при разработке документации на монтажные швы узлов примыкания оконных блоков к стеновым проёмам. Действующий <a href="https://protect.gost.ru/gost/details/a64d7437-05ff-4621-8339-53cd7418810d">ГОСТ 23166-2024</a> устанавливает общие требования к оконным и балконным блокам, включая требования к монтажу. Отдельный <a href="https://protect.gost.ru/gost/details/dd2cf1c8-2634-46e7-8349-4a08ca4597f2">ГОСТ Р 70075-2022</a> распространяется на паропроницаемые и пароизоляционные герметики для наружного и внутреннего слоёв по ГОСТ 30971. Эти документы подтверждают системный характер узла, но не превращают любой проект в одинаковые ПСУЛ 5,6 м, внутреннюю ленту 8,5 м и крепёж через один универсальный шаг.</p>

<h2>Почему полезный выход пены вводится вручную</h2>
<p>Даже технический лист производителя указывает условия результата. Например, <a href="https://soudal.ru/images/stories/soudal/tds-profi/soudafoam-professional-60_tds_ru.pdf">технический лист Soudafoam Professional 60</a> связывает выход с температурой и влажностью воздуха и отдельно задаёт температурный диапазон применения. Поэтому в закупочный расчёт вводится не рекламный максимум для всех ситуаций, а консервативный полезный выход выбранного продукта в фактических условиях.</p>

<h2>Откосы, крепёж и герметизация</h2>
<p>Площадь откосов лучше перенести из обмера или отдельного <a href="/kalkulyatory/otdelka/otkosy-okon-i-dverej/">калькулятора откосов</a>. Здесь она переводится только в упаковки панелей, листы или смесь по паспортному расходу. Подоконник, отлив, доборы, профили, углы и финишные слои не восстанавливаются из толщины стены. Тип, количество и положение креплений также принимаются по проекту, оконной системе, основанию и нагрузкам.</p>

<h2>Границы результата</h2>
<p>Это предварительная закупочная оценка. Она не проверяет несущую способность креплений, положение блока в проёме, опорные колодки, деформации, теплотехнику, водоотвод и совместимость материалов. Если зазор неодинаков, его нужно разделить на участки или использовать более подробный обмер.</p>
    `,
    faq: [
      {
        question: "Сколько пены нужно на пять окон 1200×1400 мм?",
        answer:
          "<p>При одинаковых блоках общий периметр равен 26 м. Если средний зазор 20 мм, глубина заполнения 70 мм, а полезный выход выбранной пены 35 л/баллон, эквивалентный объём составляет 36,4 л. Чистая потребность — 1,04 баллона, поэтому без дополнительного запаса к покупке нужно 2 баллона.</p>",
      },
      {
        question: "Можно ли подставить заявленные 60–65 литров выхода?",
        answer:
          "<p>Только если технический лист и реальные условия подтверждают такое значение. Температура, влажность, подготовка основания и нанесение влияют на выход. Для закупки безопаснее вводить консервативный полезный выход, а не рекламный максимум.</p>",
      },
      {
        question: "Почему ленты считаются по проектной длине, а не по периметру?",
        answer:
          "<p>Периметр полезен как контрольная геометрия, но фактическая длина зависит от выбранного материала, схемы углов, нахлёстов, нижнего узла, четверти и примыканий. Поэтому наружный и внутренний материалы добавляются только по длине из принятой схемы.</p>",
      },
    ],
  },
};
