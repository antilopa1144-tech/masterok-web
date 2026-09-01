import type { CalculatorDefinition, CalculatorScenario, MaterialResult } from "../types";
import { withSiteMetaTitle } from "../meta";
import { ACCURACY_MODE_LABELS, DEFAULT_ACCURACY_MODE, type AccuracyMode } from "../../../../engine/accuracy";
import sidingSpec from "../../../../configs/calculators/siding-canonical.v1.json";

const WEB_FORMULA_VERSION = "siding-web-panel-area-v2";

const SIDING_TYPE_LABELS: Record<number, string> = {
  0: "Виниловый сайдинг",
  1: "Металлический сайдинг",
  2: "Фиброцементный сайдинг",
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const clampInteger = (value: number, min: number, max: number): number =>
  Math.round(clamp(value, min, max));

const round = (value: number, digits = 3): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

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

export const sidingDef: CalculatorDefinition = {
  id: "exterior_siding",
  slug: "sayding",
  formulaVersion: WEB_FORMULA_VERSION,
  title: "Калькулятор сайдинга",
  h1: "Калькулятор сайдинга онлайн — расчёт количества панелей",
  description: "Рассчитайте предварительное количество панелей сайдинга по чистой площади фасада, рабочим размерам выбранного изделия, явному запасу и фактической упаковке.",
  metaTitle: withSiteMetaTitle("Калькулятор сайдинга: расчёт панелей"),
  metaDescription: "Бесплатный калькулятор сайдинга: рассчитайте количество панелей по площади фасада, рабочей длине и ширине, выбранному запасу и упаковке.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["сайдинг", "виниловый сайдинг", "металлический сайдинг", "фиброцементный сайдинг", "фасад", "облицовка"],
  popularity: 70,
  complexity: 2,
  fields: [
    {
      key: "facadeArea",
      label: "Площадь фасада до вычета проёмов",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 1000,
      step: 1,
      defaultValue: 150,
      hint: "Сложите площади всех прямоугольных и треугольных участков, которые будут облицованы выбранным изделием.",
    },
    {
      key: "openingsArea",
      label: "Суммарная площадь окон и дверей",
      type: "slider",
      unit: "м²",
      min: 0,
      max: 1000,
      step: 1,
      defaultValue: 20,
      hint: "Вычитается только площадь. Периметры, откосы, отливы и обрамление каждого проёма по этой величине не определяются.",
    },
    {
      key: "sidingType",
      label: "Тип выбранной облицовки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Виниловый сайдинг" },
        { value: 1, label: "Металлический сайдинг" },
        { value: 2, label: "Фиброцементный сайдинг" },
      ],
      hint: "Тип меняет подпись результата, но не подставляет универсальные размеры, крепёж или подсистему. Введите рабочие размеры фактического артикула ниже.",
      fullWidth: true,
    },
    {
      key: "panelLengthM",
      label: "Рабочая длина одной панели",
      type: "number",
      unit: "м",
      min: 0.5,
      max: 12,
      step: 0.01,
      defaultValue: 3.66,
      hint: "Используйте рабочую длину из технического листа или схемы раскроя, а не автоматически принятую длину другого профиля.",
    },
    {
      key: "panelWorkingWidthMm",
      label: "Рабочая ширина одной панели",
      type: "number",
      unit: "мм",
      min: 50,
      max: 1200,
      step: 1,
      defaultValue: 200,
      hint: "Нужна полезная ширина после замкового соединения или нахлёста. Номинальная габаритная ширина может отличаться.",
    },
    {
      key: "reservePct",
      label: "Ваш запас на подрезку и партию",
      type: "select",
      unit: "%",
      defaultValue: 10,
      options: [
        { value: 0, label: "0% — чистая площадь" },
        { value: 5, label: "5%" },
        { value: 10, label: "10%" },
        { value: 15, label: "15%" },
        { value: 20, label: "20%" },
      ],
      hint: "Это явное пользовательское допущение, а не универсальная норма. Оцените стены, фронтоны, рисунок стыков, повторное использование обрезков и требование одной партии.",
    },
    {
      key: "panelsPerPack",
      label: "Панелей в упаковке у поставщика",
      type: "number",
      unit: "шт",
      min: 0,
      max: 500,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
      hint: "Введите фактическую кратность упаковки. Оставьте 0, если панели продаются поштучно или упаковка ещё не известна.",
      fullWidth: true,
    },
  ],
  calculate(inputs) {
    const facadeArea = clamp(Number(inputs.facadeArea ?? 150), 1, 1000);
    const openingsArea = clamp(Number(inputs.openingsArea ?? 20), 0, 1000);
    const sidingType = clampInteger(Number(inputs.sidingType ?? 0), 0, 2);
    const panelLengthM = clamp(Number(inputs.panelLengthM ?? 3.66), 0.5, 12);
    const panelWorkingWidthMm = clamp(Number(inputs.panelWorkingWidthMm ?? 200), 50, 1200);
    const reservePct = clamp(Number(inputs.reservePct ?? 10), 0, 20);
    const panelsPerPack = clampInteger(Number(inputs.panelsPerPack ?? 0), 0, 500);

    const openingsAreaUsed = Math.min(openingsArea, facadeArea);
    const netArea = Math.max(0, facadeArea - openingsAreaUsed);
    const panelWorkingArea = panelLengthM * panelWorkingWidthMm / 1000;
    const cleanPanelNeed = panelWorkingArea > 0 ? netArea / panelWorkingArea : 0;
    const reservedPanelNeed = cleanPanelNeed * (1 + reservePct / 100);
    const piecesWithoutPackaging = Math.ceil(reservedPanelNeed);
    const packsToBuy = panelsPerPack > 0 && reservedPanelNeed > 0
      ? Math.ceil(reservedPanelNeed / panelsPerPack)
      : 0;
    const panelsToBuy = panelsPerPack > 0
      ? packsToBuy * panelsPerPack
      : piecesWithoutPackaging;
    const leftoverPanels = Math.max(0, panelsToBuy - reservedPanelNeed);
    const purchasedCoverageArea = panelsToBuy * panelWorkingArea;
    const sidingLabel = SIDING_TYPE_LABELS[sidingType] ?? SIDING_TYPE_LABELS[0];

    const requestedAccuracyMode = inputs.accuracyMode as unknown as AccuracyMode | undefined;
    const accuracyMode = requestedAccuracyMode && requestedAccuracyMode in ACCURACY_MODE_LABELS
      ? requestedAccuracyMode
      : DEFAULT_ACCURACY_MODE;

    const materials: MaterialResult[] = [
      {
        name: `${sidingLabel} — предварительно по рабочей площади панели`,
        quantity: round(cleanPanelNeed, 6),
        unit: "шт",
        withReserve: round(reservedPanelNeed, 6),
        purchaseQty: panelsToBuy,
        category: "Облицовка",
        packageInfo: panelsPerPack > 0 && panelsToBuy > 0
          ? { count: packsToBuy, size: panelsPerPack, packageUnit: "упаковок" }
          : undefined,
        subtitle: panelsPerPack > 0
          ? `${formatRuNumber(netArea)} м² / ${formatRuNumber(panelWorkingArea, 4)} м² × ${formatRuNumber(1 + reservePct / 100, 2)} = ${formatRuNumber(reservedPanelNeed)} шт; ${packsToBuy} ${pluralRu(packsToBuy, "упаковка", "упаковки", "упаковок")} × ${panelsPerPack} = ${panelsToBuy} шт`
          : `${formatRuNumber(netArea)} м² / ${formatRuNumber(panelWorkingArea, 4)} м² × ${formatRuNumber(1 + reservePct / 100, 2)} = ${formatRuNumber(reservedPanelNeed)} шт; округление вверх даёт ${panelsToBuy} шт`,
        highlight: true,
      },
    ];

    const scenarioExactNeed = panelsPerPack > 0
      ? reservedPanelNeed / panelsPerPack
      : reservedPanelNeed;
    const scenarioPurchaseQuantity = panelsPerPack > 0 ? packsToBuy : panelsToBuy;
    const scenario: CalculatorScenario = {
      exact_need: round(scenarioExactNeed, 6),
      purchase_quantity: scenarioPurchaseQuantity,
      leftover: round(Math.max(0, scenarioPurchaseQuantity - scenarioExactNeed), 6),
      assumptions: [
        `formula_version:${WEB_FORMULA_VERSION}`,
        `siding_type:${sidingType}`,
        `panel_length_m:${panelLengthM}`,
        `panel_working_width_mm:${panelWorkingWidthMm}`,
        `reserve_pct:${reservePct}`,
        `panels_per_pack:${panelsPerPack}`,
        "wall_by_wall_layout_not_calculated:true",
      ],
      key_factors: { field_multiplier: 1 },
      buy_plan: {
        package_label: panelsPerPack > 0 ? `pack-${panelsPerPack}-panels` : "siding-panel-piece",
        package_size: panelsPerPack > 0 ? panelsPerPack : 1,
        packages_count: scenarioPurchaseQuantity,
        unit: panelsPerPack > 0 ? "упаковок" : "шт",
      },
    };

    const warnings = [
      `Расчёт делит чистую площадь фасада на рабочую площадь панели ${formatRuNumber(panelLengthM)} × ${formatRuNumber(panelWorkingWidthMm)} мм. Номинальные размеры, замки и нахлёсты другого профиля не подставляются.`,
      "Это предварительная площадная оценка, а не раскладка по каждой стене и ряду. Фронтоны, углы, переходы, длины стен, смещение стыков и повторное использование обрезков могут изменить закупку.",
      `Запас ${formatRuNumber(reservePct)}% выбран пользователем. MIN/REC/MAX и режим точности не добавляют поверх него скрытые коэффициенты.`,
      "Доборные профили, углы, обрамление проёмов, отливы, подсистема, крепёж, мембрана, утепление и герметики не рассчитаны: их типы, проектные длины, узлы, основание и номенклатура конкретной системы не вводятся.",
      `Тип «${sidingLabel}» задаёт только подпись результата. Рабочие размеры, допустимый раскрой, крепёж, шаг и материал подсистемы сверяйте с технической документацией конкретного изделия и проектом фасада.`,
    ];

    if (openingsArea >= facadeArea) {
      warnings.push("Площадь проёмов не меньше площади фасада, поэтому чистая площадь облицовки принята равной 0. Проверьте исходные площади.");
    }

    if (panelsPerPack === 0) {
      warnings.push("Кратность упаковки не введена: итог округлён только до целой панели. До заказа уточните упаковку, минимальную партию, тон/покрытие и возможность докупить тот же выпуск.");
    }

    const practicalNotes = [
      `Чистая площадь фасада: ${formatRuNumber(netArea)} м² после вычета ${formatRuNumber(openingsAreaUsed)} м² проёмов.`,
      `Рабочая площадь введённой панели: ${formatRuNumber(panelWorkingArea, 4)} м²; чистая потребность: ${formatRuNumber(cleanPanelNeed)} шт.`,
      `С явным запасом ${formatRuNumber(reservePct)}% требуется ${formatRuNumber(reservedPanelNeed)} шт до товарного округления; к покупке ${panelsToBuy} шт.`,
      `Эквивалентная рабочая площадь купленных панелей: ${formatRuNumber(purchasedCoverageArea)} м². Она не доказывает, что обрезки подходят к фактической раскладке стен.`,
      "Для ведомости доборов сначала сделайте фасадную развёртку: отдельно измерьте старт, завершение, наружные и внутренние углы, каждый проём, стыковочные зоны, отливы и примыкания.",
    ];

    return {
      materials,
      totals: {
        facadeArea: round(facadeArea),
        openingsArea: round(openingsArea),
        openingsAreaUsed: round(openingsAreaUsed),
        netArea: round(netArea, 6),
        sidingType,
        panelLengthM: round(panelLengthM, 6),
        panelWorkingWidthMm: round(panelWorkingWidthMm),
        panelWorkingArea: round(panelWorkingArea, 6),
        cleanPanelNeed: round(cleanPanelNeed, 6),
        reservePct: round(reservePct),
        reservedPanelNeed: round(reservedPanelNeed, 6),
        panelsPerPack,
        packsToBuy,
        panelsToBuy,
        leftoverPanels: round(leftoverPanels, 6),
        purchasedCoverageArea: round(purchasedCoverageArea, 6),
        minExactNeed: round(reservedPanelNeed, 6),
        recExactNeed: round(reservedPanelNeed, 6),
        maxExactNeed: round(reservedPanelNeed, 6),
        minPurchase: panelsToBuy,
        recPurchase: panelsToBuy,
        maxPurchase: panelsToBuy,
      },
      warnings,
      scenarios: { MIN: scenario, REC: scenario, MAX: scenario },
      formulaVersion: WEB_FORMULA_VERSION,
      canonicalSpecId: sidingSpec.calculator_id,
      practicalNotes,
      accuracyMode,
      accuracyExplanation: {
        mode: accuracyMode,
        modeLabel: ACCURACY_MODE_LABELS[accuracyMode],
        combinedMultiplier: 1,
        appliedModifiers: [],
        notes: ["Режим точности не меняет панели; применяется только явно выбранный запас и введённая кратность упаковки."],
      },
      summaryCards: [
        {
          icon: "▦",
          label: "Чистая площадь",
          value: formatRuNumber(netArea),
          unit: "м²",
          hint: `за вычетом ${formatRuNumber(openingsAreaUsed)} м² проёмов`,
          tone: "violet",
        },
        {
          icon: "▣",
          label: "К покупке",
          value: panelsPerPack > 0 ? String(packsToBuy) : String(panelsToBuy),
          unit: panelsPerPack > 0
            ? pluralRu(packsToBuy, "упаковка", "упаковки", "упаковок")
            : pluralRu(panelsToBuy, "панель", "панели", "панелей"),
          hint: panelsPerPack > 0
            ? `${panelsToBuy} панелей, по ${panelsPerPack} в упаковке`
            : `${formatRuNumber(reservedPanelNeed)} шт с запасом ${formatRuNumber(reservePct)}%`,
          tone: "amber",
        },
        {
          icon: "⚠",
          label: "Раскладка и система",
          value: "Не рассчитаны",
          hint: "нужны развёртка стен и документация выбранного изделия",
          tone: "slate",
        },
      ],
      materialListBanner: "Ведомость содержит только панели сайдинга по рабочей площади и введённой упаковке. Доборы, подсистема, крепёж и слои фасада в неё не входят.",
    };
  },
  formulaDescription: `
**Предварительный расчёт панелей сайдинга по площади:**
- Чистая площадь = площадь фасада − площадь проёмов, но не меньше 0.
- Рабочая площадь панели = введённая рабочая длина × введённая рабочая ширина.
- Чистая потребность = чистая площадь / рабочая площадь панели.
- Потребность с запасом = чистая потребность × (1 + выбранный запас / 100).
- К покупке = округление вверх до целой панели либо до введённой кратности упаковки.
- MIN/REC/MAX совпадают: скрытые полевые множители не применяются.
- СП 522.1325800.2023 регулирует проектирование, производство работ и эксплуатацию навесных вентилируемых фасадных систем, а СП 518.1311500.2022 — их пожарную безопасность. Текущий площадной калькулятор не выполняет эти проектные расчёты.
  `,
  howToUse: [
    "Введите площадь всех участков фасада до вычета проёмов",
    "Укажите суммарную площадь окон и дверей",
    "Выберите тип облицовки только для понятной подписи результата",
    "Введите рабочие длину и ширину фактической панели по техническому листу",
    "Выберите свой запас после оценки фасадной раскладки — скрытый процент не добавляется",
    "Если поставщик продаёт упаковками, введите фактическое число панелей в упаковке",
    "Используйте итог как предварительное количество панелей и отдельно составьте проектную ведомость доборов и подсистемы",
  ],
  expertTips: [
    {
      title: "Рабочая ширина важнее габаритной",
      content: "Замок или нахлёст уменьшает закрываемую ширину. Возьмите рабочую площадь из технического листа конкретного профиля и не переносите размеры похожей коллекции.",
      author: "Мастерок",
    },
    {
      title: "Разложите каждую стену отдельно",
      content: "Площадной эквивалент не показывает ряды, фронтоны, стыки и пригодность обрезков. Перед заказом сделайте развёртку стен и проверьте требование одной партии или оттенка.",
      author: "Прораб",
    },
  ],
  faq: [
    {
      question: "Почему калькулятор просит рабочие размеры панели?",
      answer: "Габаритная ширина и закрываемая после замка или нахлёста ширина могут отличаться. Кроме того, длины и профили разных коллекций неуниверсальны. Поэтому расчёт использует размеры фактического артикула, введённые пользователем.",
    },
    {
      question: "Какой запас сайдинга выбрать?",
      answer: "Единого обязательного процента нет. Оцените форму стен и фронтонов, число коротких участков, направление и смещение стыков, возможность использовать обрезки, риск повреждений и доступность той же партии. Выбранные 0–20% остаются явным допущением пользователя.",
    },
    {
      question: "Почему нет автоматического расчёта стартовых планок, углов и J-профилей?",
      answer: "Суммарная площадь проёмов не содержит их числа, ширины, высоты и глубины откосов. Номенклатура доборов и места их применения зависят от конкретного профиля и узлов системы. Нужна фасадная развёртка с отдельными проектными длинами.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Как калькулятор считает панели сайдинга</h2>
<p>Сначала из общей площади фасада вычитается суммарная площадь окон и дверей. Затем чистая площадь делится на рабочую площадь одной панели:</p>
<p><strong>S<sub>панели</sub> = L<sub>раб</sub> × B<sub>раб</sub></strong></p>
<p><strong>N<sub>чист</sub> = S<sub>нетто</sub> / S<sub>панели</sub></strong></p>
<p><strong>N<sub>запас</sub> = N<sub>чист</sub> × (1 + R / 100)</strong></p>
<ul>
  <li><strong>L<sub>раб</sub></strong> и <strong>B<sub>раб</sub></strong> — рабочие, а не обязательно габаритные размеры фактического изделия;</li>
  <li><strong>R</strong> — запас, явно выбранный пользователем после оценки раскладки;</li>
  <li>при введённой упаковке результат округляется вверх до целого числа упаковок.</li>
</ul>

<h2>Почему площади недостаточно для готового заказа</h2>
<p>Деление площади на площадь панели даёт только эквивалентное количество. Оно не знает длины отдельных стен, число рядов, фронтоны, ориентацию панелей, смещение стыков, места H-профилей и возможность перенести обрезок на другой участок.</p>
<p>Для окончательного заказа каждую стену раскладывают по рядам в рабочем модуле выбранной панели. Запас выбирают после этой раскладки, а не считают обязательными универсальными 10%.</p>

<h2>Что не входит в ведомость</h2>
<ul>
  <li>стартовые, финишные, J-, H- и околооконные профили, углы и отливы;</li>
  <li>деревянная или металлическая подсистема, кронштейны и выравнивание;</li>
  <li>крепёж панелей и подсистемы;</li>
  <li>утеплитель, мембраны, вентиляционный зазор и противопожарные решения;</li>
  <li>герметизация и узлы примыканий.</li>
</ul>
<p>Эти позиции нельзя достоверно получить из общей площади, периметра здания и числа углов. Нужны фасадная развёртка, основание, нагрузки, выбранная система и техническая документация её элементов.</p>

<h2>Проектные документы и инструкции изделий</h2>
<ul>
  <li><a href="https://protect.gost.ru/sp/details/dbc01349-d0b9-4fe7-a2f6-e4534ff53704" rel="noopener noreferrer">СП 522.1325800.2023 «Системы фасадные навесные вентилируемые»</a> — правила проектирования, производства работ и эксплуатации; на официальной карточке зарегистрировано изменение № 1.</li>
  <li><a href="https://protect.gost.ru/sp/details/8bcea61b-6982-4201-9f1e-7caa08553ad4" rel="noopener noreferrer">СП 518.1311500.2022 «Навесные фасадные системы с воздушным зазором»</a> — требования пожарной безопасности при монтаже, эксплуатации и ремонте.</li>
  <li><a href="https://www.docke.ru/info/pdf/instructions/siding/" rel="noopener noreferrer">Официальная инструкция Döcke по монтажу сайдинга</a> показывает продуктовые профили, узлы проёмов, стыки и требования к обрешётке именно этой системы.</li>
  <li><a href="https://www.grandline.ru/uploads/files/Instrukcii_vse/Instrukcii-po-montazu-profilirovannyh-izdelij/instruction_b_house_new.pdf" rel="noopener noreferrer">Официальная инструкция Grand Line для металлического сайдинга</a> задаёт собственные панели, доборные элементы, зазоры и крепление.</li>
</ul>
<p>Различия первичных инструкций подтверждают, что один фиксированный шаг подсистемы, тип самореза, длина добора или схема проёма не могут автоматически применяться к виниловому, металлическому и фиброцементному сайдингу одновременно.</p>
`,
    faq: [
      {
        question: "Сколько панелей 3,66×0,20 м нужно на фасад 130 м²?",
        answer: "<p>Рабочая площадь панели равна 3,66 × 0,20 = 0,732 м&sup2;. Чистый площадной эквивалент — 130 / 0,732 = 177,596 панели. При явно выбранном запасе 10% получается 195,355 панели, то есть 196 штук при поштучной продаже. Стеновая раскладка может изменить итог.</p>",
      },
      {
        question: "Можно ли вычесть всю площадь окон и дверей?",
        answer: "<p>Калькулятор вычитает её из площади облицовки, но не считает обрамление. На небольших проёмах обрезки могут оказаться непригодны, а доборные элементы требуют отдельных периметров и глубин откосов. Проверьте каждый проём на фасадной развёртке.</p>",
      },
      {
        question: "Как перевести панели сайдинга в упаковки?",
        answer: "<p>Введите фактическое число панелей в упаковке из предложения поставщика. Калькулятор округлит потребность с выбранным запасом вверх до целых упаковок и покажет общее число поставляемых панелей и площадной остаток.</p>",
      },
    ],
  },
};
