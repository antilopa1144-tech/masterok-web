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
import waterproofingSpec from "../../../../configs/calculators/waterproofing-canonical.v1.json";

const WEB_FORMULA_VERSION = "waterproofing-web-passport-v1";

const ALLOWANCE_OPTIONS = [
  { value: 0, label: "0% — без надбавки" },
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

export const waterproofingDef: CalculatorDefinition = {
  id: "bathroom_waterproof",
  slug: "gidroizolyaciya-vlagozaschita",
  formulaVersion: WEB_FORMULA_VERSION,
  title: "Калькулятор гидроизоляции",
  h1: "Калькулятор гидроизоляции — расход по техкарте и упаковка",
  description:
    "Рассчитайте гидроизоляционный состав по фактической площади покрытия, расходу конкретного продукта, явной надбавке и фасовке.",
  metaTitle: withSiteMetaTitle(
    "Калькулятор гидроизоляции: расход по техкарте",
  ),
  metaDescription:
    "Бесплатный калькулятор гидроизоляции: рассчитайте расход состава по площади и техкарте, явную надбавку и количество упаковок к покупке.",
  category: "interior",
  categorySlug: "otdelka",
  tags: [
    "гидроизоляция",
    "расход гидроизоляции",
    "гидроизоляция на м2",
    "гидроизоляция ванной",
    "гидроизоляция душевой",
    "гидроизоляция под плитку",
    "техкарта гидроизоляции",
  ],
  popularity: 72,
  complexity: 1,
  fields: [
    {
      key: "inputMode",
      label: "Как задана площадь",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Готовая площадь покрытия" },
        { value: 1, label: "Пол и выбранные стены" },
      ],
      hint:
        "Считайте одну однородную позицию: один продукт, одно основание и один предусмотренный техкартой цикл нанесения.",
      fullWidth: true,
    },
    {
      key: "projectAreaM2",
      label: "Площадь гидроизоляции",
      type: "number",
      unit: "м²",
      min: 0.01,
      max: 100000,
      step: 0.1,
      defaultValue: 8,
      hint:
        "Чистая площадь покрытия из обмера или проекта. Не добавляйте длины лент, манжет и других узлов в квадратные метры.",
      hideIf: { key: "inputMode", op: "ne", value: 0 },
    },
    {
      key: "includeFloor",
      label: "Включить пол",
      type: "switch",
      defaultValue: 1,
      hint:
        "Пол считается как длина × ширина. Трапы, пороги, поддоны и участки другой системы обмеряйте отдельно.",
      hideIf: { key: "inputMode", op: "ne", value: 1 },
    },
    {
      key: "roomLengthM",
      label: "Длина пола",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 1000,
      step: 0.01,
      defaultValue: 3,
      hideIf: [
        { key: "inputMode", op: "ne", value: 1 },
        { key: "includeFloor", op: "eq", value: 0 },
      ],
    },
    {
      key: "roomWidthM",
      label: "Ширина пола",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 1000,
      step: 0.01,
      defaultValue: 2,
      hideIf: [
        { key: "inputMode", op: "ne", value: 1 },
        { key: "includeFloor", op: "eq", value: 0 },
      ],
    },
    {
      key: "wallCoverageLengthM",
      label: "Суммарная длина покрываемых стен",
      type: "number",
      unit: "м",
      min: 0,
      max: 100000,
      step: 0.01,
      defaultValue: 10,
      hint:
        "Введите фактическую длину выбранных участков: одну стену душа, несколько полос или весь обмеренный периметр. Калькулятор не подставляет полный периметр сам.",
      hideIf: { key: "inputMode", op: "ne", value: 1 },
      fullWidth: true,
    },
    {
      key: "wallCoverageHeightM",
      label: "Высота покрытия стен",
      type: "number",
      unit: "м",
      min: 0,
      max: 100,
      step: 0.01,
      defaultValue: 0.2,
      hint:
        "Одна высота применяется к введённой длине. Зоны разной высоты разделяйте на отдельные расчёты или вводите готовую площадь.",
      hideIf: [
        { key: "inputMode", op: "ne", value: 1 },
        { key: "wallCoverageLengthM", op: "eq", value: 0 },
      ],
    },
    {
      key: "wallOpeningAreaM2",
      label: "Вычет из площади стен",
      type: "number",
      unit: "м²",
      min: 0,
      max: 100000,
      step: 0.01,
      defaultValue: 0,
      hint:
        "Только участки внутри введённой полосы стен, которые точно не покрываются выбранным составом.",
      hideIf: [
        { key: "inputMode", op: "ne", value: 1 },
        { key: "wallCoverageLengthM", op: "eq", value: 0 },
      ],
    },
    {
      key: "consumptionBasis",
      label: "Как указан расход в техкарте",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Суммарно на весь цикл" },
        { value: 1, label: "На один слой" },
      ],
      hint:
        "Не умножайте суммарный расход на число слоёв повторно. Если производитель даёт норму на слой, выберите второй вариант.",
      fullWidth: true,
    },
    {
      key: "passportConsumptionKgM2",
      label: "Расход из техкарты",
      type: "number",
      unit: "кг/м²",
      min: 0.001,
      max: 100,
      step: 0.001,
      defaultValue: 1.2,
      hint:
        "Замените пример на норму конкретного продукта для вашего основания, требуемой толщины и области применения.",
      fullWidth: true,
    },
    {
      key: "coatCount",
      label: "Число слоёв по техкарте",
      type: "select",
      defaultValue: 2,
      options: [
        { value: 1, label: "1 слой" },
        { value: 2, label: "2 слоя" },
        { value: 3, label: "3 слоя" },
        { value: 4, label: "4 слоя" },
      ],
      hint:
        "Применяется только к расходу на один слой. Допустимое число слоёв и общую толщину задаёт производитель.",
      hideIf: { key: "consumptionBasis", op: "ne", value: 1 },
    },
    {
      key: "allowancePercent",
      label: "Явная надбавка к расходу",
      type: "select",
      unit: "%",
      defaultValue: 5,
      options: ALLOWANCE_OPTIONS,
      hint:
        "Надбавка применяется один раз. Неровность и требуемую толщину лучше учитывать паспортной нормой и подготовкой основания, а не несколькими скрытыми коэффициентами.",
    },
    {
      key: "packageWeightKg",
      label: "Фактическая фасовка",
      type: "number",
      unit: "кг",
      min: 0.1,
      max: 10000,
      step: 0.1,
      defaultValue: 5,
      hint:
        "Введите массу одной неделимой упаковки выбранного артикула.",
    },
  ],
  calculate(inputs) {
    const inputMode = clampInteger(readNumber(inputs.inputMode, 0), 0, 1);
    const projectAreaM2 = clamp(
      readNumber(inputs.projectAreaM2, 8),
      0,
      100000,
    );
    const includeFloor = clampInteger(
      readNumber(inputs.includeFloor, 1),
      0,
      1,
    );
    const roomLengthM = clamp(
      readNumber(inputs.roomLengthM, 3),
      0.1,
      1000,
    );
    const roomWidthM = clamp(
      readNumber(inputs.roomWidthM, 2),
      0.1,
      1000,
    );
    const wallCoverageLengthM = clamp(
      readNumber(inputs.wallCoverageLengthM, 10),
      0,
      100000,
    );
    const wallCoverageHeightM = clamp(
      readNumber(inputs.wallCoverageHeightM, 0.2),
      0,
      100,
    );
    const wallOpeningAreaM2 = clamp(
      readNumber(inputs.wallOpeningAreaM2, 0),
      0,
      100000,
    );
    const consumptionBasis = clampInteger(
      readNumber(inputs.consumptionBasis, 0),
      0,
      1,
    );
    const passportConsumptionKgM2 = clamp(
      readNumber(inputs.passportConsumptionKgM2, 1.2),
      0.001,
      100,
    );
    const coatCount = clampInteger(readNumber(inputs.coatCount, 2), 1, 4);
    const allowancePercent = clamp(
      readNumber(inputs.allowancePercent, 5),
      0,
      30,
    );
    const packageWeightKg = clamp(
      readNumber(inputs.packageWeightKg, 5),
      0.1,
      10000,
    );
    const requestedAccuracyMode = inputs.accuracyMode as unknown as AccuracyMode;
    const accuracyMode: AccuracyMode = [
      "basic",
      "realistic",
      "professional",
      "custom",
    ].includes(requestedAccuracyMode)
      ? requestedAccuracyMode
      : DEFAULT_ACCURACY_MODE;

    const floorAreaM2 = inputMode === 1 && includeFloor === 1
      ? round(roomLengthM * roomWidthM, 6)
      : 0;
    const grossWallAreaM2 = inputMode === 1
      ? round(wallCoverageLengthM * wallCoverageHeightM, 6)
      : 0;
    const appliedWallOpeningAreaM2 = Math.min(
      wallOpeningAreaM2,
      grossWallAreaM2,
    );
    const netWallAreaM2 = round(
      Math.max(0, grossWallAreaM2 - appliedWallOpeningAreaM2),
      6,
    );
    const workAreaM2 = inputMode === 0
      ? round(projectAreaM2, 6)
      : round(floorAreaM2 + netWallAreaM2, 6);
    const coatFactor = consumptionBasis === 1 ? coatCount : 1;
    const baseNeedKg = round(
      workAreaM2 * passportConsumptionKgM2 * coatFactor,
      6,
    );
    const requiredNeedKg = round(
      baseNeedKg * (1 + allowancePercent / 100),
      6,
    );
    const packages = ceilPositive(requiredNeedKg / packageWeightKg);
    const purchaseKg = round(packages * packageWeightKg, 6);
    const leftoverKg = round(Math.max(0, purchaseKg - requiredNeedKg), 6);
    const purchasedSurplusKg = round(Math.max(0, purchaseKg - baseNeedKg), 6);

    const material: MaterialResult = {
      name: "Гидроизоляционный состав выбранного продукта",
      quantity: baseNeedKg,
      unit: "кг",
      withReserve: requiredNeedKg,
      purchaseQty: purchaseKg,
      category: "Основное",
      packageInfo: {
        count: packages,
        size: round(packageWeightKg, 6),
        packageUnit: "упаковок",
      },
      subtitle:
        consumptionBasis === 0
          ? "Паспортный расход введён суммарно на весь предусмотренный цикл"
          : "Паспортный расход введён на один слой и умножен на явное число слоёв",
    };

    const basisAssumption = consumptionBasis === 0
      ? "Расход " + formatRuNumber(passportConsumptionKgM2)
        + " кг/м² введён суммарно на весь предусмотренный цикл."
      : "Расход " + formatRuNumber(passportConsumptionKgM2)
        + " кг/м² на слой умножен на " + coatCount + " "
        + plural(coatCount, "слой", "слоя", "слоёв") + ".";
    const scenario: CalculatorScenario = {
      exact_need: baseNeedKg,
      purchase_quantity: purchaseKg,
      leftover: purchasedSurplusKg,
      assumptions: [
        basisAssumption,
        "Явная надбавка — " + formatRuNumber(allowancePercent) + "%.",
        "Фасовка — " + formatRuNumber(packageWeightKg) + " кг.",
      ],
      key_factors: {
        hidden_multiplier: 1,
        coat_factor: coatFactor,
        explicit_allowance_factor: round(1 + allowancePercent / 100, 6),
      },
      buy_plan: {
        package_label: "упаковка гидроизоляционного состава",
        package_size: packageWeightKg,
        packages_count: packages,
        unit: "кг",
      },
    };

    const warnings = [
      "Калькулятор не выбирает гидроизоляционную систему. Область применения, основание, допустимую влажность, толщину, число слоёв и совместимость с клеем или другим покрытием проверяйте по технической документации.",
      "Гидроизоляционная лента, готовые углы, манжеты, грунтовка, герметики и инструмент не добавляются автоматически: для них нужны фактические длины, число узлов и совместимые позиции одной системы.",
      "Трапы, проходки, деформационные швы, пороги, примыкания и зоны постоянного погружения требуют проектного решения; масса основного состава не подтверждает готовность узлов.",
      "Если разные поверхности требуют другого продукта, расхода или толщины, считайте их отдельными однородными позициями.",
    ];
    if (
      inputMode === 1
      && wallOpeningAreaM2 > grossWallAreaM2
    ) {
      warnings.push(
        "Площадь вычета больше площади введённых стен: введённый вычет ограничен площадью стен, проверьте обмер.",
      );
    }
    if (workAreaM2 === 0) {
      warnings.push(
        "Расчётная площадь равна нулю. Включите пол, добавьте фактическую полосу стен или введите готовую площадь покрытия.",
      );
    }
    if (consumptionBasis === 1) {
      warnings.push(
        "Выбран расход на один слой. Убедитесь, что техкарта допускает линейное умножение этой нормы на указанное число слоёв.",
      );
    }

    const areaNote = inputMode === 0
      ? "Принята готовая площадь покрытия "
        + formatRuNumber(workAreaM2) + " м²."
      : "Пол " + formatRuNumber(floorAreaM2)
        + " м² + стены: " + formatRuNumber(wallCoverageLengthM)
        + " м фактической длины × "
        + formatRuNumber(wallCoverageHeightM) + " м − "
        + formatRuNumber(appliedWallOpeningAreaM2)
        + " м² вычета = " + formatRuNumber(workAreaM2)
        + " м² покрытия.";
    const formulaNote = consumptionBasis === 0
      ? "Чистая потребность: " + formatRuNumber(workAreaM2)
        + " м² × " + formatRuNumber(passportConsumptionKgM2)
        + " кг/м² суммарно на весь цикл = "
        + formatRuNumber(baseNeedKg) + " кг."
      : "Чистая потребность: " + formatRuNumber(workAreaM2)
        + " м² × " + formatRuNumber(passportConsumptionKgM2)
        + " кг/м² на слой × " + coatCount + " "
        + plural(coatCount, "слой", "слоя", "слоёв")
        + " = " + formatRuNumber(baseNeedKg) + " кг.";
    const practicalNotes = [
      areaNote,
      formulaNote,
      "С явной надбавкой " + formatRuNumber(allowancePercent)
        + "% требуется " + formatRuNumber(requiredNeedKg)
        + " кг; к покупке " + packages + " "
        + plural(packages, "упаковка", "упаковки", "упаковок")
        + " по " + formatRuNumber(packageWeightKg)
        + " кг = " + formatRuNumber(purchaseKg) + " кг.",
      "После округления до фасовки останется примерно "
        + formatRuNumber(leftoverKg)
        + " кг сверх потребности с надбавкой.",
      "Перед закупкой сверьте артикул, назначение, толщину сухого слоя, расход, фасовку, срок годности и совместимые системные компоненты.",
    ];

    return {
      canonicalSpecId: waterproofingSpec.calculator_id,
      formulaVersion: WEB_FORMULA_VERSION,
      materials: [material],
      totals: {
        inputMode,
        projectAreaM2: round(projectAreaM2, 6),
        includeFloor,
        roomLengthM: round(roomLengthM, 6),
        roomWidthM: round(roomWidthM, 6),
        wallCoverageLengthM: round(wallCoverageLengthM, 6),
        wallCoverageHeightM: round(wallCoverageHeightM, 6),
        wallOpeningAreaM2: round(wallOpeningAreaM2, 6),
        appliedWallOpeningAreaM2: round(appliedWallOpeningAreaM2, 6),
        floorAreaM2,
        grossWallAreaM2,
        netWallAreaM2,
        workAreaM2,
        consumptionBasis,
        passportConsumptionKgM2: round(passportConsumptionKgM2, 6),
        coatCount,
        coatFactor,
        allowancePercent: round(allowancePercent, 6),
        packageWeightKg: round(packageWeightKg, 6),
        baseNeedKg,
        requiredNeedKg,
        packages,
        purchaseKg,
        leftoverKg,
        purchasedSurplusKg,
        minExactNeed: baseNeedKg,
        recExactNeed: baseNeedKg,
        maxExactNeed: baseNeedKg,
        minPurchase: purchaseKg,
        recPurchase: purchaseKg,
        maxPurchase: purchaseKg,
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
          "Режим точности не меняет расход: учитываются только введённая площадь, паспортная норма, явное число слоёв при соответствующей базе расхода, одна надбавка и фасовка.",
        ],
      },
      summaryCards: [
        {
          icon: "▱",
          label: "Площадь покрытия",
          value: formatRuNumber(workAreaM2),
          unit: "м²",
          hint: inputMode === 0 ? "по обмеру или проекту" : "пол и выбранные стены",
          tone: "slate",
        },
        {
          icon: "◒",
          label: "С надбавкой",
          value: formatRuNumber(requiredNeedKg),
          unit: "кг",
          hint: formatRuNumber(allowancePercent) + "% применено один раз",
          tone: "amber",
        },
        {
          icon: "▤",
          label: "К покупке",
          value: formatRuNumber(purchaseKg),
          unit: "кг",
          hint: packages + " "
            + plural(packages, "упаковка", "упаковки", "упаковок")
            + " по " + formatRuNumber(packageWeightKg) + " кг",
          tone: "emerald",
        },
      ],
    };
  },
  formulaDescription: [
    "**Готовая площадь:** используется чистая площадь одной однородной позиции из обмера или проекта.",
    "",
    "**Пол и выбранные стены:**",
    "- пол = длина × ширина, только если он включён;",
    "- стены брутто = фактическая длина выбранных участков × введённая высота;",
    "- стены нетто = max(0; стены брутто − явный вычет).",
    "",
    "**Чистая потребность:** площадь × паспортный расход. Если расход указан на один слой, дополнительно применяется только явное число слоёв.",
    "",
    "**С надбавкой:** чистая потребность × (1 + введённая надбавка / 100). Надбавка применяется один раз.",
    "",
    "**К покупке:** ⌈потребность с надбавкой / фактическую фасовку⌉ целых упаковок.",
    "",
    "Лента, углы, манжеты, грунтовка, герметики и инструмент без обмера и техкарты не рассчитываются. MIN/REC/MAX и режим точности не добавляют скрытых процентов.",
  ].join("\n"),
  howToUse: [
    "Введите готовую площадь покрытия или отдельно задайте пол и фактическую полосу выбранных стен",
    "Уточните, дана ли норма выбранного продукта суммарно на весь цикл или на один слой",
    "Перенесите расход из техкарты для вашего основания, толщины и области применения",
    "Укажите одну явную надбавку и фактическую массу упаковки выбранного артикула",
    "Нажмите «Рассчитать» и сверьте чистую потребность, надбавку, упаковки и остаток",
    "Отдельно составьте проектную ведомость лент, углов, манжет, проходок, грунта и герметиков совместимой системы",
  ],
  expertTips: [
    {
      title: "Суммарный расход нельзя повторно умножать на слои",
      content:
        "В техкарте норма может быть указана за весь двухслойный цикл или за один слой. Сначала определите базу нормы, иначе ошибка сразу умножит закупку.",
      author: "Технолог гидроизоляционных работ",
    },
    {
      title: "Основной состав не закрывает узлы",
      content:
        "Углы, проходки труб, трапы, деформационные швы и пороги требуют отдельных деталей и решений совместимой системы. Их считают по фактическому обмеру и техкарте, а не процентом от площади.",
      author: "Прораб",
    },
  ],
  faq: [
    {
      question: "Откуда брать расход гидроизоляции на 1 м²?",
      answer:
        "Из технического листа конкретного продукта для вашего основания, области применения и требуемой толщины. Сначала проверьте, указан расход на один слой или суммарно на весь цикл.",
    },
    {
      question: "Нужно ли всегда умножать расход на два слоя?",
      answer:
        "Нет. Если производитель уже приводит суммарный расход для двухслойного покрытия, повторное умножение завысит результат. Число слоёв применяется только к норме, прямо указанной на один слой.",
    },
    {
      question: "Почему калькулятор не считает гидроизоляционную ленту?",
      answer:
        "Для ленты нужны фактические длины стыков и примыканий, число углов, проходок и совместимая система. Площадь пола и стен не определяет эти величины однозначно.",
    },
    {
      question: "Можно ли одним расчётом объединить пол и стены?",
      answer:
        "Только если на них применяется один продукт с одинаковой паспортной нормой и толщиной. Иначе разделите объект на несколько однородных расчётов.",
    },
    {
      question: "Что означает остаток?",
      answer:
        "Это разница между массой купленных целых упаковок и потребностью с введённой надбавкой. Остаток не означает, что материал можно хранить или использовать после вскрытия без ограничений.",
    },
  ],
  seoContent: {
    descriptionHtml: [
      "<h2>Что считает калькулятор гидроизоляции</h2>",
      "<p>Калькулятор переводит фактическую площадь одной однородной зоны и расход выбранного состава в чистую потребность, потребность с явной надбавкой и целые упаковки. Он не назначает продукт и не подменяет проект узлов ванной, душевой, балкона или другого помещения.</p>",
      "",
      "<h2>Суммарный расход и расход на слой — разные данные</h2>",
      "<p>В технической документации норма может относиться ко всему предусмотренному покрытию или к одному слою. Поэтому калькулятор сначала просит выбрать базу нормы. Суммарный расход умножается только на площадь; расход на слой дополнительно умножается на введённое число слоёв.</p>",
      "<p>Например, официальная карточка <a href=\"https://www.knauf.ru/catalog/sukhie-stroitelnye-smesi-i-gotovye-sostavy/mastika-dlya-gidroizolyatsii/knauf-flekhendikht/\" target=\"_blank\" rel=\"noopener noreferrer\">КНАУФ-Флэхендихт</a> приводит суммарный расход двухслойного покрытия: 0,7–1,0 кг/м² для гладкого основания и 0,9–1,4 кг/м² для шероховатого или пористого, а также фасовку 5 кг. В техническом листе <a href=\"https://cdnmedia.mapei.com/docs/librariesprovider50/products-documents/1_02014_mapegum-wps_ru-ru_c9b88b5fd3334583878229cce6b064a8.pdf?sfvrsn=3f6f8c57_0\" target=\"_blank\" rel=\"noopener noreferrer\">Mapei Mapegum WPS</a> указан расход около 1,2 кг/м² для двух слоёв заданной толщины и фасовки 5, 10 и 20 кг. Эти примеры показывают, почему норму и упаковку нужно переносить из документации конкретного артикула, а не выбирать универсальный профиль.</p>",
      "",
      "<h2>Как считается площадь</h2>",
      "<p>Можно ввести готовую чистую площадь из обмера или проекта. В геометрическом режиме пол равен длине, умноженной на ширину, а стены — фактической длине выбранных участков, умноженной на одну введённую высоту, за вычетом явной площади без покрытия. Полный периметр, универсальная высота борта и скрытые мокрые зоны не подставляются.</p>",
      "",
      "<h2>Формула закупки</h2>",
      "<p><strong>Чистая потребность = площадь × паспортный расход × коэффициент слоёв.</strong> Коэффициент равен 1 для суммарного расхода и введённому числу слоёв для нормы на один слой.</p>",
      "<p>Затем один раз применяется введённая надбавка, а масса округляется вверх до фактической фасовки. Режимы MIN/REC/MAX и «точности» не добавляют скрытых коэффициентов.</p>",
      "",
      "<h2>Почему лента и манжеты считаются отдельно</h2>",
      "<p>Длина ленты определяется реальными горизонтальными и вертикальными стыками, а манжеты и готовые углы — числом и типом конкретных узлов. Проходка трубы, трап или деформационный шов не переводятся в фиксированные килограммы основного состава. Грунт, ленту, углы, манжеты, герметики и клей подбирают как совместимые компоненты одной системы по проекту и техкартам.</p>",
      "",
      "<h2>Нормативная граница</h2>",
      "<p><a href=\"https://protect.gost.ru/sp/details/a2711156-c40f-4d0f-89f1-7e3c366bc430\" target=\"_blank\" rel=\"noopener noreferrer\">СП 29.13330.2011 «Полы»</a> распространяется на проектирование полов и содержит гидроизоляцию среди относящихся к ним слоёв. <a href=\"https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939\" target=\"_blank\" rel=\"noopener noreferrer\">СП 71.13330.2017 «Изоляционные и отделочные покрытия»</a> задаёт общие правила производства и приёмки изоляционных работ. Эти документы не превращают одну норму расхода, высоту стены или фасовку в универсальное решение для любого продукта и помещения.</p>",
      "",
      "<h2>Границы результата</h2>",
      "<p>Количество упаковок — сметный результат для одного выбранного состава. Оно не подтверждает допустимость продукта для постоянного погружения, наружной эксплуатации, деформируемого основания или конкретного финишного покрытия. Перед закупкой сверяйте область применения, подготовку, влажность основания, толщину, сушку и совместимость всей системы.</p>",
    ].join("\n"),
    faq: [
      {
        question: "Как посчитать гидроизоляцию ванной под плитку?",
        answer:
          "<p>Обмерьте фактическую площадь пола и выбранных мокрых зон стен, затем перенесите из техкарты расход состава для нужной толщины и основания. Ленту, углы, манжеты и проходки внесите в отдельную ведомость по фактическим длинам и количеству узлов.</p>",
      },
      {
        question: "Почему расход разных гидроизоляций отличается?",
        answer:
          "<p>Продукты различаются составом, назначением, требуемой толщиной, числом слоёв и единицей нормирования. Даже у одного материала расход зависит от состояния основания. Поэтому калькулятор принимает паспортную норму, а не назначает среднее значение.</p>",
      },
      {
        question: "Как учесть неровное или пористое основание?",
        answer:
          "<p>Не добавляйте универсальные 10–20% автоматически. Сначала выполните подготовку, требуемую системой, а расход выберите по строке техкарты для соответствующего основания. Если остаётся обоснованная неопределённость, задайте одну явную надбавку.</p>",
      },
      {
        question: "Нужно ли вычитать трап и проходки из площади?",
        answer:
          "<p>Малые узлы обычно не стоит превращать в случайный вычет площади: вокруг них может понадобиться усиление и отдельные детали системы. Площадь основного покрытия и проект узлов фиксируйте раздельно.</p>",
      },
      {
        question: "Что ещё проверить перед покупкой?",
        answer:
          "<p>Сверьте область применения, допустимое основание, его влажность и подготовку, общую толщину, число слоёв, интервалы сушки, фасовку, срок годности и совместимые грунт, ленту, манжеты, клей или финишное покрытие.</p>",
      },
    ],
  },
};
