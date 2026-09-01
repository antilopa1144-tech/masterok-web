import type { CalculatorDefinition, CalculatorScenario, MaterialResult } from "../types";
import { withSiteMetaTitle } from "../meta";
import { ACCURACY_MODE_LABELS, DEFAULT_ACCURACY_MODE, type AccuracyMode } from "../../../../engine/accuracy";
import fenceSpec from "../../../../configs/calculators/fence-canonical.v1.json";

const WEB_FORMULA_VERSION = "fence-web-fill-v1";

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const clampInteger = (value: number, min: number, max: number): number =>
  Math.round(clamp(value, min, max));

const round = (value: number, digits = 3): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

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

const TYPE_LABELS: Record<number, string> = {
  0: "Профнастил",
  1: "Сетка-рабица",
  2: "Штакетник",
};

export const fenceDef: CalculatorDefinition = {
  id: "fence",
  slug: "zabor",
  formulaVersion: WEB_FORMULA_VERSION,
  title: "Калькулятор забора",
  h1: "Калькулятор забора онлайн — расчёт заполнения по длине",
  description: "Рассчитайте предварительное количество профлиста, рулонов сетки-рабицы или штакетин по чистой длине ограждения, рабочему модулю и явному запасу.",
  metaTitle: withSiteMetaTitle("Калькулятор забора: расчёт заполнения"),
  metaDescription: "Бесплатный калькулятор забора: рассчитайте профлист, сетку-рабицу или штакетник по чистой длине, рабочему модулю и явному запасу.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["забор", "профлист", "профнастил", "сетка-рабица", "штакетник", "ограждение"],
  popularity: 65,
  complexity: 2,
  fields: [
    {
      key: "fenceLength",
      label: "Общая длина линии ограждения",
      type: "slider",
      unit: "м",
      min: 5,
      max: 500,
      step: 1,
      defaultValue: 50,
      hint: "Измерьте полную линию ограждения до вычета ворот, калиток и других незаполняемых участков.",
    },
    {
      key: "openingsWidthM",
      label: "Суммарная ширина ворот, калиток и разрывов",
      type: "number",
      unit: "м",
      min: 0,
      max: 500,
      step: 0.1,
      defaultValue: 5,
      hint: "Сложите фактические проектные ширины всех участков, где выбранного заполнения не будет. Усиление проёмов отдельно не рассчитывается.",
      fullWidth: true,
    },
    {
      key: "fenceHeight",
      label: "Высота заполнения",
      type: "slider",
      unit: "м",
      min: 1,
      max: 3,
      step: 0.1,
      defaultValue: 2,
      hint: "Высота нужна для проверки длины листа, рулона или штакетины. Допустимость высоты и несущая схема этим калькулятором не подтверждаются.",
    },
    {
      key: "fenceType",
      label: "Выбранное заполнение",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Профнастил" },
        { value: 1, label: "Сетка-рабица" },
        { value: 2, label: "Односторонний штакетник" },
      ],
      hint: "Тип включает только подходящий размерный модуль. Опоры, прогоны, основание, крепёж и узлы ворот не назначаются автоматически.",
      fullWidth: true,
    },
    {
      key: "sheetWorkingWidthMm",
      label: "Рабочая ширина выбранного профлиста",
      type: "number",
      unit: "мм",
      min: 500,
      max: 1500,
      step: 1,
      defaultValue: 1150,
      hint: "Возьмите полезную ширину из паспорта конкретного профиля. Например, официальные карточки «Металл Профиль» указывают 1150 мм для С8 и 1000 мм для С21.",
      hideIf: { key: "fenceType", op: "ne", value: 0 },
      fullWidth: true,
    },
    {
      key: "meshRollLengthM",
      label: "Длина выбранного рулона сетки",
      type: "number",
      unit: "м",
      min: 1,
      max: 100,
      step: 0.1,
      defaultValue: 10,
      hint: "Введите фактическую длину рулона. Его высота должна соответствовать проектной высоте заполнения; вертикальное наращивание калькулятор не предусматривает.",
      hideIf: { key: "fenceType", op: "ne", value: 1 },
      fullWidth: true,
    },
    {
      key: "slatWidthMm",
      label: "Рабочая ширина одной штакетины",
      type: "number",
      unit: "мм",
      min: 20,
      max: 300,
      step: 1,
      defaultValue: 100,
      hint: "Введите фактическую ширину выбранного изделия. Расчёт предполагает один ряд без перекрытия.",
      hideIf: { key: "fenceType", op: "ne", value: 2 },
    },
    {
      key: "slatGapMm",
      label: "Зазор между штакетинами",
      type: "number",
      unit: "мм",
      min: 0,
      max: 300,
      step: 1,
      defaultValue: 30,
      hint: "Укажите принятый проектный зазор. Для шахматного или многорядного заполнения нужна отдельная раскладка.",
      hideIf: { key: "fenceType", op: "ne", value: 2 },
    },
    {
      key: "coverReservePercent",
      label: "Ваш запас заполнения",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: [
        { value: 0, label: "0% — чистая длина" },
        { value: 5, label: "5%" },
        { value: 10, label: "10%" },
        { value: 15, label: "15%" },
        { value: 20, label: "20%" },
      ],
      hint: "Запас выбирает пользователь после раскладки секций, проверки пригодности обрезков, повреждений и требований одной партии. Скрытый процент не добавляется.",
      fullWidth: true,
    },
  ],
  calculate(inputs) {
    const fenceLength = clamp(Number(inputs.fenceLength ?? 50), 5, 500);
    const openingsWidthM = clamp(Number(inputs.openingsWidthM ?? 5), 0, 500);
    const openingsWidthUsedM = Math.min(openingsWidthM, fenceLength);
    const netFillLengthM = Math.max(0, fenceLength - openingsWidthUsedM);
    const fenceHeight = clamp(Number(inputs.fenceHeight ?? 2), 1, 3);
    const fenceType = clampInteger(Number(inputs.fenceType ?? 0), 0, 2);
    const sheetWorkingWidthMm = clamp(Number(inputs.sheetWorkingWidthMm ?? 1150), 500, 1500);
    const meshRollLengthM = clamp(Number(inputs.meshRollLengthM ?? 10), 1, 100);
    const slatWidthMm = clamp(Number(inputs.slatWidthMm ?? 100), 20, 300);
    const slatGapMm = clamp(Number(inputs.slatGapMm ?? 30), 0, 300);
    const coverReservePercent = clamp(Number(inputs.coverReservePercent ?? 0), 0, 20);

    const productModuleM = fenceType === 0
      ? sheetWorkingWidthMm / 1000
      : fenceType === 1
        ? meshRollLengthM
        : (slatWidthMm + slatGapMm) / 1000;
    const cleanNeed = productModuleM > 0 ? netFillLengthM / productModuleM : 0;
    const reservedNeed = cleanNeed * (1 + coverReservePercent / 100);
    const purchaseQty = reservedNeed > 0 ? Math.ceil(reservedNeed - Number.EPSILON) : 0;
    const leftoverUnits = Math.max(0, purchaseQty - reservedNeed);
    const purchasedFillLengthM = purchaseQty * productModuleM;
    const typeLabel = TYPE_LABELS[fenceType] ?? TYPE_LABELS[0];
    const materialUnit = fenceType === 1 ? "рулонов" : "шт";
    const packageUnit = fenceType === 0 ? "листов" : fenceType === 1 ? "рулонов" : "штакетин";
    const cleanNeedLabel = formatRuNumber(cleanNeed);
    const reservedNeedLabel = formatRuNumber(reservedNeed);

    const requestedAccuracyMode = inputs.accuracyMode as unknown as AccuracyMode | undefined;
    const accuracyMode = requestedAccuracyMode && requestedAccuracyMode in ACCURACY_MODE_LABELS
      ? requestedAccuracyMode
      : DEFAULT_ACCURACY_MODE;

    const subtitle = fenceType === 0
      ? `${formatRuNumber(netFillLengthM)} м / ${formatRuNumber(productModuleM, 3)} м = ${cleanNeedLabel} листа; с запасом ${formatRuNumber(coverReservePercent)}% — ${reservedNeedLabel}, округление вверх — ${purchaseQty} шт.`
      : fenceType === 1
        ? `${formatRuNumber(netFillLengthM)} м / ${formatRuNumber(meshRollLengthM)} м = ${cleanNeedLabel} рулона; с запасом ${formatRuNumber(coverReservePercent)}% — ${reservedNeedLabel}, округление вверх — ${purchaseQty} рул.`
        : `${formatRuNumber(netFillLengthM)} м / (${formatRuNumber(slatWidthMm)} + ${formatRuNumber(slatGapMm)}) мм = ${cleanNeedLabel} шт.; с запасом ${formatRuNumber(coverReservePercent)}% — ${reservedNeedLabel}, округление вверх — ${purchaseQty} шт.`;

    const materials: MaterialResult[] = purchaseQty > 0
      ? [
        {
          name: fenceType === 0
            ? `${typeLabel} — рабочая ширина ${formatRuNumber(sheetWorkingWidthMm)} мм`
            : fenceType === 1
              ? `${typeLabel} — рулон ${formatRuNumber(meshRollLengthM)} м`
              : `${typeLabel} — ширина ${formatRuNumber(slatWidthMm)} мм, зазор ${formatRuNumber(slatGapMm)} мм`,
          quantity: round(cleanNeed, 6),
          unit: materialUnit,
          withReserve: round(reservedNeed, 6),
          purchaseQty,
          category: "Заполнение",
          packageInfo: { count: purchaseQty, size: 1, packageUnit },
          subtitle,
          highlight: true,
        },
      ]
      : [];

    const scenario: CalculatorScenario = {
      exact_need: round(reservedNeed, 6),
      purchase_quantity: purchaseQty,
      leftover: round(leftoverUnits, 6),
      assumptions: [
        `formula_version:${WEB_FORMULA_VERSION}`,
        `fence_type:${fenceType}`,
        `net_fill_length_m:${round(netFillLengthM, 6)}`,
        `product_module_m:${round(productModuleM, 6)}`,
        `reserve_percent:${round(coverReservePercent, 3)}`,
        "supporting_structure_not_calculated:true",
      ],
      key_factors: {
        field_multiplier: 1,
        reserve_percent: round(coverReservePercent, 3),
      },
      buy_plan: {
        package_label: fenceType === 0 ? "profiled-sheet" : fenceType === 1 ? "mesh-roll" : "slat-piece",
        package_size: 1,
        packages_count: purchaseQty,
        unit: packageUnit,
      },
    };

    const warnings = [
      "Это предварительный расчёт только рядового заполнения по длине. Разбивка на отдельные пролёты, угловые и перепадные участки, уклон рельефа, раскрой и пригодность остатков не моделируются.",
      `Запас ${formatRuNumber(coverReservePercent)}% задан пользователем и применяется один раз. MIN/REC/MAX и режим точности не добавляют поверх него скрытые множители.`,
      "Опорные стойки, горизонтальные прогоны, фундамент, бетон, крепёж, заглушки, защитные покрытия, проволока, фурнитура и усиление ворот не входят в ведомость: нужны грунты, ветровой район, схема секций, сечения и документация выбранной системы.",
      `Высота заполнения ${formatRuNumber(fenceHeight)} м служит проверочным размером. Длину листа или штакетины и высоту рулона сверяйте с проектом и фактическим товаром.`,
      "Высоту, прозрачность и положение ограждения проверяйте по назначению участка, градостроительным и местным требованиям; калькулятор не подтверждает допустимость размещения.",
    ];

    if (openingsWidthM >= fenceLength) {
      warnings.push("Суммарная ширина ворот, калиток и разрывов не меньше общей длины, поэтому длина рядового заполнения принята равной 0. Проверьте исходные размеры.");
    }

    if (fenceType === 0) {
      warnings.push(`Количество листов рассчитано по рабочей ширине ${formatRuNumber(sheetWorkingWidthMm)} мм. Габаритная ширина, другая марка профиля и боковой нахлёст повторно не добавляются.`);
    } else if (fenceType === 1) {
      warnings.push(`Расчёт предполагает рулон длиной ${formatRuNumber(meshRollLengthM)} м, у которого высота рулона соответствует высоте заполнения ${formatRuNumber(fenceHeight)} м. Натяжение, крепление и вертикальное соединение не рассчитаны.`);
    } else {
      warnings.push("Количество штакетин рассчитано для одного ряда с постоянным зазором. Одностороннюю раскладку нельзя автоматически переносить на двухстороннюю шахматную схему, углы и перепады высоты.");
    }

    return {
      materials,
      totals: {
        fenceLength: round(fenceLength, 6),
        openingsWidthM: round(openingsWidthM, 6),
        openingsWidthUsedM: round(openingsWidthUsedM, 6),
        netFillLengthM: round(netFillLengthM, 6),
        fenceHeight: round(fenceHeight, 6),
        fenceType,
        sheetWorkingWidthMm: round(sheetWorkingWidthMm, 3),
        meshRollLengthM: round(meshRollLengthM, 6),
        slatWidthMm: round(slatWidthMm, 3),
        slatGapMm: round(slatGapMm, 3),
        productModuleM: round(productModuleM, 6),
        cleanNeed: round(cleanNeed, 6),
        coverReservePercent: round(coverReservePercent, 3),
        reservedNeed: round(reservedNeed, 6),
        purchaseQty,
        leftoverUnits: round(leftoverUnits, 6),
        purchasedFillLengthM: round(purchasedFillLengthM, 6),
        minExactNeed: round(reservedNeed, 6),
        recExactNeed: round(reservedNeed, 6),
        maxExactNeed: round(reservedNeed, 6),
        minPurchase: purchaseQty,
        recPurchase: purchaseQty,
        maxPurchase: purchaseQty,
      },
      warnings,
      scenarios: { MIN: scenario, REC: scenario, MAX: scenario },
      formulaVersion: WEB_FORMULA_VERSION,
      canonicalSpecId: fenceSpec.calculator_id,
      practicalNotes: [
        `Чистая длина заполнения: ${formatRuNumber(netFillLengthM)} м после вычета ${formatRuNumber(openingsWidthUsedM)} м проёмов и разрывов.`,
        `Рабочий модуль выбранного заполнения: ${formatRuNumber(productModuleM, 3)} м; чистая потребность: ${cleanNeedLabel} ${materialUnit}.`,
        `С явным запасом ${formatRuNumber(coverReservePercent)}% требуется ${reservedNeedLabel} ${materialUnit}; к покупке ${purchaseQty} ${materialUnit}.`,
        `Купленные единицы дают ${formatRuNumber(purchasedFillLengthM)} м эквивалентной длины. Это не доказывает пригодность раскроя для конкретных пролётов.`,
        "До заказа составьте отдельную ведомость по каждому пролёту и проект несущей части, ворот, калиток и примыканий.",
      ],
      accuracyMode,
      accuracyExplanation: {
        mode: accuracyMode,
        modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
        combinedMultiplier: 1,
        appliedModifiers: [],
        notes: ["Режим точности не меняет закупку заполнения: применяется только явный запас и введённый рабочий модуль товара."],
      },
      summaryCards: [
        {
          icon: "↔",
          label: "Чистая длина",
          value: formatRuNumber(netFillLengthM),
          unit: "м",
          hint: `за вычетом ${formatRuNumber(openingsWidthUsedM)} м проёмов`,
          tone: "violet",
        },
        {
          icon: "▤",
          label: "Чистая потребность",
          value: cleanNeedLabel,
          unit: materialUnit,
          hint: `рабочий модуль ${formatRuNumber(productModuleM, 3)} м`,
          tone: "slate",
        },
        {
          icon: "▣",
          label: "К покупке",
          value: String(purchaseQty),
          unit: fenceType === 0
            ? pluralRu(purchaseQty, "лист", "листа", "листов")
            : fenceType === 1
              ? pluralRu(purchaseQty, "рулон", "рулона", "рулонов")
              : pluralRu(purchaseQty, "штакетина", "штакетины", "штакетин"),
          hint: `${reservedNeedLabel} до округления, запас ${formatRuNumber(coverReservePercent)}%`,
          tone: "amber",
        },
      ],
      materialListBanner: "Ведомость содержит только выбранное рядовое заполнение. Несущая часть, основание, крепёж, защита, ворота и калитки рассчитываются по отдельному проекту и документации системы.",
    };
  },
  formulaDescription: `
**Предварительный расчёт заполнения забора:**
- Чистая длина = общая линия ограждения − суммарная ширина ворот, калиток и разрывов, но не меньше 0.
- Профнастил = чистая длина / рабочая ширина фактического листа.
- Сетка-рабица = чистая длина / фактическая длина рулона подходящей высоты.
- Односторонний штакетник = чистая длина / (ширина штакетины + проектный зазор).
- Потребность с запасом = чистая потребность × (1 + выбранный запас / 100).
- К покупке = округление вверх до целого листа, рулона или штакетины.
- MIN/REC/MAX совпадают: скрытых запасов и конструктивных коэффициентов нет.
- СП 20.13330.2016 задаёт нагрузки и воздействия, а СП 22.13330.2016 — проектирование оснований. Текущий калькулятор не заменяет расчёт несущей части и фундамента ограждения.
  `,
  howToUse: [
    "Измерьте общую линию ограждения до вычета проёмов",
    "Введите суммарную фактическую ширину ворот, калиток и других разрывов",
    "Выберите только тот тип заполнения, который будет установлен на рядовых участках",
    "Перенесите рабочую ширину профлиста, длину рулона или ширину штакетины из фактического товара",
    "Для штакетника задайте проектный зазор одного ряда",
    "Выберите явный запас после раскладки отдельных пролётов",
    "Используйте итог как предварительную закупку заполнения, а несущую систему рассчитайте отдельно",
  ],
  expertTips: [
    {
      title: "Рабочая ширина — не габаритная",
      content: "У профлиста боковой нахлёст уже учтён в рабочей ширине. Перенесите значение из паспорта конкретной марки и не вычитайте нахлёст повторно.",
      author: "Мастерок",
    },
    {
      title: "Сначала разбейте линию на пролёты",
      content: "Общий метраж не показывает углы, перепады рельефа, короткие секции и пригодность остатка. Перед заказом сделайте поштучную раскладку между проектными опорами.",
      author: "Прораб",
    },
  ],
  faq: [
    {
      question: "Почему калькулятор не считает опоры и фундамент?",
      answer: "Их шаг, сечение, заглубление и основание зависят от ветровой нагрузки, парусности заполнения, грунта, рельефа, ворот и узлов системы. Универсальная норма по одной длине может дать небезопасную конструкцию и ложную закупку.",
    },
    {
      question: "Какую ширину профлиста вводить?",
      answer: "Рабочую или полезную ширину из паспорта фактического изделия. Она уже учитывает боковое соединение и обычно меньше габаритной ширины листа.",
    },
    {
      question: "Нужно ли вычитать ворота и калитки?",
      answer: "Да, введите их суммарную проектную ширину вместе с другими разрывами. Но сами створки, рамы, фурнитура и усиление проёмов в результат не входят.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Как рассчитать заполнение забора</h2>
<p>Сначала из общей длины линии ограждения вычитают суммарную ширину ворот, калиток и других разрывов. Полученную чистую длину делят на рабочий модуль выбранного материала:</p>
<ul>
  <li><strong>профнастил:</strong> рабочая ширина листа из паспорта;</li>
  <li><strong>сетка-рабица:</strong> фактическая длина рулона подходящей высоты;</li>
  <li><strong>односторонний штакетник:</strong> ширина изделия плюс проектный зазор.</li>
</ul>
<p>Пользовательский запас применяется один раз, после чего результат округляется вверх до целой покупной единицы. Общая длина не заменяет раскладку по отдельным пролётам.</p>

<h2>Почему рабочая ширина профлиста важна</h2>
<p>Габаритная и рабочая ширина различаются из-за бокового соединения. Например, официальные карточки «Металл Профиль» указывают рабочую ширину 1150 мм для С8 и 1000 мм для С21. Для заказа всегда переносите параметр конкретного артикула.</p>

<h2>Что не входит в расчёт</h2>
<p>Калькулятор не назначает опоры, горизонтальные прогоны, тип и глубину основания, бетон, крепёж, защитные покрытия, натяжную проволоку, фурнитуру и усиление ворот. Для них нужны ветровой район, парусность и высота заполнения, грунты, рельеф, сечения, длины поставки и узлы выбранной системы.</p>

<h2>Нормативная и товарная проверка</h2>
<ul>
  <li><a href="https://protect.gost.ru/sp/details/bac9e1fe-45f1-401b-8e32-949f4ee27821" rel="noopener noreferrer">СП 20.13330.2016 «Нагрузки и воздействия»</a> задаёт нагрузки и их сочетания для расчёта сооружений.</li>
  <li><a href="https://protect.gost.ru/sp/details/71e96332-a446-4a15-87a0-2db895479f61" rel="noopener noreferrer">СП 22.13330.2016 «Основания зданий и сооружений»</a> отделяет проект основания от простой геометрии заполнения.</li>
  <li><a href="https://protect.gost.ru/gost/details/68eb67e6-4c03-4c3b-9395-f88fb627b979" rel="noopener noreferrer">ГОСТ 24045-2016</a> распространяется на стальные гнутые профили для строительства; конкретные размеры и применимость подтверждают по изделию.</li>
  <li><a href="https://protect.gost.ru/sp/details/70e09445-74d2-4fbc-9c40-0f875dcdc590" rel="noopener noreferrer">СП 53.13330.2019</a> относится к планировке и застройке территорий садоводства. Для другого назначения участка и конкретного муниципалитета проверяют применимые местные требования.</li>
  <li><a href="https://krasnoyarsk.metallprofil.ru/shop/catalog/zabor/profilirovannye-listy/s-8x1150/" rel="noopener noreferrer">Официальная карточка С8</a> показывает рабочую ширину 1150 мм, а <a href="https://metallprofil.ru/shop/catalog/krovlya/profilirovannye-listy/s-21/profilirovannyy-list-s21kh1000a-pe01702404--421810/" rel="noopener noreferrer">карточка С21</a> — 1000 мм.</li>
</ul>
`,
    faq: [
      {
        question: "Сколько профлиста нужно на 50 метров забора?",
        answer: "<p>Если общая длина равна 50 м, а ворота, калитка и разрывы занимают 5 м, чистая длина заполнения составляет 45 м. При рабочей ширине С8 1150 мм точная потребность равна 45 / 1,15 = <strong>39,13 листа</strong>, поэтому без дополнительного запаса к покупке нужно <strong>40 листов</strong>. При рабочей ширине С21 1000 мм получится <strong>45 листов</strong>.</p>",
      },
      {
        question: "Как учитывать запас профлиста на забор?",
        answer: "<p>Универсальный процент не подставляется. Сначала разложите листы по отдельным пролётам, проверьте углы, рельеф, короткие секции, пригодность обрезков, риск повреждений и возможность докупить ту же партию. Затем выберите в форме свой запас — он применяется один раз.</p>",
      },
      {
        question: "Можно ли по длине забора рассчитать несущую часть?",
        answer: "<p>Нет. Одна длина не задаёт ветровую нагрузку, парусность заполнения, грунты, рельеф, сечения, основание и усиление проёмов. Эти позиции требуют отдельного проекта; калькулятор показывает только предварительное количество рядового заполнения.</p>",
      },
    ],
  },
};
