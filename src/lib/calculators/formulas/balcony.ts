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

const WEB_FORMULA_VERSION = "balcony-web-cladding-purchase-v1";

const ALLOWANCE_OPTIONS = [
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

export const balconyDef: CalculatorDefinition = {
  id: "balcony",
  slug: "otdelka-balkona",
  formulaVersion: WEB_FORMULA_VERSION,
  title: "Калькулятор обшивки балкона",
  h1: "Калькулятор обшивки балкона — панели, вагонка и упаковки",
  description:
    "Рассчитайте одну позицию вагонки или панелей для балкона по чистой площади, простому обмеру либо готовому числу деталей из раскладки.",
  metaTitle: withSiteMetaTitle(
    "Калькулятор обшивки балкона: панели и вагонка",
  ),
  metaDescription:
    "Бесплатный калькулятор обшивки балкона: рассчитайте вагонку или панели по чистой площади, рабочей ширине, длине, запасу и фасовке.",
  category: "interior",
  categorySlug: "otdelka",
  tags: [
    "обшивка балкона",
    "отделка лоджии",
    "вагонка на балкон",
    "панели для балкона",
    "сколько вагонки",
    "расчёт панелей",
    "упаковки панелей",
  ],
  popularity: 65,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Какие исходные данные есть",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Чистая площадь обшивки" },
        { value: 1, label: "Простой обмер плоскостей" },
        { value: 2, label: "Готовое число деталей" },
      ],
      hint:
        "Чистая площадь удобна после обмера. Простой режим складывает выбранные стены и потолок. Готовое число деталей переносите из раскладки, где уже учтены направление и раскрой.",
      fullWidth: true,
    },
    {
      key: "areaM2",
      label: "Чистая площадь обшивки",
      type: "number",
      unit: "м²",
      min: 0,
      max: 10000,
      step: 0.01,
      defaultValue: 12,
      hint:
        "Сумма реально облицовываемых плоскостей без окон, двери, остекления и других необшиваемых зон, до запаса.",
      hideIf: { key: "inputMode", op: "ne", value: 0 },
    },
    {
      key: "wallRunM",
      label: "Суммарная длина обшиваемых стен",
      type: "number",
      unit: "м",
      min: 0,
      max: 1000,
      step: 0.01,
      defaultValue: 5.2,
      hint:
        "Сложите только те участки парапета и боковых стен, где будет одна выбранная облицовка. Не используйте полный периметр автоматически.",
      hideIf: { key: "inputMode", op: "ne", value: 1 },
    },
    {
      key: "claddingHeightM",
      label: "Высота обшивки стен",
      type: "number",
      unit: "м",
      min: 0,
      max: 20,
      step: 0.01,
      defaultValue: 2.5,
      hint: "Фактическая высота выбранных участков, а не высота помещения по умолчанию.",
      hideIf: { key: "inputMode", op: "ne", value: 1 },
    },
    {
      key: "includeCeiling",
      label: "Добавить потолок",
      type: "switch",
      defaultValue: 1,
      hint:
        "Включайте только если потолок обшивается тем же артикулом, той же длиной и в той же позиции закупки.",
      hideIf: { key: "inputMode", op: "ne", value: 1 },
    },
    {
      key: "ceilingLengthM",
      label: "Длина потолка",
      type: "number",
      unit: "м",
      min: 0,
      max: 100,
      step: 0.01,
      defaultValue: 3,
      hint: "Размер облицовываемого прямоугольника потолка.",
      hideIf: [
        { key: "inputMode", op: "ne", value: 1 },
        { key: "includeCeiling", op: "eq", value: 0 },
      ],
    },
    {
      key: "ceilingWidthM",
      label: "Ширина потолка",
      type: "number",
      unit: "м",
      min: 0,
      max: 100,
      step: 0.01,
      defaultValue: 1.2,
      hint: "Размер облицовываемого прямоугольника потолка.",
      hideIf: [
        { key: "inputMode", op: "ne", value: 1 },
        { key: "includeCeiling", op: "eq", value: 0 },
      ],
    },
    {
      key: "openingAreaM2",
      label: "Вычесть окна, дверь и другие зоны",
      type: "number",
      unit: "м²",
      min: 0,
      max: 10000,
      step: 0.01,
      defaultValue: 4.6,
      hint:
        "Суммарная площадь проёмов и участков без этой облицовки. Если откосы обшиваются, добавьте их площадь отдельно или сразу используйте готовую чистую площадь.",
      hideIf: { key: "inputMode", op: "ne", value: 1 },
    },
    {
      key: "projectPieceCount",
      label: "Деталей по раскладке",
      type: "number",
      unit: "шт",
      min: 0,
      max: 1000000,
      step: 1,
      integerOnly: true,
      defaultValue: 46,
      hint:
        "Количество целых покупных панелей или ламелей из карты раскроя до отдельного закупочного запаса.",
      hideIf: { key: "inputMode", op: "ne", value: 2 },
    },
    {
      key: "usableWidthMm",
      label: "Рабочая ширина облицовки",
      type: "number",
      unit: "мм",
      min: 10,
      max: 3000,
      step: 1,
      integerOnly: true,
      defaultValue: 96,
      hint:
        "Полезная ширина после соединения, без скрытой части шипа или замка. Перепишите её из карточки конкретного изделия.",
      hideIf: { key: "inputMode", op: "eq", value: 2 },
    },
    {
      key: "pieceLengthM",
      label: "Длина одной панели или ламели",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 20,
      step: 0.01,
      defaultValue: 3,
      hint:
        "Фактическая покупная длина выбранного артикула. Расчёт по площади не оптимизирует поперечный раскрой этой длины.",
      hideIf: { key: "inputMode", op: "eq", value: 2 },
    },
    {
      key: "allowancePercent",
      label: "Явный закупочный запас",
      type: "select",
      unit: "%",
      defaultValue: 10,
      options: ALLOWANCE_OPTIONS,
      hint:
        "Выберите запас по реальной раскладке, подрезкам, рисунку, качеству материала и возможности добрать ту же партию. Калькулятор применит его один раз.",
    },
    {
      key: "packagingMode",
      label: "Как продаётся материал",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Поштучно / фасовка неизвестна" },
        { value: 1, label: "Целыми упаковками" },
      ],
      hint:
        "Не угадывайте фасовку по типу панели. Если товар продаётся пачками, перепишите число деталей с этикетки выбранного артикула.",
      fullWidth: true,
    },
    {
      key: "piecesPerPack",
      label: "Деталей в упаковке",
      type: "number",
      unit: "шт",
      min: 1,
      max: 10000,
      step: 1,
      integerOnly: true,
      defaultValue: 6,
      hint: "Фактическая фасовка одной упаковки по маркировке товара.",
      hideIf: { key: "packagingMode", op: "ne", value: 1 },
    },
  ],
  calculate(inputs) {
    const inputMode = clampInteger(readNumber(inputs.inputMode, 0), 0, 2);
    const areaM2 = clamp(readNumber(inputs.areaM2, 12), 0, 10000);
    const wallRunM = clamp(readNumber(inputs.wallRunM, 5.2), 0, 1000);
    const claddingHeightM = clamp(readNumber(inputs.claddingHeightM, 2.5), 0, 20);
    const includeCeiling = readNumber(inputs.includeCeiling, 1) >= 0.5 ? 1 : 0;
    const ceilingLengthM = clamp(readNumber(inputs.ceilingLengthM, 3), 0, 100);
    const ceilingWidthM = clamp(readNumber(inputs.ceilingWidthM, 1.2), 0, 100);
    const openingAreaM2 = clamp(readNumber(inputs.openingAreaM2, 4.6), 0, 10000);
    const projectPieceCount = clampInteger(
      readNumber(inputs.projectPieceCount, 46),
      0,
      1000000,
    );
    const usableWidthMm = clampInteger(
      readNumber(inputs.usableWidthMm, 96),
      10,
      3000,
    );
    const pieceLengthM = clamp(readNumber(inputs.pieceLengthM, 3), 0.1, 20);
    const allowancePercent = clamp(
      readNumber(inputs.allowancePercent, 10),
      0,
      30,
    );
    const packagingMode = clampInteger(
      readNumber(inputs.packagingMode, 0),
      0,
      1,
    );
    const piecesPerPack = clampInteger(
      readNumber(inputs.piecesPerPack, 6),
      1,
      10000,
    );

    const wallAreaM2 = inputMode === 1 ? wallRunM * claddingHeightM : 0;
    const ceilingAreaM2 = inputMode === 1 && includeCeiling === 1
      ? ceilingLengthM * ceilingWidthM
      : 0;
    const grossAreaM2 = inputMode === 1 ? wallAreaM2 + ceilingAreaM2 : 0;
    const appliedOpeningAreaM2 = inputMode === 1
      ? Math.min(openingAreaM2, grossAreaM2)
      : 0;
    const selectedAreaM2 = inputMode === 0
      ? areaM2
      : inputMode === 1
        ? Math.max(0, grossAreaM2 - appliedOpeningAreaM2)
        : 0;
    const pieceCoverageM2 = inputMode === 2
      ? 0
      : (usableWidthMm / 1000) * pieceLengthM;
    const theoreticalPieces = inputMode === 2
      ? projectPieceCount
      : pieceCoverageM2 > 0
        ? selectedAreaM2 / pieceCoverageM2
        : 0;
    const basePieces = inputMode === 2
      ? projectPieceCount
      : ceilPositive(theoreticalPieces);
    const requiredPieces = ceilPositive(
      theoreticalPieces * (1 + allowancePercent / 100),
    );
    const packs = packagingMode === 1
      ? ceilPositive(requiredPieces / piecesPerPack)
      : 0;
    const purchasePieces = packagingMode === 1
      ? packs * piecesPerPack
      : requiredPieces;
    const purchasedSurplusPieces = Math.max(0, purchasePieces - requiredPieces);

    const materialName = inputMode === 2
      ? "Облицовочные детали по раскладке"
      : `Панели / вагонка ${usableWidthMm} мм × ${formatRuNumber(pieceLengthM)} м`;
    const material: MaterialResult = {
      name: materialName,
      subtitle: packagingMode === 1
        ? `${inputMode === 2 ? "готовое число из раскладки" : `${formatRuNumber(selectedAreaM2)} м² по рабочей ширине`}; явный запас ${formatRuNumber(allowancePercent)}%; ${packs} ${plural(packs, "упаковка", "упаковки", "упаковок")} × ${piecesPerPack} шт`
        : `${inputMode === 2 ? "готовое число из раскладки" : `${formatRuNumber(selectedAreaM2)} м² по рабочей ширине`}; явный запас ${formatRuNumber(allowancePercent)}%; фасовка не задана — показана поштучная потребность`,
      quantity: basePieces,
      unit: "шт",
      withReserve: requiredPieces,
      purchaseQty: purchasePieces,
      category: "Облицовка",
      ...(packagingMode === 1
        ? {
            packageInfo: {
              count: packs,
              size: piecesPerPack,
              packageUnit: "упаковок",
            },
          }
        : {}),
    };

    const requestedAccuracyMode = inputs.accuracyMode as unknown as AccuracyMode | undefined;
    const accuracyMode =
      requestedAccuracyMode && requestedAccuracyMode in ACCURACY_MODE_LABELS
        ? requestedAccuracyMode
        : DEFAULT_ACCURACY_MODE;

    const scenario: CalculatorScenario = {
      exact_need: basePieces,
      purchase_quantity: purchasePieces,
      leftover: Math.max(0, purchasePieces - basePieces),
      assumptions: [
        `formula_version:${WEB_FORMULA_VERSION}`,
        `input_mode:${inputMode}`,
        `allowance_percent:${round(allowancePercent, 6)}`,
        `packaging_mode:${packagingMode}`,
        "single_cladding_position",
        "no_hidden_scenario_multiplier",
      ],
      key_factors: {
        hidden_multiplier: 1,
        input_mode: inputMode,
        allowance_percent: round(allowancePercent, 6),
      },
      buy_plan: {
        package_label: packagingMode === 1
          ? "balcony-cladding-user-pack"
          : "balcony-cladding-pieces",
        package_size: packagingMode === 1 ? piecesPerPack : 1,
        packages_count: packagingMode === 1 ? packs : purchasePieces,
        unit: packagingMode === 1 ? "уп." : "шт",
      },
    };

    const warnings: string[] = [
      inputMode === 2
        ? "Калькулятор использует готовое число деталей, но не проверяет саму карту раскроя: направление, стыки, рисунок, пригодность обрезков и допустимые длины остаются в проекте."
        : "Расчёт по площади — предварительная оценка одной однородной позиции. Он не моделирует направление монтажа, стыки, длины отдельных участков, рисунок и повторное использование обрезков; для точного заказа используйте карту раскроя.",
      "Запас задаётся пользователем и применяется ровно один раз. Универсального процента для любой лоджии, материала и схемы раскроя нет.",
      "Каркас, крепёж, кляймеры, стартовые и угловые профили, плинтусы, откосы, подоконник, пол и расходники автоматически не добавляются: их определяют по выбранной системе и узлам.",
      "Калькулятор не подбирает утепление и не проверяет теплотехнику, влажностный режим, пожарную безопасность, остекление и допустимость изменения ограждений. Для тёплого контура нужен отдельный проектный расчёт.",
    ];
    if (inputMode === 1 && openingAreaM2 > grossAreaM2) {
      warnings.push(
        `Вычитаемая площадь ${formatRuNumber(openingAreaM2)} м² больше суммы выбранных плоскостей ${formatRuNumber(grossAreaM2)} м². В расчёте вычет ограничен их площадью.`,
      );
    }
    if (basePieces === 0) {
      warnings.push(
        "Получен нулевой результат: задайте ненулевую площадь либо перенесите количество деталей из раскладки.",
      );
    }

    const geometryNote = inputMode === 0
      ? `Принята готовая чистая площадь ${formatRuNumber(selectedAreaM2)} м² до запаса.`
      : inputMode === 1
        ? `Стены: ${formatRuNumber(wallRunM)} × ${formatRuNumber(claddingHeightM)} = ${formatRuNumber(wallAreaM2)} м²; потолок ${formatRuNumber(ceilingAreaM2)} м²; вычет ${formatRuNumber(appliedOpeningAreaM2)} м²; чистая площадь ${formatRuNumber(selectedAreaM2)} м².`
        : `Из карты раскроя принято ${projectPieceCount} ${plural(projectPieceCount, "целая покупная деталь", "целые покупные детали", "целых покупных деталей")} до отдельного закупочного запаса.`;
    const quantityNote = inputMode === 2
      ? `${projectPieceCount} × (1 + ${formatRuNumber(allowancePercent)} / 100) = ${requiredPieces} шт с явным запасом; к покупке ${purchasePieces} шт${packagingMode === 1 ? ` (${packs} ${plural(packs, "упаковка", "упаковки", "упаковок")} по ${piecesPerPack} шт)` : ""}.`
      : `${formatRuNumber(selectedAreaM2)} / (${formatRuNumber(usableWidthMm / 1000)} × ${formatRuNumber(pieceLengthM)}) = ${formatRuNumber(theoreticalPieces)} шт по площади; с явным запасом ${formatRuNumber(allowancePercent)}% требуется ${requiredPieces} шт; к покупке ${purchasePieces} шт${packagingMode === 1 ? ` (${packs} ${plural(packs, "упаковка", "упаковки", "упаковок")} по ${piecesPerPack} шт)` : ""}.`;

    return {
      formulaVersion: WEB_FORMULA_VERSION,
      materials: basePieces > 0 ? [material] : [],
      totals: {
        inputMode,
        areaM2: round(areaM2, 6),
        wallRunM: round(wallRunM, 6),
        claddingHeightM: round(claddingHeightM, 6),
        includeCeiling,
        ceilingLengthM: round(ceilingLengthM, 6),
        ceilingWidthM: round(ceilingWidthM, 6),
        wallAreaM2: round(wallAreaM2, 6),
        ceilingAreaM2: round(ceilingAreaM2, 6),
        grossAreaM2: round(grossAreaM2, 6),
        openingAreaM2: round(openingAreaM2, 6),
        appliedOpeningAreaM2: round(appliedOpeningAreaM2, 6),
        selectedAreaM2: round(selectedAreaM2, 6),
        projectPieceCount,
        usableWidthMm,
        pieceLengthM: round(pieceLengthM, 6),
        pieceCoverageM2: round(pieceCoverageM2, 6),
        theoreticalPieces: round(theoreticalPieces, 6),
        basePieces,
        allowancePercent: round(allowancePercent, 6),
        requiredPieces,
        packagingMode,
        piecesPerPack,
        packs,
        purchasePieces,
        purchasedSurplusPieces,
        minExactNeed: basePieces,
        recExactNeed: basePieces,
        maxExactNeed: basePieces,
        minPurchase: purchasePieces,
        recPurchase: purchasePieces,
        maxPurchase: purchasePieces,
      },
      warnings,
      practicalNotes: [
        geometryNote,
        quantityNote,
        "Для каждой другой ширины, длины, артикула или материала выполните отдельный расчёт: разные позиции нельзя складывать до округления к упаковкам.",
        "Перед оплатой сверьте рабочую ширину, длину, фасовку, артикул, оттенок и партию на этикетке или в документации производителя.",
      ],
      scenarios: { MIN: scenario, REC: scenario, MAX: scenario },
      accuracyMode,
      accuracyExplanation: {
        mode: accuracyMode,
        modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
        combinedMultiplier: 1,
        appliedModifiers: [],
        notes: [
          "Режим точности не меняет закупку: используются только введённая геометрия или готовая раскладка, фактические размеры, один явный запас и заданная фасовка.",
        ],
      },
      summaryCards: [
        {
          icon: "▱",
          label: inputMode === 2 ? "Основа по раскладке" : "Чистая площадь",
          value: inputMode === 2
            ? String(basePieces)
            : formatRuNumber(selectedAreaM2),
          unit: inputMode === 2 ? "шт" : "м²",
          hint: inputMode === 0
            ? "по готовому обмеру"
            : inputMode === 1
              ? "выбранные стены и потолок"
              : "до отдельного запаса",
          tone: "slate",
        },
        {
          icon: "▥",
          label: "С явным запасом",
          value: String(requiredPieces),
          unit: "шт",
          hint: `${formatRuNumber(allowancePercent)}% применено один раз`,
          tone: "amber",
        },
        {
          icon: "▦",
          label: "К покупке",
          value: String(purchasePieces),
          unit: "шт",
          hint: packagingMode === 1
            ? `${packs} ${plural(packs, "упаковка", "упаковки", "упаковок")}`
            : "поштучная потребность",
          tone: "emerald",
        },
      ],
      hidePrimaryMaterialBadge: true,
    };
  },
  formulaDescription: `
**По чистой площади или простому обмеру:**
- Площадь детали = рабочая ширина × покупная длина
- Теоретическое количество = чистая площадь / площадь одной детали
- С явным запасом = ⌈теоретическое количество × (1 + запас / 100)⌉

**По готовой раскладке:**
- Введите число целых покупных деталей из карты раскроя
- Калькулятор добавит только выбранный закупочный запас

**Упаковка:**
- К покупке = ⌈количество с запасом / деталей в упаковке⌉ целых упаковок

Скрытых запасов и множителей MIN/REC/MAX нет. Утепление, каркас, крепёж, доборные элементы и другие материалы автоматически не назначаются.
  `,
  howToUse: [
    "Выберите чистую площадь, простой обмер плоскостей или готовое число деталей из раскладки",
    "Для расчёта по площади введите рабочую ширину и покупную длину конкретного изделия",
    "Задайте осознанный запас один раз по своей раскладке и условиям закупки",
    "Если материал продаётся пачками, перепишите фактическое число деталей из упаковки",
    "Перед заказом разделите разные артикулы и проверьте раскрой, узлы, фасовку и партию",
  ],
  expertTips: [
    {
      title: "Считайте по рабочей ширине",
      content:
        "Шип, паз или замок могут уменьшать полезную ширину облицовки. Для расчёта нужна именно закрываемая ширина конкретного профиля, а не внешний габарит по рулетке.",
      author: "Мастер-отделочник",
    },
    {
      title: "Площадь не заменяет раскрой",
      content:
        "На лоджии много коротких участков, откосов и примыканий. Для дорогой вагонки или панелей сначала определите направление, длины деталей и пригодность обрезков, затем переносите число целых покупных ламелей.",
      author: "Прораб",
    },
  ],
  faq: [
    {
      question: "Сколько вагонки нужно на балкон?",
      answer:
        "Нужны чистая площадь облицовки, рабочая ширина и длина выбранной вагонки. Калькулятор делит площадь на полезную площадь одной ламели, применяет ваш явный запас и округляет результат до фактической упаковки.",
    },
    {
      question: "Почему калькулятор не считает полный периметр балкона автоматически?",
      answer:
        "Большую часть контура могут занимать остекление, дверь, парапет, откосы и участки с другой отделкой. Полный прямоугольный периметр часто завышает облицовку, поэтому простой режим просит суммарную длину только выбранных стен и отдельный вычет.",
    },
    {
      question: "Какой запас брать на панели или вагонку?",
      answer:
        "Единого процента нет. Запас зависит от направления, длины участков, рисунка, качества материала, числа углов, повторного использования обрезков и возможности добрать ту же партию. Выберите значение по раскладке; калькулятор не добавит второй скрытый запас.",
    },
    {
      question: "Почему здесь нет утеплителя, обрешётки и крепежа?",
      answer:
        "Их нельзя надёжно определить только по площади облицовки. Тип и шаг каркаса, крепёж, доборы и состав утепления зависят от материала, основания, направления монтажа, нагрузок, влажностного режима, остекления и проектных узлов.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор обшивки балкона</h2>
<p>Калькулятор переводит одну однородную позицию вагонки или панелей в понятную закупку: чистое количество деталей, количество с выбранным запасом и целые упаковки. Он не выдаёт условный «комплект балкона» из утеплителя, брусков и крепежа, потому что эти позиции требуют других исходных данных и отдельного проектного решения.</p>

<h2>Три способа задать объём</h2>
<ul>
  <li><strong>Чистая площадь</strong> — сумма реально облицовываемых стен, парапета, откосов и потолка уже без проёмов.</li>
  <li><strong>Простой обмер</strong> — суммарная длина выбранных стен × высота плюс прямоугольный потолок минус окна, дверь и другие зоны.</li>
  <li><strong>Готовое число деталей</strong> — наиболее контролируемый вариант для сложной лоджии: количество целых покупных ламелей переносится из карты раскроя.</li>
</ul>

<h2>Формула количества вагонки и панелей</h2>
<p><strong>S<sub>детали</sub> = B<sub>рабочая</sub> × L</strong>. Затем <strong>N = S<sub>чистая</sub> / S<sub>детали</sub></strong>. Запас применяется один раз к неокруглённой потребности, после чего результат округляется вверх. Если материал продаётся пачками, число деталей с запасом делится на фактическую фасовку и также округляется вверх.</p>
<p>Для профиля с соединением нужна именно рабочая, то есть закрываемая ширина. Практическое объяснение этой разницы и пример формулы опубликованы в материале производителя и поставщика <a href="https://spb.lesobirzha.ru/articles/skolko-vagonki-v-m2-normy-dlya-profiley-90-140-mm-skrytyy-krepyezh-i-shag-obreshyetki.html" target="_blank" rel="noopener noreferrer">«ЛесоБиржа» о расчёте вагонки</a>. Размеры и фасовку всё равно нужно сверять по выбранному артикулу и партии.</p>

<h2>Почему расчёт по площади остаётся предварительным</h2>
<p>Одинаковые 12 м² могут дать разное число покупных деталей. Влияют направление ламелей, высота и длина отдельных участков, торцевые стыки, рисунок, откосы, наружные углы, заводские дефекты и возможность использовать остаток на другой плоскости. Поэтому для дорогого материала или сложной геометрии сначала составляют раскладку, а затем вводят готовое число целых покупных деталей.</p>

<h2>Что считать отдельно</h2>
<p>Каркас, крепёж, кляймеры, профили, доборы, плинтусы, откосы, подоконник, напольное покрытие и лакокрасочную систему нельзя вывести из одной площади облицовки. Для другой позиции панелей используйте <a href="/kalkulyatory/steny/paneli-dlya-sten/">калькулятор панелей для стен</a>, для длинномерных деталей — <a href="/instrumenty/lineynyy-raskroy/">калькулятор линейного раскроя</a>.</p>

<h2>Граница теплотехнического расчёта</h2>
<p>Обшивка сама по себе не определяет, станет ли балкон тёплым и безопасным по влаге. Действующий <a href="https://protect.gost.ru/sp/details/5081dae9-9ee9-455f-80e8-d093d495361c" target="_blank" rel="noopener noreferrer">СП 50.13330.2024 «Тепловая защита зданий»</a> рассматривает тепловую защиту в составе ограждающей конструкции и температурно-влажностного режима; он заменил СП 50.13330.2012. Подбор материала, толщины, пароизоляции, узлов примыкания, пожарных характеристик и допустимости изменения фасада остаётся проектной задачей. Для предварительной закупки уже принятого утеплителя используйте <a href="/kalkulyatory/steny/uteplenie/">отдельный калькулятор утеплителя</a>.</p>
    `,
    faq: [
      {
        question: "Сколько панелей нужно на 12 м² балкона?",
        answer:
          "<p>При рабочей ширине 96 мм и длине 3 м одна деталь закрывает 0,288 м². Чистая потребность равна 12 / 0,288 = 41,667, то есть 42 целые детали. При явном запасе 10% нужно 46 деталей. Если в пачке 6 штук, к покупке получится 8 пачек, или 48 деталей.</p>",
      },
      {
        question: "Можно ли складывать стены и потолок в один расчёт?",
        answer:
          "<p>Да, только если это один и тот же артикул с одинаковой рабочей шириной, длиной и фасовкой. Если потолок и стены выполнены разными материалами или длинами, посчитайте их отдельными позициями, иначе округление до упаковок будет неверным.</p>",
      },
      {
        question: "Нужно ли вычитать остекление и балконную дверь?",
        answer:
          "<p>Да, если эти зоны не обшиваются выбранным материалом. В режиме простого обмера внесите их суммарную площадь в вычет. Площади откосов и коробов, которые облицовываются, добавьте к чистой площади отдельно.</p>",
      },
      {
        question: "Считает ли калькулятор утепление лоджии?",
        answer:
          "<p>Нет. Он считает только закупку одной позиции облицовки. Утепление зависит от существующей плиты и стен, остекления, климата, температурно-влажностного режима, пожарных требований и узлов. После принятия конструкции объём выбранного утеплителя можно посчитать отдельным калькулятором.</p>",
      },
    ],
  },
};
