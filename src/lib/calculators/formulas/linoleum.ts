import type { CalculatorDefinition, CalculatorScenario, MaterialResult } from "../types";
import { withSiteMetaTitle } from "../meta";
import { ACCURACY_MODE_LABELS, DEFAULT_ACCURACY_MODE, type AccuracyMode } from "../../../../engine/accuracy";
import linoleumCanonicalSpec from "../../../../configs/calculators/linoleum-canonical.v1.json";

const WEB_FORMULA_VERSION = "linoleum-web-cutting-v2";

interface CuttingOption {
  direction: 1 | 2;
  strips: number;
  stripLengthM: number;
  patternAllowanceM: number;
  exactLinearM: number;
  seamLengthM: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const clampInteger = (value: number, min: number, max: number): number =>
  Math.round(clamp(value, min, max));

const round = (value: number, digits = 3): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const roundUpToStep = (value: number, step: number): number =>
  round(Math.ceil((value - Number.EPSILON) / step) * step, 6);

const formatRuNumber = (value: number, maximumFractionDigits = 3): string =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits }).format(value);

const pluralRu = (count: number, one: string, few: string, many: string): string => {
  const lastTwo = Math.abs(count) % 100;
  const last = lastTwo % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
};

const buildCuttingOption = ({
  direction,
  stripLengthM,
  coveredRoomSideM,
  rollWidthM,
  trimAllowanceM,
  patternRepeatM,
}: {
  direction: 1 | 2;
  stripLengthM: number;
  coveredRoomSideM: number;
  rollWidthM: number;
  trimAllowanceM: number;
  patternRepeatM: number;
}): CuttingOption => {
  const strips = Math.max(1, Math.ceil(coveredRoomSideM / rollWidthM));
  const patternAllowanceM = Math.max(0, strips - 1) * patternRepeatM;
  const exactLinearM = strips * (stripLengthM + trimAllowanceM) + patternAllowanceM;

  return {
    direction,
    strips,
    stripLengthM,
    patternAllowanceM,
    exactLinearM,
    seamLengthM: Math.max(0, strips - 1) * stripLengthM,
  };
};

export const linoleumDef: CalculatorDefinition = {
  id: "floors_linoleum",
  slug: "linoleum",
  formulaVersion: WEB_FORMULA_VERSION,
  title: "Калькулятор линолеума",
  h1: "Калькулятор линолеума онлайн — расчёт погонных метров и раскроя",
  description: "Рассчитайте погонные метры линолеума по размерам комнаты, ширине рулона, направлению полос, припуску и раппорту рисунка.",
  metaTitle: withSiteMetaTitle("Калькулятор линолеума: расчёт погонных метров"),
  metaDescription: "Бесплатный калькулятор линолеума: рассчитайте погонные метры, число полос и раскрой по ширине рулона, направлению, припуску и раппорту.",
  category: "flooring",
  categorySlug: "poly",
  tags: ["линолеум", "напольное покрытие", "рулонное покрытие", "линолеум ширина"],
  popularity: 60,
  complexity: 2,
  fields: [
    {
      key: "roomLength",
      label: "Длина комнаты",
      type: "slider",
      unit: "м",
      min: 1,
      max: 30,
      step: 0.1,
      defaultValue: 5,
    },
    {
      key: "roomWidth",
      label: "Ширина комнаты",
      type: "slider",
      unit: "м",
      min: 1,
      max: 20,
      step: 0.1,
      defaultValue: 4,
    },
    {
      key: "rollWidth",
      label: "Ширина выбранного рулона",
      type: "select",
      defaultValue: 3.5,
      options: [
        { value: 1.5, label: "1,5 м" },
        { value: 2, label: "2,0 м" },
        { value: 2.5, label: "2,5 м" },
        { value: 3, label: "3,0 м" },
        { value: 3.5, label: "3,5 м" },
        { value: 4, label: "4,0 м" },
        { value: 5, label: "5,0 м" },
      ],
      hint: "Выберите ширину фактически доступного артикула. Длину отреза и минимальный шаг продажи уточните у продавца.",
    },
    {
      key: "stripDirection",
      label: "Направление полос",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Авто — меньше погонных метров" },
        { value: 1, label: "Вдоль длины комнаты" },
        { value: 2, label: "Вдоль ширины комнаты" },
      ],
      hint: "Автовыбор сравнивает оба направления. Используйте его только если рисунок, направление ворса и инструкция выбранного покрытия допускают поворот полотен на 90°.",
      fullWidth: true,
    },
    {
      key: "trimAllowanceCm",
      label: "Общий припуск к длине каждой полосы",
      type: "select",
      defaultValue: 10,
      options: [
        { value: 0, label: "0 см" },
        { value: 10, label: "10 см" },
        { value: 20, label: "20 см" },
        { value: 30, label: "30 см" },
      ],
      hint: "Это суммарный припуск на полосу, а не на каждую сторону. Выберите его по фактическим замерам, кривизне стен и инструкции по укладке.",
    },
    {
      key: "hasPattern",
      label: "Есть рисунок с раппортом",
      type: "switch",
      defaultValue: 0,
    },
    {
      key: "patternRepeatCm",
      label: "Раппорт рисунка",
      type: "slider",
      unit: "см",
      min: 0,
      max: 100,
      step: 5,
      defaultValue: 30,
      hint: "Возьмите значение с этикетки или технической документации выбранного покрытия.",
      hideIf: { key: "hasPattern", op: "eq", value: 0 },
    },
    {
      key: "purchaseStepM",
      label: "Шаг продажи отреза",
      type: "select",
      defaultValue: 0.1,
      options: [
        { value: 0.1, label: "0,1 м" },
        { value: 0.5, label: "0,5 м" },
        { value: 1, label: "1,0 м" },
      ],
      hint: "Калькулятор округлит общий метраж вверх только до выбранного шага. Проверьте правила конкретного продавца.",
    },
  ],
  calculate(inputs) {
    const roomLength = clamp(Number(inputs.roomLength ?? inputs.length ?? 5), 1, 30);
    const roomWidth = clamp(Number(inputs.roomWidth ?? inputs.width ?? 4), 1, 20);
    const rollWidth = clamp(Number(inputs.rollWidth ?? 3.5), 1.5, 5);
    const stripDirection = clampInteger(Number(inputs.stripDirection ?? 0), 0, 2);
    const trimAllowanceCm = clamp(Number(inputs.trimAllowanceCm ?? 10), 0, 30);
    const trimAllowanceM = trimAllowanceCm / 100;
    const hasPattern = Number(inputs.hasPattern ?? 0) > 0;
    const patternRepeatCm = hasPattern
      ? clamp(Number(inputs.patternRepeatCm ?? inputs.patternRepeat ?? 30), 0, 100)
      : 0;
    const patternRepeatM = patternRepeatCm / 100;
    const purchaseStepM = clamp(Number(inputs.purchaseStepM ?? 0.1), 0.1, 1);

    const alongLength = buildCuttingOption({
      direction: 1,
      stripLengthM: roomLength,
      coveredRoomSideM: roomWidth,
      rollWidthM: rollWidth,
      trimAllowanceM,
      patternRepeatM,
    });
    const alongWidth = buildCuttingOption({
      direction: 2,
      stripLengthM: roomWidth,
      coveredRoomSideM: roomLength,
      rollWidthM: rollWidth,
      trimAllowanceM,
      patternRepeatM,
    });

    const cutting = stripDirection === 1
      ? alongLength
      : stripDirection === 2
        ? alongWidth
        : alongWidth.exactLinearM < alongLength.exactLinearM
          ? alongWidth
          : alongLength;
    const directionLabel = cutting.direction === 1
      ? "вдоль длины комнаты"
      : "вдоль ширины комнаты";
    const exactLinearM = cutting.exactLinearM;
    const purchaseLinearM = roundUpToStep(exactLinearM, purchaseStepM);
    const linearLeftoverM = Math.max(0, purchaseLinearM - exactLinearM);
    const roomArea = roomLength * roomWidth;
    const purchasedCoverageArea = purchaseLinearM * rollWidth;
    const cuttingDifferenceArea = Math.max(0, purchasedCoverageArea - roomArea);
    const cuttingDifferencePct = roomArea > 0 ? cuttingDifferenceArea / roomArea * 100 : 0;

    const requestedAccuracyMode = inputs.accuracyMode as unknown as AccuracyMode | undefined;
    const accuracyMode = requestedAccuracyMode && requestedAccuracyMode in ACCURACY_MODE_LABELS
      ? requestedAccuracyMode
      : DEFAULT_ACCURACY_MODE;

    const materials: MaterialResult[] = [
      {
        name: `Линолеум шириной ${formatRuNumber(rollWidth, 1)} м`,
        quantity: round(exactLinearM, 6),
        unit: "м.п.",
        withReserve: round(exactLinearM, 6),
        purchaseQty: round(purchaseLinearM, 6),
        category: "Покрытие",
        subtitle: `${cutting.strips} ${pluralRu(cutting.strips, "полоса", "полосы", "полос")} × ${formatRuNumber(cutting.stripLengthM + trimAllowanceM)} м + ${formatRuNumber(cutting.patternAllowanceM)} м на раппорт; округление до ${formatRuNumber(purchaseStepM)} м`,
        highlight: true,
      },
    ];

    const scenario: CalculatorScenario = {
      exact_need: round(exactLinearM, 6),
      purchase_quantity: round(purchaseLinearM, 6),
      leftover: round(linearLeftoverM, 6),
      assumptions: [
        `formula_version:${WEB_FORMULA_VERSION}`,
        `direction:${cutting.direction}`,
        `trim_allowance_cm:${trimAllowanceCm}`,
        `pattern_repeat_cm:${patternRepeatCm}`,
        `purchase_step_m:${purchaseStepM}`,
        "rectangular_room_model:true",
      ],
      key_factors: { field_multiplier: 1 },
      buy_plan: {
        package_label: `linear-meter-step-${purchaseStepM}`,
        package_size: purchaseStepM,
        packages_count: 0,
        unit: "м.п.",
      },
    };

    const warnings = [
      "Модель считает прямоугольную комнату без ниш, выступов, дверных проёмов, обхода колонн и карты фактического раскроя.",
      stripDirection === 0
        ? `Автовыбор дал направление ${directionLabel}, потому что оно требует меньше погонных метров. Проверьте, допускают ли рисунок, направление ворса и инструкция изделия поворот полотен.`
        : `Выбрано направление ${directionLabel}. Сравните его с освещением, рисунком, направлением ворса и инструкцией фактического покрытия.`,
      cutting.strips > 1
        ? `Получится ${cutting.strips} ${pluralRu(cutting.strips, "полоса", "полосы", "полос")} и ориентировочно ${formatRuNumber(cutting.seamLengthM)} м продольных швов. Расположение, подрезка и технология соединения швов не проектируются.`
        : "Расчёт укладывается в одну полосу по ширине, но фактический раскрой у дверей, ниш и выступов всё равно нужно проверить по замерам.",
      "Клей, грунтовка, двусторонняя лента, плинтус и состав для швов не рассчитаны: основание, способ фиксации, продукт, расход, фасовка, дверные проёмы и узлы примыканий не вводятся.",
      `Шаг продажи ${formatRuNumber(purchaseStepM)} м выбран пользователем. Наличие нужной ширины, минимальный отрез, припуски продавца и возможность возврата остатка уточните до заказа.`,
    ];

    if (hasPattern && patternRepeatM > 0) {
      warnings.push(`Поправка на раппорт предварительна: добавлено по одному полному повтору ${formatRuNumber(patternRepeatM)} м для каждой следующей полосы. Точную подгонку проверьте по направлению и меткам конкретного рисунка.`);
    }

    if (cuttingDifferencePct > 25) {
      warnings.push(`Разница между площадью купленного отреза и площадью комнаты составляет ${formatRuNumber(cuttingDifferencePct, 1)}%. Сравните доступные ширины рулона и допустимые направления раскроя; часть обрезков может быть непригодна для этого помещения.`);
    }

    const practicalNotes = [
      `Площадь комнаты: ${formatRuNumber(roomArea)} м². Выбрано направление ${directionLabel}: ${cutting.strips} ${pluralRu(cutting.strips, "полоса", "полосы", "полос")} по ${formatRuNumber(cutting.stripLengthM)} м без припуска.`,
      `Общий припуск ${formatRuNumber(trimAllowanceCm)} см добавлен к каждой полосе явно; скрытый процент или множитель режима точности не применяется.`,
      `К покупке ${formatRuNumber(purchaseLinearM)} пог. м после округления вверх до шага ${formatRuNumber(purchaseStepM)} м.`,
      "До резки сделайте фактическую карту полотен с нишами, выступами, дверями и швами и сверьте направление укладки с документацией выбранного покрытия.",
    ];

    return {
      materials,
      totals: {
        roomLength: round(roomLength),
        roomWidth: round(roomWidth),
        area: round(roomArea, 6),
        rollWidth: round(rollWidth),
        stripDirection,
        selectedDirection: cutting.direction,
        stripsNeeded: cutting.strips,
        stripLengthM: round(cutting.stripLengthM, 6),
        trimAllowanceCm: round(trimAllowanceCm),
        hasPattern: hasPattern ? 1 : 0,
        patternRepeatCm: round(patternRepeatCm),
        patternAllowanceM: round(cutting.patternAllowanceM, 6),
        exactLinearM: round(exactLinearM, 6),
        purchaseStepM: round(purchaseStepM),
        purchaseLinearM: round(purchaseLinearM, 6),
        linearLeftoverM: round(linearLeftoverM, 6),
        seamLengthM: round(cutting.seamLengthM, 6),
        totalCoverageArea: round(purchasedCoverageArea, 6),
        cuttingDifferenceArea: round(cuttingDifferenceArea, 6),
        wastePercent: round(cuttingDifferencePct, 3),
        minExactNeedLinearM: round(exactLinearM, 6),
        recExactNeedLinearM: round(exactLinearM, 6),
        maxExactNeedLinearM: round(exactLinearM, 6),
        minPurchaseLinearM: round(purchaseLinearM, 6),
        recPurchaseLinearM: round(purchaseLinearM, 6),
        maxPurchaseLinearM: round(purchaseLinearM, 6),
      },
      warnings,
      scenarios: { MIN: scenario, REC: scenario, MAX: scenario },
      formulaVersion: WEB_FORMULA_VERSION,
      canonicalSpecId: linoleumCanonicalSpec.calculator_id,
      practicalNotes,
      accuracyMode,
      accuracyExplanation: {
        mode: accuracyMode,
        modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
        combinedMultiplier: 1,
        appliedModifiers: [],
        notes: ["Режим точности не меняет раскрой; учитываются только выбранные направление, припуск, раппорт и шаг продажи."],
      },
      summaryCards: [
        {
          icon: "↔",
          label: "К покупке",
          value: formatRuNumber(purchaseLinearM),
          unit: "пог. м",
          hint: `${formatRuNumber(exactLinearM)} м до округления до шага ${formatRuNumber(purchaseStepM)} м`,
          tone: "violet",
        },
        {
          icon: "▥",
          label: "Раскрой",
          value: String(cutting.strips),
          unit: pluralRu(cutting.strips, "полоса", "полосы", "полос"),
          hint: directionLabel,
          tone: "amber",
        },
        {
          icon: "□",
          label: "Площадь отреза",
          value: formatRuNumber(purchasedCoverageArea),
          unit: "м²",
          hint: `разница с комнатой ${formatRuNumber(cuttingDifferenceArea)} м²`,
          tone: "slate",
        },
      ],
      materialListBanner: "Ведомость содержит только линолеум по прямоугольному раскрою. Клей, грунтовка, лента, плинтус и состав для швов в неё не входят.",
    };
  },
  formulaDescription: `
**Предварительный раскрой линолеума для прямоугольной комнаты:**
- Число полос = округление вверх размера поперёк полос / ширина рулона.
- Длина полосы = размер вдоль полосы + выбранный общий припуск.
- При включённом рисунке добавляется один полный раппорт на каждую следующую полосу как предварительная консервативная поправка.
- К покупке = общий метраж полос, округлённый вверх до выбранного шага продажи.
- Автовыбор сравнивает два направления; применять его можно только когда изделие допускает поворот полотен.
- MIN/REC/MAX совпадают: скрытые проценты и коэффициенты режима точности не применяются.
- ГОСТ 18108-2016 и ГОСТ 7251-2016 относятся к определённым видам поливинилхлоридного линолеума, а СП 71.13330.2017 — к устройству изоляционных и отделочных покрытий. Они не заменяют документацию выбранного изделия и карту раскроя.
  `,
  howToUse: [
    "Введите фактические длину и ширину прямоугольной части комнаты",
    "Выберите ширину рулона, которая доступна у продавца для нужного артикула",
    "Задайте направление полос либо оставьте авто только при допустимом повороте рисунка или ворса",
    "Выберите суммарный припуск к длине каждой полосы",
    "Если есть рисунок, включите раппорт и введите его шаг по документации покрытия",
    "Укажите шаг продажи и используйте результат как основу для фактической карты раскроя",
  ],
  expertTips: [
    {
      title: "Сначала карта полотен, потом заказ",
      content: "Перенесите на эскиз ниши, выступы, двери, трубы и предполагаемые швы. Площадь комнаты сама по себе не показывает, можно ли использовать конкретный обрезок.",
      author: "Мастерок",
    },
    {
      title: "Не поворачивайте покрытие автоматически",
      content: "У рисунка, тиснения или ворса может быть заданное направление. Автовыбор экономит погонные метры только когда техническая документация изделия допускает такой поворот полотен.",
      author: "Прораб",
    },
  ],
  faq: [
    {
      question: "Почему калькулятор сравнивает два направления полос?",
      answer: "При одной ширине рулона число и длина полос зависят от ориентации в комнате. Автовыбор показывает меньший метраж, но окончательное направление нужно сверить с рисунком, ворсом, освещением, расположением швов и инструкцией выбранного покрытия.",
    },
    {
      question: "Как учитывается раппорт рисунка?",
      answer: "Предварительно добавляется один полный раппорт на каждую полосу после первой. Это консервативная упрощённая модель: фактическая подгонка зависит от направления, меток рисунка и взаимного положения отрезов.",
    },
    {
      question: "Почему нет расчёта клея и холодной сварки?",
      answer: "Одних размеров комнаты недостаточно. Нужны тип и состояние основания, способ фиксации, фактический продукт и его расход, фасовка, число и конструкция швов и требования производителя покрытия.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Как рассчитать линолеум в погонных метрах</h2>
<p>Для прямоугольной комнаты калькулятор строит два варианта: полосы вдоль длины и полосы вдоль ширины. Для каждого варианта число полос округляется вверх по ширине рулона, а к длине каждой полосы добавляется выбранный пользователем общий припуск.</p>
<p><strong>N = &lceil;B / W<sub>рулона</sub>&rceil;</strong></p>
<p><strong>L<sub>точно</sub> = N &times; (L<sub>полосы</sub> + A) + (N - 1) &times; R</strong></p>
<ul>
  <li><strong>B</strong> — размер комнаты поперёк полос;</li>
  <li><strong>W<sub>рулона</sub></strong> — фактическая ширина выбранного рулона;</li>
  <li><strong>A</strong> — выбранный общий припуск к длине каждой полосы;</li>
  <li><strong>R</strong> — раппорт, если рисунок включён.</li>
</ul>
<p>К покупке точный погонный метраж округляется вверх до введённого шага продажи. Скрытого процента поверх припуска нет.</p>

<h2>Когда можно использовать автоматическое направление</h2>
<p>Автовыбор сравнивает два прямоугольных варианта и берёт меньший погонный метраж. Это не рекомендация по укладке. Поворот полотен должен быть допустим для фактического рисунка, тиснения или ворса; также учитывают свет, расположение швов и требования документации изделия.</p>
<p>Ниши, выступы, дверные зоны, обход труб и полезность обрезков модель не видит. Перед покупкой перенесите все детали на карту раскроя.</p>

<h2>Что не входит в результат</h2>
<ul>
  <li>клей, грунтовка и двусторонняя лента;</li>
  <li>состав и технология соединения швов;</li>
  <li>плинтусы, пороги и узлы примыканий;</li>
  <li>подготовка, влажность и ровность основания;</li>
  <li>проект раскроя непрямоугольного помещения.</li>
</ul>
<p>Эти позиции определяют по фактическому основанию, способу фиксации, инструкции покрытия и выбранным товарным системам.</p>

<h2>Действующие профильные документы</h2>
<ul>
  <li><a href="https://protect.gost.ru/gost/details/64201222-28b9-49ce-a72a-40eef8e08fa9" rel="noopener noreferrer">ГОСТ 18108-2016 «Линолеум поливинилхлоридный на теплозвукоизолирующей подоснове»</a> — требования к соответствующему виду покрытия.</li>
  <li><a href="https://protect.gost.ru/gost/details/64e7d7c1-fa24-476c-a247-4a7701c9ff99" rel="noopener noreferrer">ГОСТ 7251-2016 «Линолеум поливинилхлоридный на тканевой и нетканой подоснове»</a> — требования к указанным видам покрытия.</li>
  <li><a href="https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939" rel="noopener noreferrer">СП 71.13330.2017 «Изоляционные и отделочные покрытия»</a> — правила производства и приёмки работ; на официальной карточке указаны изменения № 1–4.</li>
</ul>
<p>Область применения каждого документа нужно сопоставить с фактическим изделием. Эти источники не задают универсальный шаг продажи рулона, припуск, расход клея или автоматическое направление полотен.</p>
`,
    faq: [
      {
        question: "Сколько линолеума нужно на комнату 5×4 м при ширине рулона 3,5 м?",
        answer: "<p>При суммарном припуске 10 см на полосу вариант вдоль длины требует 2 × 5,1 = 10,2 пог. м, а вариант вдоль ширины — 2 × 4,1 = 8,2 пог. м. Автовыбор покажет 8,2 пог. м, только если покрытие можно повернуть на 90°.</p>",
      },
      {
        question: "Можно ли рассчитать линолеум только по площади комнаты?",
        answer: "<p>Для рулонного материала одной площади недостаточно: комнаты одинаковой площади могут требовать разное число полос и погонных метров. Нужны длина, ширина, доступная ширина рулона, направление полотен, припуск и при необходимости раппорт.</p>",
      },
      {
        question: "Что означает разница площади отреза и комнаты?",
        answer: "<p>Это площадь купленного прямоугольного отреза минус площадь комнаты. Она помогает увидеть влияние ширины рулона и раскроя, но не равна гарантированно пригодному остатку: форма и положение обрезков могут не позволить использовать их в этом помещении.</p>",
      },
    ],
  },
};
