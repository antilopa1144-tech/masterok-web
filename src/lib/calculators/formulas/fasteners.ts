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
import fastenersSpec from "../../../../configs/calculators/fasteners-canonical.v1.json";

const WEB_FORMULA_VERSION = "fasteners-web-project-v1";

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

const PURPOSE_NAMES: Record<number, string> = {
  0: "Крепёж выбранной системы",
  1: "Саморезы по проектной схеме",
  2: "Дюбели или анкеры по проекту",
  3: "Кляймеры или клипсы по проекту",
};

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

const createMaterial = (
  name: string,
  baseCount: number,
  purchase: CountPurchase,
  itemsPerPack: number,
  category = "Основной крепёж",
): MaterialResult => ({
  name,
  quantity: baseCount,
  unit: "шт",
  withReserve: purchase.requiredCount,
  purchaseQty: purchase.purchaseCount,
  category,
  packageInfo: {
    count: purchase.packs,
    size: itemsPerPack,
    packageUnit: itemsPerPack === 1 ? "штук" : "упаковок",
  },
});

export const fastenersDef: CalculatorDefinition = {
  id: "fasteners",
  slug: "krepezh",
  title: "Калькулятор крепежа",
  h1: "Калькулятор крепежа — точки, шаг и упаковки",
  description:
    "Рассчитайте количество одной однородной позиции крепежа по готовой ведомости, подтверждённой норме на площадь или явному шагу повторяющихся линий.",
  metaTitle: withSiteMetaTitle(
    "Калькулятор крепежа: точки, шаг и упаковки",
  ),
  metaDescription:
    "Бесплатный калькулятор крепежа: рассчитайте готовое число точек по проектной норме или шагу линий, явный запас и закупку по фактической упаковке.",
  category: "interior",
  categorySlug: "otdelka",
  tags: [
    "крепёж",
    "точки крепления",
    "шаг крепления",
    "саморезы",
    "дюбели",
    "анкеры",
    "кляймеры",
  ],
  popularity: 72,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Как задано количество",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Готовое число по проекту" },
        { value: 1, label: "Площадь × подтверждённая норма" },
        { value: 2, label: "Повторяющиеся линии и шаг" },
      ],
      hint:
        "Выберите основание расчёта. Калькулятор не назначает норму и тип крепежа автоматически.",
      fullWidth: true,
    },
    {
      key: "fastenerPurpose",
      label: "Название позиции",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Крепёж выбранной системы" },
        { value: 1, label: "Саморезы" },
        { value: 2, label: "Дюбели или анкеры" },
        { value: 3, label: "Кляймеры или клипсы" },
      ],
      hint:
        "Название меняет только подпись результата. Размер, материал, покрытие и несущую способность выбирают по проекту и документации системы.",
    },
    {
      key: "projectFastenerCount",
      label: "Крепёж по проекту",
      type: "number",
      unit: "шт",
      min: 0,
      max: 1000000,
      step: 1,
      integerOnly: true,
      defaultValue: 240,
      hint: "Готовое количество одной однородной позиции до запаса.",
      hideIf: { key: "inputMode", op: "ne", value: 0 },
    },
    {
      key: "fasteningAreaM2",
      label: "Площадь крепления",
      type: "number",
      unit: "м²",
      min: 0.01,
      max: 100000,
      step: 0.1,
      defaultValue: 20,
      hint: "Чистая проектная площадь для выбранной однородной позиции.",
      hideIf: { key: "inputMode", op: "ne", value: 1 },
    },
    {
      key: "projectFastenersPerM2",
      label: "Подтверждённая норма",
      type: "number",
      unit: "шт/м²",
      min: 0.01,
      max: 1000,
      step: 0.1,
      defaultValue: 12,
      hint:
        "Введите норму из проекта, альбома системы или паспорта производителя. Универсальной нормы для всех оснований и нагрузок нет.",
      hideIf: { key: "inputMode", op: "ne", value: 1 },
    },
    {
      key: "fasteningLineCount",
      label: "Количество одинаковых линий",
      type: "number",
      unit: "шт",
      min: 1,
      max: 100000,
      step: 1,
      integerOnly: true,
      defaultValue: 10,
      hint: "Например, одинаковые стойки, лаги, рейки или профили.",
      hideIf: { key: "inputMode", op: "ne", value: 2 },
    },
    {
      key: "fasteningLineLengthM",
      label: "Длина одной линии",
      type: "number",
      unit: "м",
      min: 0.01,
      max: 10000,
      step: 0.01,
      defaultValue: 2.5,
      hideIf: { key: "inputMode", op: "ne", value: 2 },
    },
    {
      key: "fastenerStepMm",
      label: "Проектный шаг крепления",
      type: "number",
      unit: "мм",
      min: 1,
      max: 10000,
      step: 1,
      defaultValue: 250,
      hint:
        "Шаг должен быть задан проектом или документацией конкретной системы; калькулятор только раскладывает точки.",
      hideIf: { key: "inputMode", op: "ne", value: 2 },
    },
    {
      key: "includeBothLineEnds",
      label: "Крепёж на обоих концах линии",
      type: "radio",
      defaultValue: 1,
      options: [
        { value: 1, label: "Да, считать обе крайние точки" },
        { value: 0, label: "Нет, считать только интервалы" },
      ],
      hint:
        "При включении к числу интервалов добавляется вторая крайняя точка. Применяйте только если так устроена схема.",
      hideIf: { key: "inputMode", op: "ne", value: 2 },
      fullWidth: true,
    },
    {
      key: "fastenerReservePercent",
      label: "Явный запас крепежа",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hint:
        "Запас применяется один раз. Выберите его по условиям поставки, риску потерь и правилам объекта.",
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
      defaultValue: 1,
      hint:
        "Введите фактическое количество штук в коробке, пачке или другой товарной единице. Для поштучной покупки оставьте 1.",
    },
    {
      key: "secondFastenerEnabled",
      label: "Вторая однородная позиция",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Не добавлять" },
        { value: 1, label: "Добавить по готовому количеству" },
      ],
      hint:
        "Например, отдельный артикул для крайних зон. Не смешивайте разные типоразмеры в одной позиции.",
      fullWidth: true,
    },
    {
      key: "projectSecondFastenerCount",
      label: "Дополнительный крепёж по проекту",
      type: "number",
      unit: "шт",
      min: 0,
      max: 1000000,
      step: 1,
      integerOnly: true,
      defaultValue: 48,
      hint: "Готовое количество второй однородной позиции до запаса.",
      hideIf: { key: "secondFastenerEnabled", op: "eq", value: 0 },
    },
    {
      key: "secondFastenerReservePercent",
      label: "Запас дополнительной позиции",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hideIf: { key: "secondFastenerEnabled", op: "eq", value: 0 },
    },
    {
      key: "secondFastenersPerPack",
      label: "Дополнительного крепежа в упаковке",
      type: "number",
      unit: "шт",
      min: 1,
      max: 100000,
      step: 1,
      integerOnly: true,
      defaultValue: 1,
      hideIf: { key: "secondFastenerEnabled", op: "eq", value: 0 },
    },
  ],
  calculate(inputs) {
    const inputMode = clampInteger(readNumber(inputs.inputMode, 0), 0, 2);
    const fastenerPurpose = clampInteger(
      readNumber(inputs.fastenerPurpose, 0),
      0,
      3,
    );
    const projectFastenerCount = clampInteger(
      readNumber(inputs.projectFastenerCount, 240),
      0,
      1000000,
    );
    const fasteningAreaM2 = clamp(
      readNumber(inputs.fasteningAreaM2, 20),
      0.01,
      100000,
    );
    const projectFastenersPerM2 = clamp(
      readNumber(inputs.projectFastenersPerM2, 12),
      0.01,
      1000,
    );
    const fasteningLineCount = clampInteger(
      readNumber(inputs.fasteningLineCount, 10),
      1,
      100000,
    );
    const fasteningLineLengthM = clamp(
      readNumber(inputs.fasteningLineLengthM, 2.5),
      0.01,
      10000,
    );
    const fastenerStepMm = clampInteger(
      readNumber(inputs.fastenerStepMm, 250),
      1,
      10000,
    );
    const includeBothLineEnds =
      clampInteger(readNumber(inputs.includeBothLineEnds, 1), 0, 1) === 1;
    const fastenerReservePercent = clamp(
      readNumber(inputs.fastenerReservePercent, 0),
      0,
      30,
    );
    const fastenersPerPack = clampInteger(
      readNumber(inputs.fastenersPerPack, 1),
      1,
      100000,
    );
    const secondFastenerEnabled =
      clampInteger(readNumber(inputs.secondFastenerEnabled, 0), 0, 1) === 1;
    const projectSecondFastenerCount = clampInteger(
      readNumber(inputs.projectSecondFastenerCount, 48),
      0,
      1000000,
    );
    const secondFastenerReservePercent = clamp(
      readNumber(inputs.secondFastenerReservePercent, 0),
      0,
      30,
    );
    const secondFastenersPerPack = clampInteger(
      readNumber(inputs.secondFastenersPerPack, 1),
      1,
      100000,
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

    let rawFastenerCount = projectFastenerCount;
    let pointsPerLine = 0;
    let basisNote = `Принято готовое проектное количество: ${projectFastenerCount} шт.`;

    if (inputMode === 1) {
      rawFastenerCount = round(fasteningAreaM2 * projectFastenersPerM2, 6);
      basisNote = `Площадь ${formatRuNumber(fasteningAreaM2)} м² умножена на введённую норму ${formatRuNumber(projectFastenersPerM2)} шт/м².`;
    } else if (inputMode === 2) {
      const intervalsPerLine = ceilPositive(
        (fasteningLineLengthM * 1000) / fastenerStepMm,
      );
      pointsPerLine = intervalsPerLine + (includeBothLineEnds ? 1 : 0);
      rawFastenerCount = fasteningLineCount * pointsPerLine;
      basisNote = `${fasteningLineCount} ${plural(fasteningLineCount, "линия", "линии", "линий")} по ${formatRuNumber(fasteningLineLengthM)} м: ${pointsPerLine} ${plural(pointsPerLine, "точка", "точки", "точек")} на линию при шаге не более ${fastenerStepMm} мм${includeBothLineEnds ? " и крепеже на обоих концах" : " без автоматической второй крайней точки"}.`;
    }

    const baseFastenerCount = ceilPositive(rawFastenerCount);
    const primary = calculateCountPurchase(
      baseFastenerCount,
      fastenerReservePercent,
      fastenersPerPack,
    );
    const materials: MaterialResult[] = [
      createMaterial(
        PURPOSE_NAMES[fastenerPurpose] ?? PURPOSE_NAMES[0],
        baseFastenerCount,
        primary,
        fastenersPerPack,
      ),
    ];

    const second = calculateCountPurchase(
      projectSecondFastenerCount,
      secondFastenerReservePercent,
      secondFastenersPerPack,
    );
    if (secondFastenerEnabled && projectSecondFastenerCount > 0) {
      materials.push(
        createMaterial(
          "Дополнительный крепёж по проекту",
          projectSecondFastenerCount,
          second,
          secondFastenersPerPack,
          "Дополнительная позиция",
        ),
      );
    }

    const scenario: CalculatorScenario = {
      exact_need: baseFastenerCount,
      purchase_quantity: primary.purchaseCount,
      leftover: Math.max(0, primary.purchaseCount - primary.requiredCount),
      assumptions: [
        "Количество, норма или шаг перенесены из проекта либо документации выбранной системы.",
        `Явный запас ${formatRuNumber(fastenerReservePercent)}% применён один раз.`,
        `Фасовка основной позиции — ${fastenersPerPack} шт.`,
      ],
      key_factors: {
        hidden_multiplier: 1,
        explicit_reserve_factor: round(1 + fastenerReservePercent / 100, 6),
      },
      buy_plan: {
        package_label: "упаковка крепежа",
        package_size: fastenersPerPack,
        packages_count: primary.packs,
        unit: "шт",
      },
    };

    const warnings = [
      "Калькулятор не выбирает тип, размер, материал и покрытие крепежа. Их задают проект, основание, нагрузка, толщина соединяемых деталей и документация конкретной системы.",
      "Норма на м² и шаг крепления не универсальны: различаются поле, края, углы, стыки, опоры и зоны повышенной нагрузки.",
      "Для анкеров и дюбелей отдельно проверяют основание, расчётную нагрузку, глубину заделки, краевые расстояния, межосевые расстояния и способ монтажа.",
      "Для наружных, влажных, химически активных и пожароопасных условий проверьте коррозионную стойкость, совместимость материалов и требования пожарной безопасности.",
      "Расчёт ведётся в штуках и целых упаковках. Масса не вычисляется: одинаковая масса упаковки может содержать разное число изделий разных размеров.",
    ];

    const practicalNotes = [
      basisNote,
      `Основная позиция: ${baseFastenerCount} шт. по схеме, ${primary.requiredCount} шт. с запасом, к покупке ${primary.purchaseCount} шт. — ${primary.packs} ${plural(primary.packs, "упаковка", "упаковки", "упаковок")} по ${fastenersPerPack} шт.`,
      "Если в проекте есть разные типоразмеры, основания или зоны крепления, считайте каждую однородную позицию отдельно.",
      "Перед закупкой сверьте артикул, партию, комплектность, инструмент и допустимость совместного применения всех элементов системы.",
    ];
    if (secondFastenerEnabled && projectSecondFastenerCount > 0) {
      practicalNotes.push(
        `Дополнительная позиция: ${projectSecondFastenerCount} шт. по проекту, ${second.requiredCount} шт. с запасом, к покупке ${second.purchaseCount} шт.`,
      );
    }

    return {
      canonicalSpecId: fastenersSpec.calculator_id,
      formulaVersion: WEB_FORMULA_VERSION,
      materials,
      totals: {
        inputMode,
        fastenerPurpose,
        projectFastenerCount,
        fasteningAreaM2: round(fasteningAreaM2, 6),
        projectFastenersPerM2: round(projectFastenersPerM2, 6),
        fasteningLineCount,
        fasteningLineLengthM: round(fasteningLineLengthM, 6),
        fastenerStepMm,
        includeBothLineEnds: includeBothLineEnds ? 1 : 0,
        pointsPerLine,
        rawFastenerCount: round(rawFastenerCount, 6),
        baseFastenerCount,
        fastenerReservePercent: round(fastenerReservePercent, 6),
        requiredFastenerCount: primary.requiredCount,
        fastenersPerPack,
        fastenerPacks: primary.packs,
        purchaseFastenerCount: primary.purchaseCount,
        purchasedSurplusFastenerCount: Math.max(
          0,
          primary.purchaseCount - baseFastenerCount,
        ),
        secondFastenerEnabled: secondFastenerEnabled ? 1 : 0,
        projectSecondFastenerCount,
        secondFastenerReservePercent: round(
          secondFastenerReservePercent,
          6,
        ),
        secondFastenersPerPack,
        requiredSecondFastenerCount: second.requiredCount,
        secondFastenerPacks: second.packs,
        purchaseSecondFastenerCount: second.purchaseCount,
        minExactNeed: baseFastenerCount,
        recExactNeed: baseFastenerCount,
        maxExactNeed: baseFastenerCount,
        minPurchase: primary.purchaseCount,
        recPurchase: primary.purchaseCount,
        maxPurchase: primary.purchaseCount,
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
          "Режим точности не меняет число крепёжных точек: учитываются только введённая схема, явный запас и фактическая фасовка.",
        ],
      },
      summaryCards: [
        {
          icon: "⌖",
          label: "По схеме",
          value: String(baseFastenerCount),
          unit: "шт",
          hint:
            inputMode === 0
              ? "готовое количество"
              : inputMode === 1
                ? "площадь × норма"
                : `${pointsPerLine} на линию`,
          tone: "slate",
        },
        {
          icon: "+",
          label: "С явным запасом",
          value: String(primary.requiredCount),
          unit: "шт",
          hint: `${formatRuNumber(fastenerReservePercent)}% один раз`,
          tone: "amber",
        },
        {
          icon: "▤",
          label: "К покупке",
          value: String(primary.purchaseCount),
          unit: "шт",
          hint:
            fastenersPerPack === 1
              ? "поштучно"
              : `${primary.packs} ${plural(primary.packs, "упаковка", "упаковки", "упаковок")} по ${fastenersPerPack}`,
          tone: "emerald",
        },
      ],
    };
  },
  formulaVersion: WEB_FORMULA_VERSION,
  formulaDescription: `
**Готовое количество:** базовое число точек переносится из проекта без дополнительных скрытых норм.

**По площади:** базовое число = ⌈площадь × подтверждённая норма, шт/м²⌉.

**По линиям:** интервалы на линии = ⌈длина линии в мм / проектный шаг⌉. Если схема включает крепёж на обоих концах, к числу интервалов добавляется одна крайняя точка. Итог = точки на линии × число одинаковых линий.

**Закупка:** требуемое число = ⌈базовое число × (1 + явный запас / 100)⌉; упаковки = ⌈требуемое число / фактическую фасовку⌉.

Тип, размер, покрытие, несущая способность и сама норма крепежа формулой не назначаются.
  `,
  howToUse: [
    "Выберите основание расчёта: готовое число, площадь с подтверждённой нормой или повторяющиеся линии",
    "Укажите назначение позиции только для понятной подписи результата",
    "Перенесите количество, норму или шаг из проекта, альбома системы либо документации производителя",
    "Введите явный запас и фактическое число изделий в упаковке",
    "При необходимости добавьте вторую однородную проектную позицию",
    "Нажмите «Рассчитать» и сверьте количество по схеме, с запасом и к покупке",
  ],
  expertTips: [
    {
      title: "Разделяйте зоны и типоразмеры",
      content:
        "Поле, края, углы, стыки и разные основания могут требовать разного шага и артикула. Не складывайте их в одну усреднённую норму — считайте однородные позиции отдельно.",
      author: "Инженер по комплектованию",
    },
    {
      title: "Фасовку берите с этикетки",
      content:
        "Количество изделий в килограмме зависит от геометрии и материала, поэтому закупку надёжнее округлять по фактическому числу штук в конкретной коробке или пачке.",
      author: "Прораб",
    },
  ],
  faq: [
    {
      question: "Почему калькулятор не выбирает размер самореза или анкера?",
      answer:
        "Размер зависит от основания, толщины соединяемых деталей, нагрузки, краевых расстояний, среды эксплуатации и требований конкретной системы. Без этих данных автоматический выбор создавал бы опасную ложную точность.",
    },
    {
      question: "Откуда брать норму крепежа на квадратный метр?",
      answer:
        "Из проекта, альбома технических решений, паспорта конкретной системы или инструкции производителя. Норма должна относиться именно к вашему основанию, зоне, нагрузке и схеме опор.",
    },
    {
      question: "Когда добавлять обе крайние точки линии?",
      answer:
        "Только когда проектная схема действительно требует крепёж в начале и конце каждой линии. Иначе оставьте расчёт по интервалам без автоматической второй крайней точки.",
    },
    {
      question: "Почему результат только в штуках, а не в килограммах?",
      answer:
        "Масса одного изделия меняется с размером, материалом и конструкцией. Введите фактическое число штук в упаковке — калькулятор округлит закупку по реальному товару без условного пересчёта массы.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор крепежа</h2>
<p>Калькулятор переводит уже принятую монтажную схему в количество штук и целых упаковок. Он поддерживает три основания: готовое число по ведомости, площадь с введённой проектной нормой и одинаковые линии с явным шагом. Запас вводится отдельно и применяется один раз.</p>

<h2>Почему здесь нет универсальной нормы и автоматического размера</h2>
<p>Слово «крепёж» объединяет изделия для разных оснований, нагрузок и систем. Даже у одной облицовки шаг в поле, по краям и на стыках может отличаться. Размер, тип головки, материал, покрытие, глубина заделки и несущая способность зависят от проектного узла, поэтому калькулятор не подменяет технический подбор.</p>
<p><a href="https://protect.gost.ru/gost/details/c9666595-feb4-4a1d-be7e-66b0c162a28e">ГОСТ Р 59571-2021</a> задаёт требования к самонарезающим винтам для крепления гипсовых плит к металлическому и деревянному каркасу, но не превращает все листовые системы в одну универсальную норму.</p>

<h2>Документация конкретной системы важнее усреднённой таблицы</h2>
<ul>
  <li><a href="https://www.knauf.ru/catalog/krepyezhnye-izdeliya/knauf-shurup-dlya-soedineniya-gkl/">КНАУФ</a> привязывает применение шурупов к конструкции и конкретной комплектной системе.</li>
  <li>В <a href="https://www.egger.com/get_download/30918a3f-cceb-482c-8884-6a530f4c0eff/TL_EGGER_TLBP104_OSB_t_g_basic_installation_guideline_en.pdf">руководстве EGGER по монтажу OSB</a> различаются крепление по краям и на промежуточных опорах.</li>
  <li>В <a href="https://www.grandline.ru/uploads/files/instrukcii/krovelnye-materialy/krovelnyi-profnastil/instrukciya-po-montazhu-krovelnogo-profnastila.pdf">инструкции Grand Line по кровельному профнастилу</a> схема крепления зависит от зоны листа и элементов кровли.</li>
</ul>
<p>Эти примеры показывают, почему норму следует переносить из документа именно выбранной системы, а разные зоны и артикулы считать отдельными позициями.</p>

<h2>Формулы расчёта</h2>
<p><strong>По площади:</strong> N = ⌈S × q⌉, где S — площадь, q — подтверждённая норма в штуках на квадратный метр.</p>
<p><strong>По линиям:</strong> число интервалов = ⌈L / h⌉. Вторая крайняя точка добавляется только по явному выбору пользователя.</p>
<p><strong>К покупке:</strong> сначала один раз применяется выбранный запас, затем требуемое число округляется вверх до фактической фасовки.</p>

<h2>Граница применимости</h2>
<p>Результат помогает посчитать закупку, но не подтверждает несущую способность узла. Для анкеров, фасадов, кровель, потолков и других ответственных конструкций нужны проектные нагрузки, данные основания, краевые расстояния, коррозионная и пожарная совместимость.</p>
`,
    faq: [
      {
        question: "Можно ли посчитать несколько видов крепежа одной нормой?",
        answer:
          "<p>Нет. Разные артикулы, размеры, основания и зоны следует считать отдельными однородными позициями. В калькуляторе можно добавить одну дополнительную позицию по готовому проектному количеству, а более сложную ведомость лучше разбить на отдельные расчёты.</p>",
      },
      {
        question: "Как калькулятор округляет количество по шагу?",
        answer:
          "<p>Длина линии делится на шаг, а число интервалов округляется вверх, чтобы фактический шаг не оказался больше заданного. Если включены обе крайние точки, к интервалам добавляется ещё одна точка.</p>",
      },
      {
        question: "Что входит в явный запас?",
        answer:
          "<p>Запас задаёт пользователь с учётом потерь, брака и условий поставки. Калькулятор применяет этот процент один раз и не добавляет поверх него скрытые коэффициенты MIN, REC, MAX или режима точности.</p>",
      },
    ],
  },
};
