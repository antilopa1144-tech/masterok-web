import type {
  CalculatorDefinition,
  CalculatorScenario,
} from "../types";
import { withSiteMetaTitle } from "../meta";
import {
  ACCURACY_MODE_LABELS,
  DEFAULT_ACCURACY_MODE,
  type AccuracyMode,
} from "../../../../engine/accuracy";
import wallpaperSpec from "../../../../configs/calculators/wallpaper-canonical.v1.json";

const WEB_FORMULA_VERSION = "wallpaper-web-roll-layout-v1";

const RESERVE_OPTIONS = [0, 3, 5, 7, 10, 15, 20, 25, 30].map(
  (value) => ({
    value,
    label: value === 0 ? "0% — без процентного запаса" : `${value}%`,
  }),
);

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const readNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const round = (value: number, digits = 6): number => {
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

export const wallpaperDef: CalculatorDefinition = {
  id: "wallpaper",
  slug: "oboi",
  formulaVersion: WEB_FORMULA_VERSION,
  title: "Калькулятор обоев",
  h1: "Калькулятор обоев — расчёт полотен и рулонов",
  description:
    "Рассчитайте число целых полотен и рулонов по периметру, параметрам выбранного артикула и способу совмещения рисунка или перенесите готовый итог из карты раскроя.",
  metaTitle: withSiteMetaTitle(
    "Калькулятор обоев: расчёт полотен и рулонов",
  ),
  metaDescription:
    "Бесплатный калькулятор обоев: рассчитайте число полотен, выход из рулона и итог к покупке по периметру, высоте, размеру рулона, раппорту и явному запасу.",
  category: "interior",
  categorySlug: "otdelka",
  tags: [
    "калькулятор обоев",
    "сколько рулонов обоев",
    "расчёт обоев по периметру",
    "раппорт обоев",
    "длина полотна",
    "раскладка обоев",
  ],
  popularity: 78,
  complexity: 1,
  fields: [
    {
      key: "inputMode",
      label: "Исходные данные",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Периметр — быстрый расчёт" },
        { value: 1, label: "Площадь стен — предварительно" },
        { value: 2, label: "Готовый итог раскладки" },
      ],
      hint:
        "Для стен с проёмами, простенками и смещённым рисунком точнее сначала построить карту раскроя.",
      fullWidth: true,
    },
    {
      key: "perimeter",
      label: "Периметр оклеиваемых стен",
      type: "number",
      unit: "м",
      min: 1,
      max: 100000,
      step: 0.01,
      defaultValue: 14,
      hint:
        "Сумма длин стен. Проёмы автоматически не вычитаются: пригодность подрезок зависит от раскладки.",
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь стен до вычета проёмов",
      type: "number",
      unit: "м²",
      min: 0.01,
      max: 100000,
      step: 0.1,
      defaultValue: 40,
      hint:
        "Предварительный режим: площадь преобразуется в эквивалентную длину стены по высоте помещения.",
      group: "byArea",
    },
    {
      key: "projectRolls",
      label: "Рулонов по карте раскроя",
      type: "number",
      unit: "шт",
      min: 0,
      max: 100000,
      step: 1,
      integerOnly: true,
      defaultValue: 1,
      hint:
        "Введите итог раскроя без закрытого резерва. Резерв задаётся отдельно ниже и применяется один раз.",
      hideIf: { key: "inputMode", op: "ne", value: 2 },
    },
    {
      key: "height",
      label: "Высота полотна по стене",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 100,
      step: 0.01,
      defaultValue: 2.7,
      hint: "Высота от линии начала оклейки до линии подрезки.",
      hideIf: { key: "inputMode", op: "eq", value: 2 },
    },
    {
      key: "rollLength",
      label: "Длина выбранного рулона",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 1000,
      step: 0.01,
      defaultValue: 10.05,
      hint: "Перенесите размер с этикетки конкретного артикула.",
      hideIf: { key: "inputMode", op: "eq", value: 2 },
    },
    {
      key: "rollWidth",
      label: "Ширина выбранного рулона",
      type: "number",
      unit: "мм",
      min: 100,
      max: 10000,
      step: 1,
      defaultValue: 530,
      hint:
        "Можно передать 530 мм или 0,53 м по ссылке — расчёт нормализует обе записи.",
      hideIf: { key: "inputMode", op: "eq", value: 2 },
    },
    {
      key: "cutLengthMode",
      label: "Как определить длину полотна",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Посчитать по высоте и раппорту" },
        { value: 1, label: "Ввести готовую длину" },
      ],
      hint:
        "Готовая длина подходит для пробного раскроя или карты, где совмещение уже учтено.",
      hideIf: { key: "inputMode", op: "eq", value: 2 },
      fullWidth: true,
    },
    {
      key: "rapport",
      label: "Вертикальный раппорт",
      type: "number",
      unit: "см",
      min: 0,
      max: 1000,
      step: 0.1,
      defaultValue: 0,
      hint:
        "Шаг повторения рисунка. Для свободной стыковки укажите 0.",
      hideIf: [
        { key: "inputMode", op: "eq", value: 2 },
        { key: "cutLengthMode", op: "ne", value: 0 },
      ],
    },
    {
      key: "patternShift",
      label: "Дополнительный припуск совмещения",
      type: "number",
      unit: "см",
      min: 0,
      max: 1000,
      step: 0.1,
      defaultValue: 0,
      hint:
        "Только явно проверенная добавка к каждому полотну. Второе число маркировки 64/32 нельзя автоматически считать такой добавкой.",
      hideIf: [
        { key: "inputMode", op: "eq", value: 2 },
        { key: "cutLengthMode", op: "ne", value: 0 },
        { key: "rapport", op: "eq", value: 0 },
      ],
    },
    {
      key: "trimAllowanceCm",
      label: "Общий припуск на подрезку",
      type: "number",
      unit: "см",
      min: 0,
      max: 1000,
      step: 0.1,
      defaultValue: 10,
      hint: "Суммарная добавка сверху и снизу одного полотна.",
      hideIf: [
        { key: "inputMode", op: "eq", value: 2 },
        { key: "cutLengthMode", op: "ne", value: 0 },
      ],
    },
    {
      key: "manualStripLengthM",
      label: "Готовая длина одного полотна",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 1000,
      step: 0.01,
      defaultValue: 2.8,
      hint:
        "Длина после всех припусков и совмещения, полученная по пробному раскрою или карте.",
      hideIf: [
        { key: "inputMode", op: "eq", value: 2 },
        { key: "cutLengthMode", op: "ne", value: 1 },
      ],
    },
    {
      key: "reservePercent",
      label: "Явный процентный запас",
      type: "select",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hint:
        "Не обязателен. Применяется один раз к чистому числу рулонов до округления.",
    },
    {
      key: "reserveRolls",
      label: "Закрытый запас рулонов",
      type: "number",
      unit: "шт",
      min: 0,
      max: 100,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
      hint:
        "Дополнительные целые рулоны для ремонта или сложных участков. Скрытого запаса нет.",
    },
  ],
  calculate(inputs) {
    const inputMode = Math.round(clamp(readNumber(inputs.inputMode, 0), 0, 2));
    const perimeter = clamp(readNumber(inputs.perimeter, 14), 1, 100000);
    const area = clamp(readNumber(inputs.area, 40), 0.01, 100000);
    const height = clamp(readNumber(inputs.height, 2.7), 0.1, 100);
    const rollLength = clamp(
      readNumber(inputs.rollLength, 10.05),
      0.1,
      1000,
    );
    const rawRollWidth = readNumber(inputs.rollWidth, 530);
    const rollWidthM = clamp(
      rawRollWidth > 10 ? rawRollWidth / 1000 : rawRollWidth,
      0.1,
      10,
    );
    const cutLengthMode = Math.round(
      clamp(readNumber(inputs.cutLengthMode, 0), 0, 1),
    );
    const rapportM = clamp(readNumber(inputs.rapport, 0), 0, 1000) / 100;
    const alignmentAllowanceM =
      clamp(readNumber(inputs.patternShift, 0), 0, 1000) / 100;
    const trimAllowanceM =
      clamp(readNumber(inputs.trimAllowanceCm, 10), 0, 1000) / 100;
    const manualStripLengthM = clamp(
      readNumber(inputs.manualStripLengthM, height + trimAllowanceM),
      0.1,
      1000,
    );
    const projectRolls = Math.round(
      clamp(readNumber(inputs.projectRolls, 1), 0, 100000),
    );
    const reservePercent = clamp(
      readNumber(inputs.reservePercent, 0),
      0,
      100,
    );
    const reserveRolls = Math.round(
      clamp(readNumber(inputs.reserveRolls, 0), 0, 100),
    );

    const wallArea =
      inputMode === 0 ? perimeter * height : inputMode === 1 ? area : 0;
    const equivalentWallRun =
      inputMode === 0 ? perimeter : inputMode === 1 ? area / height : 0;
    const calculatedStripLength = (() => {
      const baseLength = height + trimAllowanceM;
      if (rapportM <= 0) return baseLength;
      return (
        ceilPositive((baseLength + alignmentAllowanceM) / rapportM) * rapportM
      );
    })();
    const stripLength = round(
      cutLengthMode === 1 ? manualStripLengthM : calculatedStripLength,
      6,
    );
    const stripsNeeded =
      inputMode === 2 ? 0 : ceilPositive(equivalentWallRun / rollWidthM);
    const stripsPerRoll =
      inputMode === 2
        ? 0
        : Math.max(0, Math.floor((rollLength + 1e-9) / stripLength));
    const canCutStrips = inputMode === 2 || stripsPerRoll > 0;
    const baseExactRolls = round(
      inputMode === 2
        ? projectRolls
        : canCutStrips
          ? stripsNeeded / stripsPerRoll
          : 0,
      6,
    );
    const requiredRolls = canCutStrips
      ? round(
          baseExactRolls * (1 + reservePercent / 100) + reserveRolls,
          6,
        )
      : 0;
    const purchaseRolls = canCutStrips ? ceilPositive(requiredRolls) : 0;
    const leftoverRolls = round(
      Math.max(0, purchaseRolls - requiredRolls),
      6,
    );

    const assumptions = [
      inputMode === 2
        ? `Чистая потребность ${formatRuNumber(projectRolls)} ${plural(projectRolls, "рулон", "рулона", "рулонов")} взята из карты раскроя.`
        : `${stripsNeeded} ${plural(stripsNeeded, "полотно", "полотна", "полотен")} по ${formatRuNumber(stripLength)} м; из рулона ${formatRuNumber(rollLength)} м выходит ${stripsPerRoll} ${plural(stripsPerRoll, "полотно", "полотна", "полотен")}.`,
      `Явный запас: ${formatRuNumber(reservePercent)}% и ${reserveRolls} ${plural(reserveRolls, "закрытый рулон", "закрытых рулона", "закрытых рулонов")}; скрытых надбавок нет.`,
    ];
    const scenario: CalculatorScenario = {
      exact_need: requiredRolls,
      purchase_quantity: purchaseRolls,
      leftover: leftoverRolls,
      assumptions,
      key_factors: {
        hidden_multiplier: 1,
        reserve_factor: round(1 + reservePercent / 100, 6),
        reserve_rolls: reserveRolls,
      },
      buy_plan: {
        package_label: "рулон выбранного артикула",
        package_size: 1,
        packages_count: purchaseRolls,
        unit: "рулонов",
      },
    };

    const warnings: string[] = [];
    if (inputMode === 1) {
      warnings.push(
        "Предварительный режим использует площадь стен до вычета проёмов и эквивалентную длину стены. Для окон, дверей, простенков и остатков между полотнами постройте точную раскладку.",
      );
    }
    if (
      inputMode !== 2 &&
      cutLengthMode === 0 &&
      rapportM > 0 &&
      alignmentAllowanceM > 0
    ) {
      warnings.push(
        "Для смещённой подгонки дополнительный припуск применён к каждому полотну ровно как введено. Маркировка вида 64/32 описывает чередование полотен и сама по себе не означает универсальную добавку 32 см; точнее использовать карту раскроя или готовую длину полотна.",
      );
    }
    if (inputMode !== 2 && stripsPerRoll === 0) {
      warnings.push(
        "Полотно выбранной длины не помещается в рулоне. Проверьте длину рулона и готовую длину полотна — итог к покупке до исправления не выдаётся.",
      );
    }
    if (inputMode === 2) {
      warnings.push(
        "Геометрия и совмещение рисунка считаются уже закрытыми картой раскроя; калькулятор добавляет только явно выбранный резерв.",
      );
    }

    const accuracyMode = (
      typeof inputs.accuracyMode === "string"
        ? inputs.accuracyMode
        : DEFAULT_ACCURACY_MODE
    ) as AccuracyMode;
    const materialName =
      inputMode === 2
        ? "Обои выбранного артикула — по карте раскроя"
        : `Обои выбранного артикула — рулон ${formatRuNumber(rollWidthM)} × ${formatRuNumber(rollLength)} м`;

    return {
      formulaVersion: WEB_FORMULA_VERSION,
      canonicalSpecId: wallpaperSpec.calculator_id,
      materials: [
        {
          name: materialName,
          quantity: baseExactRolls,
          unit: "рулонов",
          withReserve: requiredRolls,
          purchaseQty: purchaseRolls,
          category: "Обои",
        },
      ],
      totals: {
        inputMode,
        wallArea: round(wallArea, 6),
        perimeter: round(equivalentWallRun, 6),
        height: round(height, 6),
        rollLength: round(rollLength, 6),
        rollWidthM: round(rollWidthM, 6),
        cutLengthMode,
        rapport: round(rapportM * 100, 6),
        patternShift: round(alignmentAllowanceM * 100, 6),
        trimAllowanceCm: round(trimAllowanceM * 100, 6),
        manualStripLengthM: round(manualStripLengthM, 6),
        projectRolls,
        stripsNeeded,
        stripLength,
        stripsPerRoll,
        baseExactRolls,
        reservePercent: round(reservePercent, 6),
        reserveRolls,
        requiredRolls,
        purchaseRolls,
        rollsNeeded: purchaseRolls,
        minExactNeed: requiredRolls,
        recExactNeed: requiredRolls,
        maxExactNeed: requiredRolls,
        minPurchase: purchaseRolls,
        recPurchase: purchaseRolls,
        maxPurchase: purchaseRolls,
      },
      warnings,
      practicalNotes: [
        inputMode === 2
          ? `Карта раскроя дала ${formatRuNumber(baseExactRolls)} ${plural(baseExactRolls, "рулон", "рулона", "рулонов")}; после явного резерва требуется ${formatRuNumber(requiredRolls)}, к покупке ${purchaseRolls}.`
          : `${stripsNeeded} ${plural(stripsNeeded, "полотно", "полотна", "полотен")} ÷ ${stripsPerRoll} ${plural(stripsPerRoll, "полотно", "полотна", "полотен")} из рулона = ${formatRuNumber(baseExactRolls)} ${plural(baseExactRolls, "рулон", "рулона", "рулонов")} до запаса; после явного резерва требуется ${formatRuNumber(requiredRolls)}, к покупке ${purchaseRolls}.`,
        "Клей, грунтовка и инструменты не добавляются: их выбирают по основанию и инструкции производителя конкретных обоев и состава.",
        "Перед оплатой сверьте артикул, размеры, символ совмещения, раппорт, номер партии и оттенок на этикетках всех рулонов.",
      ],
      scenarios: { MIN: scenario, REC: scenario, MAX: scenario },
      accuracyMode,
      accuracyExplanation: {
        mode: accuracyMode,
        modeLabel:
          ACCURACY_MODE_LABELS[accuracyMode] ??
          ACCURACY_MODE_LABELS[DEFAULT_ACCURACY_MODE],
        combinedMultiplier: 1,
        appliedModifiers: [],
        notes: [
          "Режим точности не меняет результат: учитываются только выбранная геометрия или карта раскроя и явно заданный резерв.",
        ],
      },
      summaryCards: [
        {
          icon: "▥",
          label: inputMode === 2 ? "По раскладке" : "Полотен",
          value: formatRuNumber(
            inputMode === 2 ? baseExactRolls : stripsNeeded,
          ),
          unit: inputMode === 2 ? "рул." : "шт",
          hint:
            inputMode === 2
              ? "до закрытого резерва"
              : `${stripsPerRoll} из одного рулона`,
          tone: "slate",
        },
        {
          icon: "↕",
          label: "Длина полотна",
          value: inputMode === 2 ? "по карте" : formatRuNumber(stripLength),
          unit: inputMode === 2 ? undefined : "м",
          hint:
            inputMode === 2
              ? "совмещение уже учтено"
              : cutLengthMode === 1
                ? "введена вручную"
                : "с припуском и раппортом",
          tone: "amber",
        },
        {
          icon: "▤",
          label: "К покупке",
          value: String(purchaseRolls),
          unit: plural(purchaseRolls, "рулон", "рулона", "рулонов"),
          hint:
            reservePercent > 0 || reserveRolls > 0
              ? "явный резерв учтён один раз"
              : "без скрытого резерва",
          tone: "emerald",
        },
      ],
    };
  },
  formulaDescription: `
**Расчёт рулонов по целым полотнам:**

1. Полотна = округление вверх (периметр / ширина рулона).
2. Длина полотна = высота + общий припуск; при прямом раппорте результат округляется вверх до целого шага рисунка.
3. Полотен из рулона = целая часть (длина рулона / длина полотна).
4. Чистые рулоны = полотна / полотен из рулона.
5. Требуется = чистые рулоны × (1 + явный запас, %) + закрытые запасные рулоны; итог к покупке округляется вверх.

Режим готовой раскладки пропускает приближённую геометрию и принимает её чистый итог. MIN, REC и MAX одинаковы: скрытых коэффициентов и автоматического запасного рулона нет.
  `,
  howToUse: [
    "Для простой комнаты укажите полный периметр и высоту стен; проёмы автоматически не вычитаются.",
    "Перенесите длину и ширину конкретного рулона и выберите расчётную или готовую длину полотна.",
    "Если есть рисунок, укажите вертикальный раппорт. Для смещённой подгонки используйте карту раскроя или проверенную длину полотна.",
    "Задайте запас явно — процентом и/или закрытыми целыми рулонами — и получите итог к покупке.",
  ],
  expertTips: [
    {
      title: "Одна партия и оттенок",
      content:
        "Проверьте артикул, номер партии и обозначение оттенка на каждом рулоне до начала работ. Внешне одинаковые рулоны из разных партий могут отличаться.",
      author: "Мастер-отделочник",
    },
    {
      title: "Сначала пробное полотно",
      content:
        "При смещённой стыковке разложите два-три соседних полотна и измерьте фактический шаг раскроя. Это надёжнее универсальной надбавки по второму числу маркировки.",
      author: "Прораб",
    },
  ],
  faq: [
    {
      question: "Почему калькулятор не вычитает окна и двери?",
      answer:
        "Площадь проёма не равна гарантированной экономии целого полотна. Короткие остатки можно использовать только при подходящем расположении проёмов и рисунка, поэтому быстрый режим считает полный ряд полотен, а точный учёт выполняет карта раскроя.",
    },
    {
      question: "Почему MIN, REC и MAX одинаковы?",
      answer:
        "Калькулятор не придумывает разные запасы. Процент и дополнительные рулоны задаются пользователем и применяются один раз; режим точности итог не увеличивает.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Как рассчитать обои по полотнам</h2>
<p>Для простой комнаты калькулятор делит полный периметр оклеиваемых стен на ширину рулона и округляет число полотен вверх. Затем определяет длину одного полотна, число целых полотен из рулона и только в конце — число рулонов к покупке. Так площадь рулона не подменяет реальный раскрой.</p>
<p><strong>Рулоны к покупке = &lceil;(Полотна / Полотен из рулона) &times; (1 + явный запас, %) + закрытые запасные рулоны&rceil;.</strong> Процент и запасные рулоны применяются ровно один раз. MIN, REC и MAX не содержат скрытой надбавки.</p>

<h2>Почему окна и двери не вычитаются автоматически</h2>
<p>Проём уменьшает оклеиваемую площадь, но не всегда уменьшает количество полноразмерных полотен: всё зависит от ширины простенков, положения рисунка и пригодности остатков. Режим по площади стен до вычета проёмов поэтому помечен как предварительный. Для проекта с окнами, дверями, отдельными стенами и остатками используйте <a href="/instrumenty/raskladka-oboev/">точную раскладку обоев</a>, а её итог перенесите в калькулятор.</p>

<h2>Раппорт, прямая и смещённая стыковка</h2>
<p>При прямом совпадении длина полотна после подрезочного припуска округляется вверх до полного раппорта. При смещённом совпадении соседние полотна чередуются, поэтому второе число в маркировке вида 64/32 нельзя без проверки прибавлять к каждому полотну. В консультации <a href="https://marburg.com/en/wallpaper-consultation/" rel="noopener noreferrer">Marburg по символам обоев</a> свободное, прямое и смещённое совпадение описаны как разные способы стыковки. Реальный артикул Marburg имеет размер 10,05 × 0,53 м и маркировку 64/32 — это видно в <a href="https://marburg.com/en/city-glow-subpage-2/" rel="noopener noreferrer">карточке City Glow</a>. Такой же формат 10,05 × 0,53 м и 64/32 встречается в <a href="https://www.as-creation.com/fileadmin/02_Tapeten_Highlights/Kollektionsbroschuren/Pint_Walls_DE-EN.pdf" rel="noopener noreferrer">официальном каталоге A.S. Création</a>. Для смещённого рисунка надёжнее карта раскроя или измеренная готовая длина полотна.</p>

<h2>Что регулирует стандарт</h2>
<p><a href="https://protect.gost.ru/gost/details/0d517194-e3f9-4143-9550-34afcb44a0a4" rel="noopener noreferrer">ГОСТ 6810-2002</a> — действующий на дату проверки стандарт на обои, включая технические требования и маркировку. <a href="https://protect.gost.ru/gost/details/3fe0ec03-d9be-45bd-8718-0ca4118df9be" rel="noopener noreferrer">ГОСТ 6810-2026</a> принят, но его основная дата введения — 1 июля 2027 года; поэтому он не представлен как уже действующая замена. Стандарт не задаёт универсальное число рулонов для комнаты: размеры, раппорт и символ стыковки нужно брать с этикетки выбранного артикула.</p>

<h2>Что проверить перед покупкой</h2>
<ul>
  <li>полный артикул, ширину и длину рулона;</li>
  <li>символ стыковки, вертикальный раппорт и правила чередования полотен;</li>
  <li>номер партии и оттенок на каждом рулоне;</li>
  <li>возможность вернуть нераспечатанный запас;</li>
  <li>тип клея и подготовку основания по инструкциям производителей — калькулятор не добавляет их автоматически.</li>
</ul>
`,
    faq: [
      {
        question: "Сколько рулонов нужно на комнату с периметром 14 м?",
        answer:
          "<p>При высоте 2,7 м, общем припуске 10 см и рулоне 10,05 × 0,53 м без рисунка нужно 27 полотен длиной 2,8 м. Из рулона выходит 3 полотна, поэтому чистый итог — 9 рулонов. Проёмы и сложный рисунок требуют отдельной раскладки.</p>",
      },
      {
        question: "Что означает маркировка раппорта 64/32?",
        answer:
          "<p>Первое число обычно обозначает вертикальный шаг повторения, а второе связано со смещением соседнего полотна. Это не универсальная команда прибавить 32 см к каждой полосе. Сверьте символ и инструкцию артикула, затем используйте карту раскроя или готовую длину полотна.</p>",
      },
      {
        question: "Нужно ли покупать запасной рулон?",
        answer:
          "<p>Это проектное решение, а не скрытая норма калькулятора. Укажите дополнительный рулон явно, если он нужен для сложных участков, брака, будущего ремонта или если выбранный артикул может исчезнуть из продажи.</p>",
      },
    ],
  },
};
