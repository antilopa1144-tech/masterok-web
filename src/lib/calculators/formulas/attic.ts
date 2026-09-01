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
import atticSpec from "../../../../configs/calculators/attic-canonical.v1.json";

const WEB_FORMULA_VERSION = "attic-web-product-v1";

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

export const atticDef: CalculatorDefinition = {
  id: "attic",
  slug: "otdelka-mansardy",
  formulaVersion: WEB_FORMULA_VERSION,
  title: "Калькулятор утепления мансарды",
  h1: "Калькулятор утепления мансарды — по проектной толщине и упаковке",
  description:
    "Рассчитайте утеплитель для скатов по площади, проектной толщине слоя и фактической фасовке. Мембраны, ленты и отделку добавляйте только по принятому кровельному пирогу.",
  metaTitle: withSiteMetaTitle("Калькулятор утепления мансарды: упаковки и материалы"),
  metaDescription:
    "Бесплатный калькулятор утепления мансарды: рассчитайте количество упаковок по площади скатов, проектной толщине, толщине материала и фактической фасовке.",
  category: "interior",
  categorySlug: "otdelka",
  tags: [
    "мансарда",
    "утепление мансарды",
    "калькулятор утеплителя",
    "скатная кровля",
    "пароизоляция мансарды",
  ],
  popularity: 60,
  complexity: 3,
  fields: [
    {
      key: "roofArea",
      label: "Площадь утепляемых скатов",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 1000,
      step: 1,
      defaultValue: 60,
      hint:
        "Суммарная площадь всех утепляемых наклонных участков. Вертикальные стенки, фронтоны, ригели, ендовы и проёмы учитывайте по обмеру отдельно.",
      group: "Утеплитель",
      fullWidth: true,
    },
    {
      key: "insulationThickness",
      label: "Толщина утепления по проекту",
      type: "number",
      unit: "мм",
      min: 20,
      max: 600,
      step: 10,
      defaultValue: 200,
      hint:
        "Готовое значение из теплотехнического расчёта и принятого узла. Это не рекомендация калькулятора для региона.",
      group: "Утеплитель",
    },
    {
      key: "insulationProductThicknessMm",
      label: "Толщина выбранной плиты или мата",
      type: "number",
      unit: "мм",
      min: 10,
      max: 300,
      step: 10,
      defaultValue: 100,
      hint:
        "Фактическая толщина конкретного артикула. Число слоёв округляется вверх до достижения проектной толщины.",
      group: "Утеплитель",
    },
    {
      key: "insulationPackCoverageM2",
      label: "Площадь материала в одной упаковке",
      type: "number",
      unit: "м²",
      min: 0.01,
      max: 1000,
      step: 0.01,
      defaultValue: 3,
      hint:
        "Перенесите площадь с упаковки именно для выбранной толщины. 3 м² — редактируемый стартовый пример, а не универсальная фасовка.",
      group: "Утеплитель",
    },
    {
      key: "insulationReservePercent",
      label: "Ваш запас утеплителя",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hint:
        "Задайте по карте раскроя, шагу стропил и возможности использовать обрезки. MIN/REC/MAX не добавляют второй процент.",
      group: "Утеплитель",
    },
    {
      key: "windMembraneEnabled",
      label: "Добавить гидроветрозащитную мембрану",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — не задана проектом" },
        { value: 1, label: "Да — введу рулон и запас" },
      ],
      hint:
        "Включайте только если тип и положение мембраны уже приняты в кровельном пироге.",
      group: "Мембраны",
      fullWidth: true,
    },
    {
      key: "windMembraneRollCoverageM2",
      label: "Площадь рулона гидроветрозащиты",
      type: "number",
      unit: "м²",
      min: 0.01,
      max: 5000,
      step: 0.01,
      defaultValue: 75,
      hideIf: { key: "windMembraneEnabled", op: "eq", value: 0 },
      hint: "Фактическая номинальная площадь выбранного рулона.",
      group: "Мембраны",
    },
    {
      key: "windMembraneReservePercent",
      label: "Запас гидроветрозащиты на нахлёсты и раскрой",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hideIf: { key: "windMembraneEnabled", op: "eq", value: 0 },
      hint:
        "Введите по инструкции выбранной мембраны и геометрии скатов; калькулятор не задаёт универсальный нахлёст.",
      group: "Мембраны",
    },
    {
      key: "vapourBarrierEnabled",
      label: "Добавить пароизоляцию",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — не задана проектом" },
        { value: 1, label: "Да — введу рулон и запас" },
      ],
      hint:
        "Включайте по принятому узлу со стороны помещения. Калькулятор не подбирает материал по паропроницаемости.",
      group: "Мембраны",
      fullWidth: true,
    },
    {
      key: "vapourBarrierRollCoverageM2",
      label: "Площадь рулона пароизоляции",
      type: "number",
      unit: "м²",
      min: 0.01,
      max: 5000,
      step: 0.01,
      defaultValue: 70,
      hideIf: { key: "vapourBarrierEnabled", op: "eq", value: 0 },
      hint: "Фактическая номинальная площадь выбранного рулона.",
      group: "Мембраны",
    },
    {
      key: "vapourBarrierReservePercent",
      label: "Запас пароизоляции на нахлёсты и раскрой",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hideIf: { key: "vapourBarrierEnabled", op: "eq", value: 0 },
      hint:
        "Введите по инструкции системы, расположению полотен, примыканиям и проходкам.",
      group: "Мембраны",
    },
    {
      key: "jointTapeEnabled",
      label: "Добавить ленту для герметизации стыков",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — длина стыков не посчитана" },
        { value: 1, label: "Да — введу проектную длину" },
      ],
      hint:
        "Площадь скатов не определяет длину швов, примыканий и проходок. Перенесите готовый метраж из раскладки.",
      group: "Герметизация",
      fullWidth: true,
    },
    {
      key: "projectJointLengthM",
      label: "Длина герметизируемых стыков по проекту",
      type: "number",
      unit: "м",
      min: 0,
      max: 50000,
      step: 0.1,
      defaultValue: 0,
      hideIf: { key: "jointTapeEnabled", op: "eq", value: 0 },
      hint: "Сумма только тех стыков и примыканий, для которых предусмотрена выбранная лента.",
      group: "Герметизация",
    },
    {
      key: "jointTapeReservePercent",
      label: "Ваш запас ленты",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hideIf: { key: "jointTapeEnabled", op: "eq", value: 0 },
      hint: "Явный запас на соединения, подрезку и труднодоступные узлы.",
      group: "Герметизация",
    },
    {
      key: "jointTapeRollLengthM",
      label: "Длина выбранного рулона ленты",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 5000,
      step: 0.1,
      defaultValue: 25,
      hideIf: { key: "jointTapeEnabled", op: "eq", value: 0 },
      hint: "Фактическая длина одного товарного рулона.",
      group: "Герметизация",
    },
    {
      key: "atticFinishType",
      label: "Внутренняя отделка скатов",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Не считать — отделка не задана" },
        { value: 1, label: "Деревянная отделка по площади упаковки" },
        { value: 2, label: "Листовая отделка по размерам листа" },
      ],
      hint:
        "Выбор считает только облицовочный материал. Каркас, подсистема, крепёж, шпаклёвка и защита древесины автоматически не назначаются.",
      group: "Отделка",
      fullWidth: true,
    },
    {
      key: "finishLayers",
      label: "Число слоёв отделки",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "1 слой" },
        { value: 2, label: "2 слоя" },
        { value: 3, label: "3 слоя" },
      ],
      hideIf: { key: "atticFinishType", op: "eq", value: 0 },
      hint: "Введите фактическое число слоёв на рассчитываемой поверхности.",
      group: "Отделка",
    },
    {
      key: "finishReservePercent",
      label: "Ваш запас отделки",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hideIf: { key: "atticFinishType", op: "eq", value: 0 },
      hint: "Запас по карте раскроя, рисунку, стыкам и пригодности обрезков.",
      group: "Отделка",
    },
    {
      key: "woodFinishPackCoverageM2",
      label: "Площадь деревянной отделки в упаковке",
      type: "number",
      unit: "м²",
      min: 0.01,
      max: 1000,
      step: 0.01,
      defaultValue: 2.88,
      hideIf: { key: "atticFinishType", op: "ne", value: 1 },
      hint: "Фактическая рабочая площадь товара в одной неделимой упаковке.",
      group: "Отделка",
    },
    {
      key: "finishSheetLengthM",
      label: "Длина выбранного листа",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 10,
      step: 0.01,
      defaultValue: 2.5,
      hideIf: { key: "atticFinishType", op: "ne", value: 2 },
      hint: "Фактический товарный размер листа.",
      group: "Отделка",
    },
    {
      key: "finishSheetWidthM",
      label: "Ширина выбранного листа",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 5,
      step: 0.01,
      defaultValue: 1.2,
      hideIf: { key: "atticFinishType", op: "ne", value: 2 },
      hint: "Раскладка и смещение стыков отдельно не моделируются.",
      group: "Отделка",
    },
    {
      key: "projectItemsEnabled",
      label: "Добавить каркас и крепёж из проектной ведомости",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — проектные количества не заданы" },
        { value: 1, label: "Да — введу готовые длины и количества" },
      ],
      hint:
        "Калькулятор не восстанавливает каркас по площади. Включайте блок только с готовой раскладкой подсистемы.",
      group: "Проектная ведомость",
      fullWidth: true,
    },
    {
      key: "projectBattenLengthM",
      label: "Общая длина реек или профиля по проекту",
      type: "number",
      unit: "м",
      min: 0,
      max: 100000,
      step: 0.1,
      defaultValue: 0,
      hideIf: { key: "projectItemsEnabled", op: "eq", value: 0 },
      hint: "Готовый метраж принятого сечения и типа элемента без автоматического шага.",
      group: "Проектная ведомость",
    },
    {
      key: "battenBarLengthM",
      label: "Товарная длина одной рейки или профиля",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 30,
      step: 0.1,
      defaultValue: 3,
      hideIf: { key: "projectItemsEnabled", op: "eq", value: 0 },
      hint: "Фактическая длина одной покупаемой позиции.",
      group: "Проектная ведомость",
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
      hideIf: { key: "projectItemsEnabled", op: "eq", value: 0 },
      hint: "Готовое количество для выбранного типа основания, элементов и узлов.",
      group: "Проектная ведомость",
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
      defaultValue: 200,
      hideIf: { key: "projectItemsEnabled", op: "eq", value: 0 },
      hint: "Фактическая фасовка выбранного крепежа.",
      group: "Проектная ведомость",
    },
  ],
  calculate(inputs) {
    const roofArea = clamp(readNumber(inputs.roofArea, 60), 1, 1000);
    const insulationThickness = clamp(
      readNumber(inputs.insulationThickness, 200),
      20,
      600,
    );
    const insulationProductThicknessMm = clamp(
      readNumber(inputs.insulationProductThicknessMm, 100),
      10,
      300,
    );
    const insulationPackCoverageM2 = clamp(
      readNumber(inputs.insulationPackCoverageM2, 3),
      0.01,
      1000,
    );
    const insulationReservePercent = clamp(
      readNumber(inputs.insulationReservePercent, 0),
      0,
      30,
    );

    const insulationLayerCount = ceilPositive(
      insulationThickness / insulationProductThicknessMm,
    );
    const installedInsulationThicknessMm = round(
      insulationLayerCount * insulationProductThicknessMm,
      3,
    );
    const insulationCleanLayerAreaM2 = round(
      roofArea * insulationLayerCount,
      6,
    );
    const insulationReservedLayerAreaM2 = round(
      insulationCleanLayerAreaM2 * (1 + insulationReservePercent / 100),
      6,
    );
    const insulationPurchasePackages = ceilPositive(
      insulationReservedLayerAreaM2 / insulationPackCoverageM2,
    );
    const insulationPurchasedLayerAreaM2 = round(
      insulationPurchasePackages * insulationPackCoverageM2,
      6,
    );
    const insulationLeftoverLayerAreaM2 = round(
      Math.max(
        0,
        insulationPurchasedLayerAreaM2 - insulationReservedLayerAreaM2,
      ),
      6,
    );

    const materials: MaterialResult[] = [
      {
        name: "Утеплитель выбранной марки",
        quantity: insulationCleanLayerAreaM2,
        unit: "м²·слой",
        withReserve: insulationReservedLayerAreaM2,
        purchaseQty: insulationPurchasedLayerAreaM2,
        category: "Утеплитель",
        packageInfo: {
          count: insulationPurchasePackages,
          size: insulationPackCoverageM2,
          packageUnit: "упаковок",
        },
        subtitle: `${formatRuNumber(insulationLayerCount)} × ${formatRuNumber(
          insulationProductThicknessMm,
        )} мм = ${formatRuNumber(
          installedInsulationThicknessMm,
        )} мм; ${formatRuNumber(insulationPackCoverageM2)} м² в упаковке`,
        highlight: true,
      },
    ];

    const windMembraneEnabled =
      clampInteger(readNumber(inputs.windMembraneEnabled, 0), 0, 1) === 1;
    const windMembraneRollCoverageM2 = clamp(
      readNumber(inputs.windMembraneRollCoverageM2, 75),
      0.01,
      5000,
    );
    const windMembraneReservePercent = clamp(
      readNumber(inputs.windMembraneReservePercent, 0),
      0,
      30,
    );
    const windMembraneRequiredM2 = windMembraneEnabled
      ? round(roofArea * (1 + windMembraneReservePercent / 100), 6)
      : 0;
    const windMembraneRolls = windMembraneEnabled
      ? ceilPositive(windMembraneRequiredM2 / windMembraneRollCoverageM2)
      : 0;
    const windMembranePurchasedM2 = round(
      windMembraneRolls * windMembraneRollCoverageM2,
      6,
    );
    const windMembraneLeftoverM2 = round(
      Math.max(0, windMembranePurchasedM2 - windMembraneRequiredM2),
      6,
    );

    if (windMembraneEnabled) {
      materials.push({
        name: "Гидроветрозащитная мембрана по проекту",
        quantity: round(roofArea, 6),
        unit: "м²",
        withReserve: windMembraneRequiredM2,
        purchaseQty: windMembranePurchasedM2,
        category: "Мембраны",
        packageInfo: {
          count: windMembraneRolls,
          size: windMembraneRollCoverageM2,
          packageUnit: "рулонов",
        },
      });
    }

    const vapourBarrierEnabled =
      clampInteger(readNumber(inputs.vapourBarrierEnabled, 0), 0, 1) === 1;
    const vapourBarrierRollCoverageM2 = clamp(
      readNumber(inputs.vapourBarrierRollCoverageM2, 70),
      0.01,
      5000,
    );
    const vapourBarrierReservePercent = clamp(
      readNumber(inputs.vapourBarrierReservePercent, 0),
      0,
      30,
    );
    const vapourBarrierRequiredM2 = vapourBarrierEnabled
      ? round(roofArea * (1 + vapourBarrierReservePercent / 100), 6)
      : 0;
    const vapourBarrierRolls = vapourBarrierEnabled
      ? ceilPositive(vapourBarrierRequiredM2 / vapourBarrierRollCoverageM2)
      : 0;
    const vapourBarrierPurchasedM2 = round(
      vapourBarrierRolls * vapourBarrierRollCoverageM2,
      6,
    );
    const vapourBarrierLeftoverM2 = round(
      Math.max(0, vapourBarrierPurchasedM2 - vapourBarrierRequiredM2),
      6,
    );

    if (vapourBarrierEnabled) {
      materials.push({
        name: "Пароизоляция по проекту",
        quantity: round(roofArea, 6),
        unit: "м²",
        withReserve: vapourBarrierRequiredM2,
        purchaseQty: vapourBarrierPurchasedM2,
        category: "Мембраны",
        packageInfo: {
          count: vapourBarrierRolls,
          size: vapourBarrierRollCoverageM2,
          packageUnit: "рулонов",
        },
      });
    }

    const jointTapeEnabled =
      clampInteger(readNumber(inputs.jointTapeEnabled, 0), 0, 1) === 1;
    const projectJointLengthM = jointTapeEnabled
      ? clamp(readNumber(inputs.projectJointLengthM, 0), 0, 50000)
      : 0;
    const jointTapeReservePercent = clamp(
      readNumber(inputs.jointTapeReservePercent, 0),
      0,
      30,
    );
    const jointTapeRollLengthM = clamp(
      readNumber(inputs.jointTapeRollLengthM, 25),
      0.1,
      5000,
    );
    const jointTapeRequiredM = round(
      projectJointLengthM * (1 + jointTapeReservePercent / 100),
      6,
    );
    const jointTapeRolls =
      jointTapeEnabled && jointTapeRequiredM > 0
        ? ceilPositive(jointTapeRequiredM / jointTapeRollLengthM)
        : 0;
    const jointTapePurchasedM = round(
      jointTapeRolls * jointTapeRollLengthM,
      6,
    );
    const jointTapeLeftoverM = round(
      Math.max(0, jointTapePurchasedM - jointTapeRequiredM),
      6,
    );

    if (jointTapeRolls > 0) {
      materials.push({
        name: "Лента для стыков по проекту",
        quantity: round(projectJointLengthM, 6),
        unit: "м",
        withReserve: jointTapeRequiredM,
        purchaseQty: jointTapePurchasedM,
        category: "Герметизация",
        packageInfo: {
          count: jointTapeRolls,
          size: jointTapeRollLengthM,
          packageUnit: "рулонов",
        },
      });
    }

    const atticFinishType = clampInteger(
      readNumber(inputs.atticFinishType, 0),
      0,
      2,
    );
    const finishLayers =
      atticFinishType > 0
        ? clampInteger(readNumber(inputs.finishLayers, 1), 1, 3)
        : 0;
    const finishReservePercent = clamp(
      readNumber(inputs.finishReservePercent, 0),
      0,
      30,
    );
    const finishCleanAreaM2 = round(roofArea * finishLayers, 6);
    const finishReservedAreaM2 = round(
      finishCleanAreaM2 * (1 + finishReservePercent / 100),
      6,
    );
    let finishPurchaseUnits = 0;
    let finishPurchasedEquivalent = 0;
    let finishLeftoverEquivalent = 0;

    if (atticFinishType === 1) {
      const woodFinishPackCoverageM2 = clamp(
        readNumber(inputs.woodFinishPackCoverageM2, 2.88),
        0.01,
        1000,
      );
      finishPurchaseUnits = ceilPositive(
        finishReservedAreaM2 / woodFinishPackCoverageM2,
      );
      finishPurchasedEquivalent = round(
        finishPurchaseUnits * woodFinishPackCoverageM2,
        6,
      );
      finishLeftoverEquivalent = round(
        Math.max(0, finishPurchasedEquivalent - finishReservedAreaM2),
        6,
      );
      materials.push({
        name: "Деревянная отделка выбранного профиля",
        quantity: finishCleanAreaM2,
        unit: "м²",
        withReserve: finishReservedAreaM2,
        purchaseQty: finishPurchasedEquivalent,
        category: "Отделка",
        packageInfo: {
          count: finishPurchaseUnits,
          size: woodFinishPackCoverageM2,
          packageUnit: "упаковок",
        },
      });
    } else if (atticFinishType === 2) {
      const finishSheetLengthM = clamp(
        readNumber(inputs.finishSheetLengthM, 2.5),
        0.1,
        10,
      );
      const finishSheetWidthM = clamp(
        readNumber(inputs.finishSheetWidthM, 1.2),
        0.1,
        5,
      );
      const finishSheetAreaM2 = finishSheetLengthM * finishSheetWidthM;
      const cleanSheets = round(finishCleanAreaM2 / finishSheetAreaM2, 6);
      const reservedSheets = round(
        cleanSheets * (1 + finishReservePercent / 100),
        6,
      );
      finishPurchaseUnits = ceilPositive(reservedSheets);
      finishPurchasedEquivalent = finishPurchaseUnits;
      finishLeftoverEquivalent = round(
        Math.max(0, finishPurchaseUnits - reservedSheets),
        6,
      );
      materials.push({
        name: "Листовая отделка выбранного типа",
        quantity: cleanSheets,
        unit: "листов",
        withReserve: reservedSheets,
        purchaseQty: finishPurchaseUnits,
        category: "Отделка",
        subtitle: `${formatRuNumber(finishSheetLengthM)} × ${formatRuNumber(
          finishSheetWidthM,
        )} м; ${formatRuNumber(finishLayers)} ${pluralRu(
          finishLayers,
          "слой",
          "слоя",
          "слоёв",
        )}`,
      });
    }

    const projectItemsEnabled =
      clampInteger(readNumber(inputs.projectItemsEnabled, 0), 0, 1) === 1;
    const projectBattenLengthM = projectItemsEnabled
      ? clamp(readNumber(inputs.projectBattenLengthM, 0), 0, 100000)
      : 0;
    const battenBarLengthM = clamp(
      readNumber(inputs.battenBarLengthM, 3),
      0.1,
      30,
    );
    const battenBars =
      projectItemsEnabled && projectBattenLengthM > 0
        ? ceilPositive(projectBattenLengthM / battenBarLengthM)
        : 0;
    const battenPurchasedLengthM = round(battenBars * battenBarLengthM, 6);

    if (battenBars > 0) {
      materials.push({
        name: "Рейки или профиль по проекту",
        quantity: round(projectBattenLengthM, 6),
        unit: "м",
        withReserve: round(projectBattenLengthM, 6),
        purchaseQty: battenPurchasedLengthM,
        category: "Проектная ведомость",
        packageInfo: {
          count: battenBars,
          size: battenBarLengthM,
          packageUnit: "шт",
        },
      });
    }

    const projectFastenerCount = projectItemsEnabled
      ? clampInteger(readNumber(inputs.projectFastenerCount, 0), 0, 1000000)
      : 0;
    const fastenersPerPack = clampInteger(
      readNumber(inputs.fastenersPerPack, 200),
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
        name: "Крепёж по проекту",
        quantity: projectFastenerCount,
        unit: "шт",
        withReserve: projectFastenerCount,
        purchaseQty: fastenerPurchaseCount,
        category: "Проектная ведомость",
        packageInfo: {
          count: fastenerPacks,
          size: fastenersPerPack,
          packageUnit: "упаковок",
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
      exact_need: insulationReservedLayerAreaM2,
      purchase_quantity: insulationPurchasedLayerAreaM2,
      leftover: insulationLeftoverLayerAreaM2,
      assumptions: [
        `formula_version:${WEB_FORMULA_VERSION}`,
        `project_thickness_mm:${insulationThickness}`,
        `product_thickness_mm:${insulationProductThicknessMm}`,
        `layers:${insulationLayerCount}`,
        `explicit_reserve_percent:${insulationReservePercent}`,
        `pack_coverage_m2:${insulationPackCoverageM2}`,
      ],
      key_factors: {
        layer_count: insulationLayerCount,
        explicit_reserve_percent: insulationReservePercent,
        hidden_multiplier: 1,
      },
      buy_plan: {
        package_label: "insulation-package",
        package_size: insulationPackCoverageM2,
        packages_count: insulationPurchasePackages,
        unit: "м²·слой",
      },
    };

    const warnings: string[] = [
      "Это закупочный расчёт по введённой проектной толщине. Требуемую толщину задаёт теплотехнический расчёт ограждающей конструкции; калькулятор не выбирает её по региону.",
      "Состав и порядок кровельного пирога, тип мембран, вентиляционные зазоры, примыкания и допустимость материалов принимают по проекту и инструкциям выбранной системы.",
      "Площадной расчёт не заменяет раскладку между стропилами, у ендов, окон, фронтонов и сложных узлов; пригодность обрезков учитывайте явным запасом.",
      "MIN/REC/MAX и режим точности совпадают: поверх введённых слоёв, запасов и фасовок скрытые коэффициенты не применяются.",
    ];

    const thicknessOverbuildMm = round(
      installedInsulationThicknessMm - insulationThickness,
      3,
    );
    if (thicknessOverbuildMm > 0) {
      warnings.push(
        `Из выбранных слоёв набирается ${formatRuNumber(
          installedInsulationThicknessMm,
        )} мм — на ${formatRuNumber(
          thicknessOverbuildMm,
        )} мм больше проектного значения. Проверьте допустимость узла и доступную высоту.`,
      );
    }
    if (!windMembraneEnabled || !vapourBarrierEnabled) {
      warnings.push(
        "Выключенные мембраны не означают, что они не нужны: они просто не включены в закупочную ведомость без принятого проектом типа и фасовки.",
      );
    }
    if (jointTapeEnabled && projectJointLengthM === 0) {
      warnings.push(
        "Лента включена, но проектная длина стыков равна нулю — позиция не добавлена.",
      );
    }
    if (atticFinishType > 0) {
      warnings.push(
        "Для отделки посчитан только облицовочный материал. Каркас, подвесы, крепёж, шпаклёвка, герметики и защита древесины появляются только из отдельной проектной ведомости.",
      );
    }
    if (
      projectItemsEnabled &&
      projectBattenLengthM === 0 &&
      projectFastenerCount === 0
    ) {
      warnings.push(
        "Проектный блок включён, но длина каркаса и количество крепежа равны нулю — дополнительные позиции не добавлены.",
      );
    }

    const practicalNotes = [
      "Сверьте площадь упаковки для выбранной толщины: у одного продукта она меняется вместе с толщиной и количеством плит.",
      "Не сжимайте утеплитель по толщине ради установки в меньшую полость: фактический узел должен соответствовать проекту и инструкции производителя.",
      "До покупки проверьте непрерывность теплового контура, примыкания, проходки и совместимость лент с конкретными мембранами.",
    ];

    const summaryCards: SummaryCard[] = [
      {
        icon: "▱",
        label: "Площадь скатов",
        value: formatRuNumber(roofArea),
        unit: "м²",
        hint: `${formatRuNumber(insulationLayerCount)} ${pluralRu(
          insulationLayerCount,
          "слой",
          "слоя",
          "слоёв",
        )}`,
        tone: "violet",
      },
      {
        icon: "↕",
        label: "Набранная толщина",
        value: formatRuNumber(installedInsulationThicknessMm),
        unit: "мм",
        hint: `по проекту ${formatRuNumber(insulationThickness)} мм`,
        tone: "slate",
      },
      {
        icon: "▦",
        label: "Утеплителя к покупке",
        value: formatRuNumber(insulationPurchasePackages),
        unit: pluralRu(
          insulationPurchasePackages,
          "упаковка",
          "упаковки",
          "упаковок",
        ),
        hint: `${formatRuNumber(
          insulationPurchasedLayerAreaM2,
        )} м²·слой по выбранной фасовке`,
        tone: "emerald",
      },
    ];

    return {
      materials,
      totals: {
        roofArea: round(roofArea, 6),
        insulationThickness: round(insulationThickness, 3),
        insulationProductThicknessMm: round(
          insulationProductThicknessMm,
          3,
        ),
        insulationPackCoverageM2: round(insulationPackCoverageM2, 6),
        insulationReservePercent: round(insulationReservePercent, 3),
        insulationLayerCount,
        installedInsulationThicknessMm,
        insulationCleanLayerAreaM2,
        insulationReservedLayerAreaM2,
        insulationPurchasePackages,
        insulationPurchasedLayerAreaM2,
        insulationLeftoverLayerAreaM2,
        windMembraneEnabled: windMembraneEnabled ? 1 : 0,
        windMembraneRequiredM2,
        windMembraneRolls,
        windMembranePurchasedM2,
        windMembraneLeftoverM2,
        vapourBarrierEnabled: vapourBarrierEnabled ? 1 : 0,
        vapourBarrierRequiredM2,
        vapourBarrierRolls,
        vapourBarrierPurchasedM2,
        vapourBarrierLeftoverM2,
        jointTapeEnabled: jointTapeEnabled ? 1 : 0,
        projectJointLengthM: round(projectJointLengthM, 6),
        jointTapeRequiredM,
        jointTapeRolls,
        jointTapePurchasedM,
        jointTapeLeftoverM,
        atticFinishType,
        finishLayers,
        finishCleanAreaM2,
        finishReservedAreaM2,
        finishPurchaseUnits,
        finishPurchasedEquivalent,
        finishLeftoverEquivalent,
        projectItemsEnabled: projectItemsEnabled ? 1 : 0,
        projectBattenLengthM: round(projectBattenLengthM, 6),
        battenBars,
        battenPurchasedLengthM,
        projectFastenerCount,
        fastenerPacks,
        fastenerPurchaseCount,
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
      canonicalSpecId: atticSpec.calculator_id,
      practicalNotes,
      accuracyMode,
      accuracyExplanation: {
        mode: accuracyMode,
        modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
        combinedMultiplier: 1,
        appliedModifiers: [],
        notes: [
          "Режим точности не меняет закупку: применяются только введённые слои, явные запасы и фактические фасовки.",
        ],
      },
      summaryCards,
      materialListBanner:
        "Основной результат — утеплитель по проектной толщине. Остальные позиции появляются только после явного включения.",
    };
  },
  formulaDescription: `
**Утеплитель по фактической фасовке:**
- число слоёв = округление вверх (проектная толщина / толщина выбранного изделия);
- чистая послойная площадь = площадь скатов × число слоёв;
- потребность с запасом = чистая послойная площадь × (1 + ваш запас / 100);
- упаковок = округление вверх (потребность с запасом / площадь материала в упаковке);
- мембраны, лента, отделка, каркас и крепёж считаются только после явного включения по своим проектным данным.

Требуемая теплозащита, влажностный режим и конструкция кровельного пирога этим площадным расчётом не определяются.
  `,
  howToUse: [
    "Введите суммарную площадь утепляемых скатов по обмеру.",
    "Перенесите проектную толщину утепления и толщину выбранной плиты или мата.",
    "Укажите площадь материала в упаковке именно для выбранной толщины.",
    "Выберите явный запас по раскладке и возможности использовать обрезки.",
    "При необходимости включите мембраны, ленту, отделку и проектные позиции, заполнив их фактические фасовки.",
  ],
  expertTips: [
    {
      title: "Проверяйте не только квадратные метры",
      content:
        "До закупки сопоставьте толщину слоёв с высотой полости, шагом стропил, перекрёстным слоем и непрерывностью теплового контура. Площадь упаковки отвечает за количество товара, но не подтверждает правильность узла.",
      author: "Михалыч",
    },
  ],
  faq: [
    {
      question: "Как посчитать количество упаковок утеплителя для мансарды?",
      answer:
        "Умножьте площадь утепляемых скатов на число слоёв, добавьте выбранный по раскладке запас и разделите на фактическую площадь материала в одной упаковке нужной толщины. Итог округляют вверх до целой упаковки.",
    },
    {
      question: "Какую толщину утеплителя указать?",
      answer:
        "Введите готовую проектную толщину из теплотехнического расчёта конкретной конструкции. Калькулятор не назначает 150, 200 или 250 мм по названию региона, потому что результат зависит от климата, материалов слоёв, мостиков холода и режима эксплуатации.",
    },
    {
      question: "Почему мембраны по умолчанию выключены?",
      answer:
        "Тип, положение, нахлёсты и герметизация мембран зависят от принятого кровельного пирога и инструкции системы. Калькулятор добавляет их в закупку только после явного включения и ввода фактической площади рулона.",
    },
    {
      question: "Считает ли калькулятор полноценную отделку мансарды?",
      answer:
        "Нет. Он может посчитать площадь упаковок деревянной облицовки или число листов. Каркас, подвесы, крепёж, обработка древесины, швы и финишные составы требуют отдельной раскладки и проектной ведомости.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор утепления мансарды</h2>
<p>Калькулятор переводит площадь утепляемых скатов и уже принятую проектную толщину в количество упаковок конкретного утеплителя. Пользователь вводит толщину выбранной плиты или мата, площадь материала в упаковке и собственный запас по раскрою. Поэтому результат не зависит от скрытого названия бренда или универсальной пачки.</p>

<h2>Формула количества утеплителя</h2>
<ol>
  <li>Число слоёв округляется вверх из отношения проектной толщины к толщине выбранного изделия.</li>
  <li>Площадь скатов умножается на число слоёв — получается послойная площадь утеплителя.</li>
  <li>Один раз применяется выбранный пользователем запас.</li>
  <li>Потребность делится на площадь материала в упаковке и округляется вверх до целых упаковок.</li>
</ol>
<p>Например, 60 м² скатов при проектной толщине 200 мм и плитах 100 мм требуют два слоя, то есть 120 м²·слой. Если в упаковке 3 м² и запас равен нулю, к покупке получится 40 упаковок.</p>

<h2>Почему калькулятор не выбирает толщину по региону</h2>
<p>Требуемая толщина является результатом теплотехнического расчёта всей ограждающей конструкции, а не одной таблицы по городам. Действующий <a href="https://protect.gost.ru/sp/details/5081dae9-9ee9-455f-80e8-d093d495361c">СП 50.13330.2024 «Тепловая защита зданий»</a> регулирует проектирование тепловой защиты. В калькулятор переносится готовая проектная толщина; сопротивление теплопередаче, влажностный режим и мостики холода здесь не вычисляются.</p>

<h2>Мембраны и кровельный пирог</h2>
<p><a href="https://protect.gost.ru/sp/details/844352c5-dda6-4006-acd8-b6875d1ed6a8">СП 17.13330.2017 «Кровли»</a> распространяется на проектирование и ремонт кровель, включая решения с диффузионными плёнками и пароизоляцией. Официальная <a href="https://www.knauf.ru/upload/iblock/c98/lnrplqjdz57umpmclo8h517o49ckylz9/Knauf-Insulation_Professionalnyy-segment_Instruktsiya-po-primeneniyu-v-konstruktsii-skatnoy-krovli.pdf">инструкция КНАУФ для скатной кровли</a> показывает разные варианты узла в зависимости от применяемой плёнки и вентиляционного зазора. В <a href="https://nav.tn.ru/knowledge-base/materialy/gidro-vetrozashchita-i-paroizolyatsiya/paroizolyatsionnye-materialy-dlya-skatnoy-krovli-i-sten/montazh-paroizolyatsionnykh-membran-tekhnonikol/">инструкции ТЕХНОНИКОЛЬ по монтажу пароизоляционных мембран</a> нахлёсты и герметизация привязаны к конкретному материалу и узлу. Поэтому калькулятор не назначает универсальные 15% и один тип ленты.</p>

<h2>Границы результата</h2>
<p>Результат является закупочной оценкой для прямоугольного площадного эквивалента. Он не заменяет раскладку между стропилами, расчёт ендов и окон, проект вентиляционных зазоров, проверку основания, пожарные требования и контроль герметичности. Мембраны, ленты, облицовка, каркас и крепёж появляются только после ввода их фактических проектных данных.</p>
    `,
    faq: [
      {
        question: "Сколько утеплителя нужно на 60 м² мансарды?",
        answer:
          "<p>Количество зависит не только от площади. При проектной толщине 200 мм и изделии толщиной 100 мм нужно два слоя — 120 м²·слой. Затем результат делят на площадь материала в упаковке нужной толщины и округляют вверх. При упаковке 3 м² без запаса это 40 упаковок.</p>",
      },
      {
        question: "Нужно ли добавлять запас на утеплитель?",
        answer:
          "<p>Запас зависит от шага стропил, геометрии скатов, размеров изделия и возможности использовать обрезки. В калькуляторе он вводится явно и применяется один раз; MIN/REC/MAX не добавляют скрытый второй процент.</p>",
      },
      {
        question: "Можно ли по площади скатов посчитать ленту и каркас?",
        answer:
          "<p>Надёжно — нет. Длина ленты зависит от раскладки полотен, примыканий и проходок, а каркас — от схемы, шага, узлов и проёмов. Эти позиции считаются только по готовой проектной длине и фактической товарной фасовке.</p>",
      },
    ],
  },
};
