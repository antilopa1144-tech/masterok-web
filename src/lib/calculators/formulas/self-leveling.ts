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
import selfLevelingSpec from "../../../../configs/calculators/self-leveling-canonical.v1.json";

const WEB_FORMULA_VERSION = "self-leveling-web-purchase-v1";

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

export const selfLevelingDef: CalculatorDefinition = {
  id: "floors_self_leveling",
  slug: "nalivnoy-pol",
  formulaVersion: WEB_FORMULA_VERSION,
  title: "Калькулятор наливного пола",
  h1: "Калькулятор наливного пола — смесь, толщина и мешки",
  description:
    "Рассчитайте сухую смесь по площади, средней толщине слоя, паспортному расходу выбранного продукта, своему запасу и фактической массе мешка.",
  metaTitle: withSiteMetaTitle("Калькулятор наливного пола: смесь и мешки"),
  metaDescription:
    "Бесплатный калькулятор наливного пола: рассчитайте смесь по площади, средней толщине и паспортному расходу, целые мешки и остаток без скрытых материалов.",
  category: "flooring",
  categorySlug: "poly",
  tags: [
    "наливной пол",
    "самовыравнивающаяся смесь",
    "расход наливного пола",
    "мешки наливного пола",
    "толщина наливного пола",
  ],
  popularity: 58,
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
      max: 50,
      step: 0.1,
      defaultValue: 5,
      group: "bySize",
      hint: "Для сложного контура выберите готовую площадь по обмеру.",
    },
    {
      key: "width",
      label: "Ширина прямоугольного участка",
      type: "slider",
      unit: "м",
      min: 1,
      max: 50,
      step: 0.1,
      defaultValue: 4,
      group: "bySize",
    },
    {
      key: "area",
      label: "Готовая площадь заливки",
      type: "number",
      unit: "м²",
      min: 0.1,
      max: 10000,
      step: 0.1,
      defaultValue: 20,
      group: "byArea",
      hint:
        "Сумма всех участков заливки. Готовая площадь не содержит сведений о периметре и швах.",
    },
    {
      key: "thickness",
      label: "Средняя расчётная толщина",
      type: "number",
      unit: "мм",
      min: 1,
      max: 200,
      step: 0.1,
      defaultValue: 10,
      group: "Смесь",
      hint:
        "Определите по карте промеров или нивелирному плану. Максимальная яма и средняя толщина — разные величины.",
    },
    {
      key: "productConsumptionKgPerM2Mm",
      label: "Паспортный расход сухой смеси",
      type: "number",
      unit: "кг/м²/мм",
      min: 0.1,
      max: 5,
      step: 0.01,
      defaultValue: 1.6,
      group: "Смесь",
      hint:
        "Перенесите норму из актуального техлиста выбранного продукта. Значение 1,6 — только стартовый пример формы, а не универсальная норма.",
    },
    {
      key: "reservePercent",
      label: "Ваш запас смеси",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      group: "Смесь",
      hint:
        "Применяется один раз до округления по мешкам. MIN/REC/MAX и режим точности не добавляют второй процент.",
    },
    {
      key: "bagWeightKg",
      label: "Масса одного мешка",
      type: "number",
      unit: "кг",
      min: 1,
      max: 100,
      step: 0.1,
      defaultValue: 25,
      group: "Смесь",
      hint: "Фактическая масса упаковки выбранного артикула.",
    },
    {
      key: "layerLimitsEnabled",
      label: "Проверить диапазон слоя продукта",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — диапазон не введён" },
        { value: 1, label: "Да — введу минимум и максимум" },
      ],
      group: "Паспорт продукта",
      fullWidth: true,
      hint:
        "Диапазон зависит от конкретного продукта и способа устройства, поэтому калькулятор не подставляет его по общему названию смеси.",
    },
    {
      key: "productMinThicknessMm",
      label: "Минимальный слой по техлисту",
      type: "number",
      unit: "мм",
      min: 0.1,
      max: 200,
      step: 0.1,
      defaultValue: 1,
      group: "Паспорт продукта",
      hideIf: { key: "layerLimitsEnabled", op: "eq", value: 0 },
    },
    {
      key: "productMaxThicknessMm",
      label: "Максимальный слой по техлисту",
      type: "number",
      unit: "мм",
      min: 0.1,
      max: 500,
      step: 0.1,
      defaultValue: 30,
      group: "Паспорт продукта",
      hideIf: { key: "layerLimitsEnabled", op: "eq", value: 0 },
    },
    {
      key: "primerEnabled",
      label: "Добавить грунтовку из системы",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — грунт не подтверждён" },
        { value: 1, label: "Да — введу площадь, расход и фасовку" },
      ],
      group: "Грунтовка",
      fullWidth: true,
      hint:
        "Тип грунта, число проходов и расход зависят от основания и принятой системы материалов.",
    },
    {
      key: "projectPrimerAreaM2",
      label: "Площадь грунтования по проекту",
      type: "number",
      unit: "м²",
      min: 0,
      max: 100000,
      step: 0.1,
      defaultValue: 0,
      group: "Грунтовка",
      hideIf: { key: "primerEnabled", op: "eq", value: 0 },
    },
    {
      key: "primerRateLPerM2",
      label: "Паспортный расход на один слой",
      type: "number",
      unit: "л/м²",
      min: 0.001,
      max: 10,
      step: 0.001,
      defaultValue: 0.15,
      group: "Грунтовка",
      hideIf: { key: "primerEnabled", op: "eq", value: 0 },
      hint: "Берите норму для фактической впитывающей способности основания.",
    },
    {
      key: "primerCoats",
      label: "Проектное число слоёв",
      type: "number",
      unit: "сл.",
      min: 1,
      max: 20,
      step: 1,
      integerOnly: true,
      defaultValue: 1,
      group: "Грунтовка",
      hideIf: { key: "primerEnabled", op: "eq", value: 0 },
    },
    {
      key: "primerReservePercent",
      label: "Ваш запас грунтовки",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      group: "Грунтовка",
      hideIf: { key: "primerEnabled", op: "eq", value: 0 },
    },
    {
      key: "primerCanL",
      label: "Объём одной канистры",
      type: "number",
      unit: "л",
      min: 0.1,
      max: 1000,
      step: 0.1,
      defaultValue: 5,
      group: "Грунтовка",
      hideIf: { key: "primerEnabled", op: "eq", value: 0 },
    },
    {
      key: "damperEnabled",
      label: "Добавить демпферную ленту по проекту",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — узел не подтверждён" },
        { value: 1, label: "Да — введу измеренную длину" },
      ],
      group: "Демпферная лента",
      fullWidth: true,
      hint:
        "Не восстанавливайте длину квадратом из площади: нужны контур, колонны, примыкания и проект швов.",
    },
    {
      key: "projectDamperLengthM",
      label: "Длина ленты по проекту",
      type: "number",
      unit: "м",
      min: 0,
      max: 100000,
      step: 0.1,
      defaultValue: 0,
      group: "Демпферная лента",
      hideIf: { key: "damperEnabled", op: "eq", value: 0 },
    },
    {
      key: "damperReservePercent",
      label: "Ваш запас ленты",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      group: "Демпферная лента",
      hideIf: { key: "damperEnabled", op: "eq", value: 0 },
    },
    {
      key: "damperRollLengthM",
      label: "Длина одного рулона",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 10000,
      step: 0.1,
      defaultValue: 25,
      group: "Демпферная лента",
      hideIf: { key: "damperEnabled", op: "eq", value: 0 },
    },
  ],
  calculate(inputs) {
    const inputMode = clampInteger(readNumber(inputs.inputMode, 0), 0, 1);
    const length = clamp(readNumber(inputs.length, 5), 1, 50);
    const width = clamp(readNumber(inputs.width, 4), 1, 50);
    const area = inputMode === 0
      ? round(length * width, 6)
      : round(clamp(readNumber(inputs.area, 20), 0.1, 10000), 6);

    const thickness = clamp(readNumber(inputs.thickness, 10), 1, 200);
    const productConsumptionKgPerM2Mm = clamp(
      readNumber(inputs.productConsumptionKgPerM2Mm, 1.6),
      0.1,
      5,
    );
    const reservePercent = clamp(readNumber(inputs.reservePercent, 0), 0, 30);
    const bagWeightKg = clamp(
      readNumber(inputs.bagWeightKg ?? inputs.bagWeight, 25),
      1,
      100,
    );

    const exactMixKg = round(
      area * thickness * productConsumptionKgPerM2Mm,
      6,
    );
    const requiredMixKg = applyReserve(exactMixKg, reservePercent);
    const bagsNeeded = ceilPositive(requiredMixKg / bagWeightKg);
    const purchaseMixKg = round(bagsNeeded * bagWeightKg, 6);
    const leftoverMixKg = round(
      Math.max(0, purchaseMixKg - requiredMixKg),
      6,
    );

    const layerLimitsEnabled = readNumber(inputs.layerLimitsEnabled, 0) > 0;
    const productMinThicknessMm = clamp(
      readNumber(inputs.productMinThicknessMm, 1),
      0.1,
      200,
    );
    const productMaxThicknessMm = clamp(
      readNumber(inputs.productMaxThicknessMm, 30),
      0.1,
      500,
    );

    const primerEnabled = readNumber(inputs.primerEnabled, 0) > 0;
    const projectPrimerAreaM2 = primerEnabled
      ? clamp(readNumber(inputs.projectPrimerAreaM2, 0), 0, 100000)
      : 0;
    const primerRateLPerM2 = clamp(
      readNumber(inputs.primerRateLPerM2, 0.15),
      0.001,
      10,
    );
    const primerCoats = clampInteger(readNumber(inputs.primerCoats, 1), 1, 20);
    const primerReservePercent = primerEnabled
      ? clamp(readNumber(inputs.primerReservePercent, 0), 0, 30)
      : 0;
    const primerCanL = clamp(readNumber(inputs.primerCanL, 5), 0.1, 1000);
    const exactPrimerL = round(
      projectPrimerAreaM2 * primerRateLPerM2 * primerCoats,
      6,
    );
    const requiredPrimerL = applyReserve(exactPrimerL, primerReservePercent);
    const primerCans = ceilPositive(requiredPrimerL / primerCanL);
    const purchasePrimerL = round(primerCans * primerCanL, 6);
    const leftoverPrimerL = round(
      Math.max(0, purchasePrimerL - requiredPrimerL),
      6,
    );

    const damperEnabled = readNumber(inputs.damperEnabled, 0) > 0;
    const projectDamperLengthM = damperEnabled
      ? clamp(readNumber(inputs.projectDamperLengthM, 0), 0, 100000)
      : 0;
    const damperReservePercent = damperEnabled
      ? clamp(readNumber(inputs.damperReservePercent, 0), 0, 30)
      : 0;
    const damperRollLengthM = clamp(
      readNumber(inputs.damperRollLengthM, 25),
      0.1,
      10000,
    );
    const requiredDamperLengthM = applyReserve(
      projectDamperLengthM,
      damperReservePercent,
    );
    const damperRolls = ceilPositive(
      requiredDamperLengthM / damperRollLengthM,
    );
    const purchaseDamperLengthM = round(
      damperRolls * damperRollLengthM,
      6,
    );
    const leftoverDamperLengthM = round(
      Math.max(0, purchaseDamperLengthM - requiredDamperLengthM),
      6,
    );

    const materials: MaterialResult[] = [
      {
        name: `Сухая смесь (${formatRuNumber(bagWeightKg)} кг в мешке)`,
        subtitle: `${formatRuNumber(area)} м² × ${formatRuNumber(thickness)} мм × ${formatRuNumber(productConsumptionKgPerM2Mm)} кг/м²/мм; запас ${formatRuNumber(reservePercent)}%`,
        quantity: exactMixKg,
        unit: "кг",
        withReserve: requiredMixKg,
        purchaseQty: purchaseMixKg,
        category: "Основное",
        packageInfo: {
          count: bagsNeeded,
          size: bagWeightKg,
          packageUnit: "мешков",
        },
        highlight: true,
      },
    ];

    if (primerEnabled && projectPrimerAreaM2 > 0) {
      materials.push({
        name: "Грунтовка по техкарте системы",
        subtitle: `${formatRuNumber(projectPrimerAreaM2)} м² × ${formatRuNumber(primerRateLPerM2)} л/м² × ${primerCoats} ${pluralRu(primerCoats, "слой", "слоя", "слоёв")}`,
        quantity: exactPrimerL,
        unit: "л",
        withReserve: requiredPrimerL,
        purchaseQty: purchasePrimerL,
        category: "Подготовка",
        packageInfo: {
          count: primerCans,
          size: primerCanL,
          packageUnit: "канистр",
        },
      });
    }

    if (damperEnabled && projectDamperLengthM > 0) {
      materials.push({
        name: "Демпферная лента по проекту",
        subtitle: `Измеренная длина ${formatRuNumber(projectDamperLengthM)} м; запас ${formatRuNumber(damperReservePercent)}%`,
        quantity: round(projectDamperLengthM, 6),
        unit: "м",
        withReserve: requiredDamperLengthM,
        purchaseQty: purchaseDamperLengthM,
        category: "Узлы",
        packageInfo: {
          count: damperRolls,
          size: damperRollLengthM,
          packageUnit: "рулонов",
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
      exact_need: requiredMixKg,
      purchase_quantity: purchaseMixKg,
      leftover: leftoverMixKg,
      assumptions: [
        `formula_version:${WEB_FORMULA_VERSION}`,
        `area_m2:${area}`,
        `average_thickness_mm:${round(thickness, 6)}`,
        `passport_rate_kg_m2_mm:${round(productConsumptionKgPerM2Mm, 6)}`,
        `explicit_reserve_percent:${round(reservePercent, 3)}`,
        `bag_weight_kg:${round(bagWeightKg, 6)}`,
      ],
      key_factors: {
        explicit_reserve_percent: reservePercent,
        hidden_multiplier: 1,
      },
      buy_plan: {
        package_label: "self-leveling-bag",
        package_size: round(bagWeightKg, 6),
        packages_count: bagsNeeded,
        unit: "кг",
      },
    };

    const warnings: string[] = [
      "Расход 1,6 кг/м²/мм — стартовый пример формы. Перед покупкой замените его значением из актуального техлиста конкретного продукта для принятого основания и способа работ.",
      "Среднюю толщину определяют по карте промеров или нивелирному плану. Одна максимальная яма завышает весь объём, а одна высокая точка может его занизить.",
      "ГОСТ на сухие напольные смеси не назначает расход, диапазон слоя, воду, жизнеспособность и сроки готовности конкретного продукта — эти параметры проверяют по его документации.",
      "Грунтовка и демпферная лента по умолчанию не добавляются. Их тип, проектное количество и фасовку нельзя достоверно вывести только из площади заливки.",
      "Калькулятор не проверяет прочность, влажность и трещины основания, схему швов, совместимость с тёплым полом, условия применения, воду затворения и непрерывность подачи смеси.",
    ];

    if (reservePercent === 0) {
      warnings.push(
        "Запас смеси равен 0%. Это допустимо, если паспортная норма, средняя толщина и организация непрерывной заливки уже подтверждены.",
      );
    }
    if (inputMode === 1) {
      warnings.push(
        "Готовая площадь не определяет периметр, колонны и швы. Для ленты используйте отдельную измеренную проектную длину.",
      );
    }
    if (layerLimitsEnabled) {
      if (productMinThicknessMm > productMaxThicknessMm) {
        warnings.push(
          "Минимальный слой продукта указан больше максимального. Исправьте диапазон по техлисту.",
        );
      } else {
        if (thickness < productMinThicknessMm) {
          warnings.push(
            `Средняя толщина ${formatRuNumber(thickness)} мм ниже паспортного минимума ${formatRuNumber(productMinThicknessMm)} мм. Проверьте применимость продукта и технологию тонкого участка.`,
          );
        }
        if (thickness > productMaxThicknessMm) {
          warnings.push(
            `Средняя толщина ${formatRuNumber(thickness)} мм выше паспортного максимума ${formatRuNumber(productMaxThicknessMm)} мм. Нельзя считать один толстый слой допустимым без решения производителя или проекта.`,
          );
        }
      }
    }
    if (primerEnabled && projectPrimerAreaM2 <= 0) {
      warnings.push(
        "Грунтовка включена, но проектная площадь равна 0 — позиция не добавлена.",
      );
    }
    if (damperEnabled && projectDamperLengthM <= 0) {
      warnings.push(
        "Демпферная лента включена, но проектная длина равна 0 — позиция не добавлена.",
      );
    }

    const practicalNotes = [
      `Чистая масса смеси: ${formatRuNumber(area)} м² × ${formatRuNumber(thickness)} мм × ${formatRuNumber(productConsumptionKgPerM2Mm)} кг/м²/мм = ${formatRuNumber(exactMixKg)} кг.`,
      `После явного запаса ${formatRuNumber(reservePercent)}% требуется ${formatRuNumber(requiredMixKg)} кг: к покупке ${bagsNeeded} ${pluralRu(bagsNeeded, "мешок", "мешка", "мешков")} по ${formatRuNumber(bagWeightKg)} кг, всего ${formatRuNumber(purchaseMixKg)} кг.`,
      `Расчётный остаток после округления упаковки — ${formatRuNumber(leftoverMixKg)} кг. Он не компенсирует ошибку промеров или выход за допустимый слой продукта.`,
      "До закупки сверьте партию, дату производства, условия хранения, воду затворения, время работы, минимальный и максимальный слой и готовность под выбранное покрытие.",
    ];

    return {
      canonicalSpecId: selfLevelingSpec.calculator_id,
      formulaVersion: WEB_FORMULA_VERSION,
      materials,
      totals: {
        inputMode,
        ...(inputMode === 0
          ? { length: round(length, 6), width: round(width, 6) }
          : {}),
        area,
        thickness: round(thickness, 6),
        productConsumptionKgPerM2Mm: round(
          productConsumptionKgPerM2Mm,
          6,
        ),
        reservePercent: round(reservePercent, 3),
        bagWeightKg: round(bagWeightKg, 6),
        exactMixKg,
        requiredMixKg,
        bagsNeeded,
        purchaseMixKg,
        leftoverMixKg,
        layerLimitsEnabled: layerLimitsEnabled ? 1 : 0,
        productMinThicknessMm: round(productMinThicknessMm, 6),
        productMaxThicknessMm: round(productMaxThicknessMm, 6),
        projectPrimerAreaM2: round(projectPrimerAreaM2, 6),
        exactPrimerL,
        requiredPrimerL,
        primerCans,
        purchasePrimerL,
        leftoverPrimerL,
        projectDamperLengthM: round(projectDamperLengthM, 6),
        requiredDamperLengthM,
        damperRolls,
        purchaseDamperLengthM,
        leftoverDamperLengthM,
        minExactNeedKg: requiredMixKg,
        recExactNeedKg: requiredMixKg,
        maxExactNeedKg: requiredMixKg,
        minPurchaseKg: purchaseMixKg,
        recPurchaseKg: purchaseMixKg,
        maxPurchaseKg: purchaseMixKg,
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
          "Режим точности не меняет закупку: действуют только введённые площадь, средняя толщина, паспортный расход, явный запас и масса мешка.",
        ],
      },
      summaryCards: [
        {
          icon: "▤",
          label: "К покупке",
          value: String(bagsNeeded),
          unit: pluralRu(bagsNeeded, "мешок", "мешка", "мешков"),
          hint: `${formatRuNumber(purchaseMixKg)} кг по ${formatRuNumber(bagWeightKg)} кг`,
          tone: "violet",
        },
        {
          icon: "≈",
          label: "Потребность с запасом",
          value: formatRuNumber(requiredMixKg),
          unit: "кг",
          hint: `${formatRuNumber(exactMixKg)} кг + ${formatRuNumber(reservePercent)}%`,
          tone: "amber",
        },
        {
          icon: "□",
          label: "Остаток упаковки",
          value: formatRuNumber(leftoverMixKg),
          unit: "кг",
          hint: "после округления до мешков",
          tone: "emerald",
        },
      ],
    };
  },
  formulaDescription: `
**Сухая смесь:** площадь заливки умножается на среднюю толщину слоя и паспортный расход конкретного продукта в кг/м²/мм. Затем один раз применяется введённый запас, и масса округляется вверх до целых мешков выбранной фасовки.

**Дополнительные позиции:** грунтовка и демпферная лента по умолчанию выключены. Они считаются только по отдельным проектным количествам, техкарте и фактической фасовке.

**Граница модели:** калькулятор не назначает продукт по общему типу смеси и не проектирует основание, швы, воду затворения, технологические перерывы и сроки готовности покрытия.
  `,
  howToUse: [
    "Введите длину и ширину прямоугольного участка или готовую площадь заливки",
    "Определите среднюю толщину по карте промеров, а не по одной глубокой точке",
    "Перенесите из техлиста расход выбранного продукта и с мешка — его фактическую массу",
    "Задайте собственный запас; при необходимости добавьте паспортный диапазон слоя",
    "Включайте грунтовку и ленту только при наличии проектной площади или измеренной длины",
    "Нажмите «Рассчитать» — получите чистую массу, потребность с запасом, целые мешки и остаток",
  ],
  expertTips: [
    {
      title: "Сначала карта толщин",
      content:
        "Разбейте помещение на участки, снимите отметки и определите среднюю толщину каждого участка. Для заметно разных зон надёжнее сделать несколько расчётов и сложить массу, чем умножать всю площадь на максимальную яму.",
      author: "Мастер по устройству полов",
    },
    {
      title: "Паспорт важнее названия смеси",
      content:
        "У продуктов с похожим назначением отличаются расход, допустимый слой, фасовка, время работы и требования к основанию. Переносите параметры выбранного артикула, а не усреднённую норму категории.",
      author: "Прораб",
    },
  ],
  faq: [
    {
      question: "Почему калькулятор просит паспортный расход?",
      answer:
        "Потому что универсального расхода для любого наливного пола нет. Он зависит от состава и плотности конкретной смеси, а производитель указывает норму в техническом листе — обычно на 1 м² при 1 или 10 мм слоя.",
    },
    {
      question: "Как определить среднюю толщину наливного пола?",
      answer:
        "По отметкам основания и проектному уровню готовой поверхности. Для сложного пола разделите его на зоны с близкой толщиной и посчитайте их отдельно; максимальный перепад нельзя автоматически применять ко всей площади.",
    },
    {
      question: "Почему грунтовка и демпферная лента не добавлены сразу?",
      answer:
        "Площадь не задаёт тип основания, впитывающую способность, число слоёв грунта, контур помещения, колонны и схему швов. Включите только подтверждённые проектом позиции и введите их отдельные количества.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор наливного пола</h2>
<p>Расчёт использует только проверяемые исходные данные выбранного продукта:</p>
<p><strong>M<sub>точно</sub> = S × h × R</strong></p>
<p><strong>M<sub>с запасом</sub> = M<sub>точно</sub> × (1 + З/100)</strong></p>
<p><strong>N<sub>мешков</sub> = &lceil;M<sub>с запасом</sub> / m<sub>мешка</sub>&rceil;</strong></p>
<ul>
  <li><strong>S</strong> — измеренная площадь заливки;</li>
  <li><strong>h</strong> — средняя толщина по карте промеров, мм;</li>
  <li><strong>R</strong> — паспортный расход выбранной смеси, кг/м²/мм;</li>
  <li><strong>З</strong> — явный запас пользователя;</li>
  <li><strong>m<sub>мешка</sub></strong> — фактическая масса одной упаковки.</li>
</ul>
<p>Чистая потребность, масса с запасом и закупка целых мешков показываются отдельно. Режим точности и MIN/REC/MAX не добавляют скрытые множители.</p>

<h2>Почему нельзя выбрать одну универсальную норму</h2>
<p>Технические параметры отличаются даже у материалов близкого назначения. Официальная карточка <a href="https://www.ceresit.ru/ru/products/industrial-mortars-fixing-repair/industrial-floors/cn_178" target="_blank" rel="noopener noreferrer">Ceresit CN 178</a> указывает около 1,9 кг/м² на 1 мм и слой 5&ndash;80 мм. Официальная карточка <a href="https://www.volma.ru/production/catalog/mixtures-for-floor-leveling/volma-alignment-arena-self-leveling-floor-cement-based/" target="_blank" rel="noopener noreferrer">ВОЛМА «Нивелир Арена»</a> указывает около 16 кг/м² при 10 мм, то есть около 1,6 кг/м²/мм, и рекомендуемый слой 3&ndash;130 мм.</p>
<p>Эти значения приведены как доказательство различий, а не как автоматические пресеты. Для закупки переносите данные с актуального техлиста своего артикула и проверяйте редакцию документа.</p>

<h2>Как получить среднюю толщину</h2>
<p>Площадь умножается именно на среднюю проектную толщину. Если применить максимальную яму ко всему помещению, масса будет завышена; если взять одну высокую точку — занижена. Для неоднородного основания разделите помещение на зоны, рассчитайте каждую по своей средней толщине и сложите результат.</p>
<p>Локальные выбоины, трещины, уклоны, слабое основание и толстые участки требуют отдельного технологического решения. Калькулятор не доказывает, что весь объём можно залить одним продуктом или за один приём.</p>

<h2>Грунтовка, лента и другие материалы</h2>
<ul>
  <li><strong>Грунтовка</strong> считается только после ввода проектной площади, паспортного расхода на слой, числа слоёв, запаса и объёма канистры;</li>
  <li><strong>Демпферная лента</strong> считается по измеренной длине контура и проектных узлов, а не по квадратному периметру из площади;</li>
  <li><strong>Ремонтные составы, швы, армирование и вода</strong> автоматически не назначаются — для них нет исходных данных и согласованной системы.</li>
</ul>

<h2>Действующие документы и граница расчёта</h2>
<ul>
  <li><a href="https://protect.gost.ru/gost/details/a58a273b-a6f1-4f6b-868e-c0be3a3ef192" target="_blank" rel="noopener noreferrer">ГОСТ 31358-2019</a> действует для сухих строительных напольных смесей и устанавливает технические требования и методы контроля;</li>
  <li><a href="https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939" target="_blank" rel="noopener noreferrer">СП 71.13330.2017 с изменениями</a> регулирует производство и приёмку изоляционных, отделочных работ и покрытий полов;</li>
  <li>проектирование полов рассматривается в СП 29.13330.2011, а конкретный расход, слой, подготовка, вода и сроки остаются в документации выбранного продукта.</li>
</ul>
<p>Соответствие смеси ГОСТу не превращает паспорт одного продукта в универсальную норму для другого и не заменяет обследование основания или проект швов.</p>
`,
    faq: [
      {
        question: "Сколько мешков наливного пола нужно на 20 м² при слое 10 мм?",
        answer:
          "<p>Сначала возьмите паспортный расход выбранной смеси. При примере 1,6 кг/м²/мм чистая масса равна 20 × 10 × 1,6 = 320 кг. Без запаса и при мешке 25 кг потребуется 13 мешков, то есть 325 кг к покупке и 5 кг расчётного остатка. При явном запасе 5% потребуется 336 кг и 14 мешков, или 350 кг.</p><p>Пример нельзя переносить на продукт с другой паспортной нормой или допустимым слоем.</p>",
      },
      {
        question: "Можно ли рассчитать наливной пол только по перепаду?",
        answer:
          "<p>Нет, один максимальный перепад не задаёт объём по всей площади. Нужна карта отметок и средняя толщина слоя, а для зон с разной геометрией — отдельные расчёты. Также проверьте минимальный и максимальный слой выбранного продукта.</p>",
      },
      {
        question: "Калькулятор проверяет, можно ли залить слой за один раз?",
        answer:
          "<p>Только если вы вручную включили и ввели паспортный диапазон, калькулятор предупредит о выходе средней толщины за него. Он не оценивает локальные ямы, способ нанесения, технологические перерывы и устройство швов. Окончательное решение принимают по техлисту продукта и проекту работ.</p>",
      },
    ],
  },
};
