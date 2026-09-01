import type { CalculatorDefinition, CalculatorScenario, MaterialResult } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalFoamBlocks } from "../../../../engine/foam-blocks";
import { ACCURACY_MODE_LABELS, DEFAULT_ACCURACY_MODE } from "../../../../engine/accuracy";
import foamblocksSpec from "../../../../configs/calculators/foam-blocks-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

interface BlockSizeDefinition {
  lengthMm: number;
  heightMm: number;
  thicknessMm: number;
  label: string;
}

const BLOCK_SIZES: Record<number, BlockSizeDefinition> = {
  0: { lengthMm: 600, heightMm: 300, thicknessMm: 200, label: "Пенобетонный блок 600×300×200 мм" },
  1: { lengthMm: 600, heightMm: 300, thicknessMm: 100, label: "Пенобетонный блок 600×300×100 мм" },
  2: { lengthMm: 390, heightMm: 190, thicknessMm: 188, label: "Керамзитобетонный стеновой камень 390×190×188 мм" },
  3: { lengthMm: 390, heightMm: 190, thicknessMm: 90, label: "Керамзитобетонный стеновой камень 390×190×90 мм" },
};

const WEB_FORMULA_VERSION = "foam-blocks-web-geometry-v2";

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

export const foamBlocksDef: CalculatorDefinition = {
  id: "foam_blocks",
  slug: "penobloki",
  title: "Калькулятор пеноблоков и керамзитоблоков",
  h1: "Калькулятор пеноблоков онлайн — расчёт количества блоков",
  description: "Рассчитайте предварительное количество пеноблоков или керамзитобетонных стеновых камней по площади стены, проёмам, размеру и явному запасу.",
  metaTitle: withSiteMetaTitle("Калькулятор пеноблоков и керамзитоблоков"),
  metaDescription: "Бесплатный калькулятор пеноблоков и керамзитоблоков: рассчитайте количество блоков по площади стены, проёмам, размеру и выбранному запасу.",
  category: "walls",
  categorySlug: "steny",
  tags: ["пеноблок", "керамзитоблок", "кладка", "стеновые блоки", "расчёт блоков"],
  popularity: 76,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По размерам стены" },
        { value: 1, label: "По площади" },
      ],
    },
    {
      key: "wallLength",
      label: "Суммарная длина стен",
      type: "slider",
      unit: "м",
      min: 1,
      max: 100,
      step: 0.5,
      defaultValue: 10,
      group: "bySize",
      hint: "Сложите длины всех участков, которые будут выполнены выбранным блоком.",
    },
    {
      key: "wallHeight",
      label: "Высота стены",
      type: "slider",
      unit: "м",
      min: 1,
      max: 5,
      step: 0.1,
      defaultValue: 2.7,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь стен до вычета проёмов",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 27,
      group: "byArea",
    },
    {
      key: "openingsArea",
      label: "Суммарная площадь проёмов",
      type: "slider",
      unit: "м²",
      min: 0,
      max: 50,
      step: 0.5,
      defaultValue: 5,
      hint: "Вычитается только площадь. Количество, ширина и опирание перемычек по этой величине не определяются.",
      fullWidth: true,
    },
    {
      key: "blockSize",
      label: "Фактический размер выбранного блока",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Пенобетонный 600×300×200 мм" },
        { value: 1, label: "Пенобетонный 600×300×100 мм" },
        { value: 2, label: "Керамзитобетонный 390×190×188 мм" },
        { value: 3, label: "Керамзитобетонный 390×190×90 мм" },
      ],
      hint: "Размер не определяет несущую способность, теплоизоляцию или область применения. Сверьте тип, размеры, класс прочности и паспорт фактического изделия.",
      fullWidth: true,
    },
    {
      key: "reservePct",
      label: "Ваш запас на подрезку и бой",
      type: "select",
      unit: "%",
      defaultValue: 5,
      options: [
        { value: 0, label: "0% — чистая геометрия" },
        { value: 5, label: "5%" },
        { value: 10, label: "10%" },
        { value: 15, label: "15%" },
      ],
      hint: "Это явное пользовательское допущение, а не обязательная норма. Скрытый дополнительный коэффициент не применяется.",
    },
    {
      key: "blocksPerPallet",
      label: "Блоков на поддоне у поставщика",
      type: "number",
      unit: "шт",
      min: 0,
      max: 500,
      step: 1,
      integerOnly: true,
      defaultValue: 0,
      hint: "Введите фактическую кратность упаковки из предложения поставщика. Оставьте 0, чтобы получить закупку только в штуках.",
      fullWidth: true,
    },
  ],
  calculate(inputs) {
    const canonical = computeCanonicalFoamBlocks(
      foamblocksSpec as any,
      inputs,
      defaultFactorTables.factors as any,
    );
    const accuracyMode = canonical.accuracyMode ?? DEFAULT_ACCURACY_MODE;

    const inputMode = clampInteger(Number(inputs.inputMode ?? 0), 0, 1);
    const wallLength = clamp(Number(inputs.wallLength ?? 10), 1, 100);
    const wallHeight = clamp(Number(inputs.wallHeight ?? 2.7), 1, 5);
    const enteredArea = clamp(Number(inputs.area ?? 27), 1, 500);
    const openingsArea = clamp(Number(inputs.openingsArea ?? 5), 0, 500);
    const blockSize = clampInteger(Number(inputs.blockSize ?? 0), 0, 3);
    const reservePct = clamp(Number(inputs.reservePct ?? 5), 0, 20);
    const blocksPerPallet = clampInteger(Number(inputs.blocksPerPallet ?? 0), 0, 500);

    const block = BLOCK_SIZES[blockSize] ?? BLOCK_SIZES[0];
    const wallArea = inputMode === 0 ? wallLength * wallHeight : enteredArea;
    const openingsAreaUsed = Math.min(openingsArea, wallArea);
    const netArea = Math.max(0, wallArea - openingsAreaUsed);
    const blockFaceArea = (block.lengthMm / 1000) * (block.heightMm / 1000);
    const cleanBlockNeed = blockFaceArea > 0 ? netArea / blockFaceArea : 0;
    const reservedBlockNeed = cleanBlockNeed * (1 + reservePct / 100);
    const piecesWithoutPackaging = Math.ceil(reservedBlockNeed);
    const palletsToBuy = blocksPerPallet > 0 && reservedBlockNeed > 0
      ? Math.ceil(reservedBlockNeed / blocksPerPallet)
      : 0;
    const blocksToBuy = blocksPerPallet > 0
      ? palletsToBuy * blocksPerPallet
      : piecesWithoutPackaging;
    const leftoverBlocks = Math.max(0, blocksToBuy - reservedBlockNeed);
    const cleanWallVolume = netArea * block.thicknessMm / 1000;

    const materials: MaterialResult[] = [
      {
        name: `${block.label} — предварительно по площади`,
        quantity: round(cleanBlockNeed),
        unit: "шт",
        withReserve: round(reservedBlockNeed),
        purchaseQty: blocksToBuy,
        category: "Блоки",
        packageInfo: blocksPerPallet > 0
          ? { count: palletsToBuy, size: blocksPerPallet, packageUnit: "поддонов" }
          : undefined,
        subtitle: blocksPerPallet > 0
          ? `${formatRuNumber(netArea)} м² / ${formatRuNumber(blockFaceArea, 4)} м² × ${formatRuNumber(1 + reservePct / 100, 2)} = ${formatRuNumber(reservedBlockNeed)} шт; ${palletsToBuy} ${pluralRu(palletsToBuy, "поддон", "поддона", "поддонов")} × ${blocksPerPallet} = ${blocksToBuy} шт. Швы и порядная раскладка не моделируются`
          : `${formatRuNumber(netArea)} м² / ${formatRuNumber(blockFaceArea, 4)} м² × ${formatRuNumber(1 + reservePct / 100, 2)} = ${formatRuNumber(reservedBlockNeed)} шт; округление вверх даёт ${blocksToBuy}. Швы и порядная раскладка не моделируются`,
        highlight: true,
      },
    ];

    const scenarioExactNeed = blocksPerPallet > 0
      ? reservedBlockNeed / blocksPerPallet
      : reservedBlockNeed;
    const scenarioPurchaseQuantity = blocksPerPallet > 0 ? palletsToBuy : blocksToBuy;
    const scenarioLeftover = Math.max(0, scenarioPurchaseQuantity - scenarioExactNeed);

    const scenario: CalculatorScenario = {
      exact_need: round(scenarioExactNeed, 6),
      purchase_quantity: scenarioPurchaseQuantity,
      leftover: round(scenarioLeftover, 6),
      assumptions: [
        `formula_version:${WEB_FORMULA_VERSION}`,
        `block_size:${blockSize}`,
        `reserve_pct:${reservePct}`,
        `blocks_per_pallet:${blocksPerPallet}`,
        "joints_not_modelled:true",
        "layout_not_calculated:true",
      ],
      key_factors: { field_multiplier: 1 },
      buy_plan: {
        package_label: blocksPerPallet > 0 ? `pallet-${blocksPerPallet}-blocks` : "block-piece",
        package_size: blocksPerPallet > 0 ? blocksPerPallet : 1,
        packages_count: blocksPerPallet > 0 ? palletsToBuy : blocksToBuy,
        unit: blocksPerPallet > 0 ? "поддонов" : "шт",
      },
    };

    const warnings = [
      `Расчёт выполнен делением чистой площади кладки на площадь лицевой грани блока ${block.lengthMm}×${block.heightMm} мм. Толщина и рисунок швов, перевязка, доборные элементы и порядная раскладка не моделируются.`,
      `Запас ${formatRuNumber(reservePct)}% выбран пользователем и не является нормативом. MIN/REC/MAX и режим точности не добавляют поверх него скрытые коэффициенты.`,
      "Кладочный состав не рассчитан: тип смеси, допустимая толщина шва, фактический расход и фасовка зависят от геометрии блока, основания, температуры и техкарты конкретного продукта.",
      "Армирование, кладочная сетка, перемычки и U-блоки, анкеровка, связи и армопояса не рассчитаны. Их необходимость, материал, сечение, шаг, длину и опирание назначают по проекту и техническому решению для конкретной стены и проёмов.",
      "Размер блока сам по себе не подтверждает несущую способность, этажность или теплозащиту. Нужны фактический класс прочности и плотность изделия, нагрузки, конструктивная схема, климат, влажностный режим и расчёт стены.",
    ];

    if (openingsArea >= wallArea) {
      warnings.push("Площадь проёмов не меньше площади стены, поэтому чистая площадь кладки принята равной 0. Проверьте исходные размеры.");
    }

    if (blocksPerPallet === 0) {
      warnings.push("Кратность поддона не введена: итог округлён только до целого блока. Перед заказом уточните фактическую упаковку, минимальную партию, повреждённые блоки и условия возврата у поставщика.");
    }

    const practicalNotes = [
      `Чистая площадь кладки: ${formatRuNumber(netArea)} м²; чистая потребность по лицевой грани: ${formatRuNumber(cleanBlockNeed)} шт.`,
      `Явный запас ${formatRuNumber(reservePct)}% даёт ${formatRuNumber(reservedBlockNeed)} шт до товарного округления. Этот процент не является нормативом.`,
      `Геометрический объём блоков без учёта швов: ${formatRuNumber(cleanWallVolume)} м³ при толщине ${block.thicknessMm} мм.`,
      "Кладочную систему, первый ряд, швы, армирование, перемычки, связи, опирание и теплозащиту проверяют по проекту и документации фактических изделий.",
    ];

    return {
      materials,
      totals: {
        inputMode,
        wallLength: round(wallLength),
        wallHeight: round(wallHeight),
        wallArea: round(wallArea),
        openingsArea: round(openingsArea),
        openingsAreaUsed: round(openingsAreaUsed),
        netArea: round(netArea),
        blockSize,
        blockL: block.lengthMm,
        blockH: block.heightMm,
        blockT: block.thicknessMm,
        blockFaceArea: round(blockFaceArea, 6),
        cleanWallVolume: round(cleanWallVolume, 6),
        cleanBlockNeed: round(cleanBlockNeed, 6),
        reservePct: round(reservePct),
        reservedBlockNeed: round(reservedBlockNeed, 6),
        blocksPerPallet,
        palletsToBuy,
        blocksToBuy,
        leftoverBlocks: round(leftoverBlocks, 6),
        minExactNeedBlocks: round(reservedBlockNeed, 6),
        recExactNeedBlocks: round(reservedBlockNeed, 6),
        maxExactNeedBlocks: round(reservedBlockNeed, 6),
        minPurchaseBlocks: blocksToBuy,
        recPurchaseBlocks: blocksToBuy,
        maxPurchaseBlocks: blocksToBuy,
      },
      warnings,
      scenarios: { MIN: scenario, REC: scenario, MAX: scenario },
      formulaVersion: WEB_FORMULA_VERSION,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes,
      accuracyMode,
      accuracyExplanation: {
        mode: accuracyMode,
        modeLabel: canonical.accuracyExplanation?.modeLabel ?? ACCURACY_MODE_LABELS[accuracyMode],
        combinedMultiplier: 1,
        appliedModifiers: [],
        notes: ["Режим точности не меняет число блоков; применяется только явно выбранный запас и введённая кратность поддона."],
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
          value: blocksPerPallet > 0 ? String(palletsToBuy) : String(blocksToBuy),
          unit: blocksPerPallet > 0
            ? pluralRu(palletsToBuy, "поддон", "поддона", "поддонов")
            : pluralRu(blocksToBuy, "блок", "блока", "блоков"),
          hint: blocksPerPallet > 0
            ? `${blocksToBuy} блоков, по ${blocksPerPallet} на поддоне; запас ${formatRuNumber(reservePct)}%`
            : `${formatRuNumber(reservedBlockNeed)} шт с запасом ${formatRuNumber(reservePct)}%, округлено вверх`,
          tone: "amber",
        },
        {
          icon: "⚠",
          label: "Система кладки",
          value: "По проекту",
          hint: "смесь, армирование, перемычки и теплозащита не рассчитаны",
          tone: "slate",
        },
      ],
      materialListBanner: "Ведомость содержит только блоки по геометрии стены и введённой кратности поддона. Кладочный состав и конструктивные элементы в неё не входят.",
    };
  },
  formulaDescription: `
**Предварительный расчёт пеноблоков и бетонных стеновых камней:**
- Чистая площадь = площадь стен − площадь проёмов, но не меньше 0.
- Чистая потребность = чистая площадь / (длина блока × высота блока).
- Потребность с запасом = чистая потребность × (1 + выбранный запас / 100).
- К покупке = округление вверх до целого блока либо до введённой пользователем кратности поддона.
- MIN/REC/MAX совпадают: поверх явного запаса скрытые полевые множители не применяются.
- ГОСТ 21520-89 и ГОСТ 6133-2026 устанавливают требования к соответствующим изделиям, а не универсальный шаг армирования кладки.
- СП 15.13330.2020 регулирует расчёт и конструирование каменных и армокаменных конструкций; текущий калькулятор такой проектный расчёт не выполняет.
  `,
  howToUse: [
    "Введите суммарную длину и высоту стен либо площадь до вычета проёмов",
    "Укажите суммарную площадь оконных и дверных проёмов",
    "Выберите фактический размер блока по паспорту или предложению поставщика",
    "Выберите свой запас на подрезку и бой — скрытый процент не добавляется",
    "При покупке поддонами введите фактическое число блоков на поддоне; 0 оставит результат в штуках",
    "Используйте итог как предварительное количество блоков и отдельно определите по проекту смесь, швы, армирование, перемычки и теплозащиту",
  ],
  expertTips: [
    {
      title: "Проверяйте партию, а не только название",
      content: "До заказа сверьте размеры, класс прочности, плотность, морозостойкость, геометрию, число блоков на поддоне и допустимые повреждения по документам фактической партии.",
      author: "Мастерок",
    },
    {
      title: "Сделайте порядную раскладку",
      content: "Площадной расчёт не показывает перевязку, углы, доборы, простенки и остатки. Для крупных стен разложите ряды по фактическим длинам до оплаты всей партии.",
      author: "Прораб",
    },
  ],
  faq: [
    {
      question: "Почему калькулятор не считает клей или цементно-песчаную смесь?",
      answer: "Расход зависит от типа и геометрии конкретного блока, толщины горизонтальных и вертикальных швов, способа заполнения пустот, ровности первого ряда, температуры и техкарты продукта. Без этих данных фиксированное число мешков создаёт ложную точность.",
    },
    {
      question: "Нужно ли армировать кладку каждые 3–4 ряда?",
      answer: "Универсального ответа по одному размеру блока нет. Схема зависит от материала и характеристик изделия, назначения и длины стены, нагрузок, проёмов, примыканий, основания и конструктивной схемы. Армирование, связи, перемычки и армопояса назначают проектом или принятым техническим решением.",
    },
    {
      question: "Можно ли считать выбранный блок несущим по толщине?",
      answer: "Нет. Размер не заменяет сведения о классе прочности, плотности, пустотности, растворе, расчётных нагрузках, опирании и устойчивости стены. Область применения подтверждают проектом и документами фактического изделия.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Как калькулятор считает пеноблоки и керамзитоблоки</h2>
<p>Сначала определяется чистая площадь кладки за вычетом проёмов. Затем она делится на площадь лицевой грани выбранного блока:</p>
<p><strong>N<sub>чист</sub> = S<sub>нетто</sub> / (L<sub>бл</sub> &times; H<sub>бл</sub>)</strong></p>
<p><strong>N<sub>запас</sub> = N<sub>чист</sub> &times; (1 + R / 100)</strong></p>
<ul>
  <li><strong>S<sub>нетто</sub></strong> — площадь стен за вычетом проёмов, м&sup2;;</li>
  <li><strong>L<sub>бл</sub></strong> и <strong>H<sub>бл</sub></strong> — фактические длина и высота блока, м;</li>
  <li><strong>R</strong> — выбранный пользователем запас на подрезку и бой, %.</li>
</ul>
<p>Швы в площадь лицевой грани не добавляются. Поэтому это предварительный площадной расчёт, а не порядная раскладка: он не знает перевязку, углы, простенки, доборные элементы и полезность остатков.</p>

<h2>Округление до блоков и поддонов</h2>
<p>Без кратности упаковки потребность с запасом округляется вверх до целого блока. Если пользователь вводит фактическое число блоков на поддоне, калькулятор округляет вверх число поддонов и показывает общее число поставляемых блоков и остаток относительно расчётной потребности.</p>
<p>Кратность берут из предложения конкретного поставщика: она зависит от размера, производителя и схемы упаковки. Калькулятор не подставляет универсальный поддон автоматически.</p>

<h2>Что не входит в расчёт</h2>
<ul>
  <li>кладочный клей, раствор или пена и выравнивающий слой первого ряда;</li>
  <li>армирование, кладочная сетка, связи, анкеры и армопояса;</li>
  <li>перемычки, U-блоки, зоны опирания и усиление проёмов;</li>
  <li>несущая способность, устойчивость, этажность и допустимые нагрузки;</li>
  <li>сопротивление теплопередаче, влажностный режим и отделочные слои.</li>
</ul>
<p>Эти решения нельзя достоверно получить из одной площади и размера блока. Нужны характеристики фактического изделия, конструктивная схема, нагрузки, геометрия каждого проёма, климат и принятые проектные узлы.</p>

<h2>Действующие документы</h2>
<ul>
  <li><a href="https://protect.gost.ru/gost/details/5438d707-5f1a-4384-8542-9a31abdd1751" rel="noopener noreferrer">ГОСТ 21520-89 &laquo;Блоки из ячеистых бетонов стеновые мелкие&raquo;</a> — стандарт на соответствующие изделия; он не задаёт универсальную схему армирования стены.</li>
  <li><a href="https://protect.gost.ru/gost/details/8035fb27-188b-444f-87d5-a88423420dfe" rel="noopener noreferrer">ГОСТ 6133-2026 &laquo;Камни бетонные стеновые. Технические условия&raquo;</a> — действует с 1 июля 2026 года и заменяет ГОСТ 6133-2019.</li>
  <li><a href="https://protect.gost.ru/sp/details/88d859d2-0687-4825-9d5a-004160dce187" rel="noopener noreferrer">СП 15.13330.2020 &laquo;Каменные и армокаменные конструкции&raquo;</a> — расчёт и конструирование кладки.</li>
</ul>
<p>Название «керамзитоблок» используется в поиске и торговле, но применимость ГОСТ 6133-2026 к конкретному изделию подтверждают его паспортом и областью применения стандарта. Плотность или марка без класса прочности, конструкции стены и расчётных нагрузок не подтверждают, что стена будет несущей.</p>
`,
    faq: [
      {
        question: "Сколько пеноблоков 600×300 нужно на 1 м² стены?",
        answer: "<p>По чистой площади лицевой грани: 1 / (0,6 × 0,3) = 5,56 блока на 1 м&sup2;. Это геометрический эквивалент без учёта швов, перевязки и раскладки. Итог к покупке зависит от явно выбранного запаса и кратности поддона.</p>",
      },
      {
        question: "Сколько керамзитоблоков 390×190 нужно на 1 м² стены?",
        answer: "<p>По чистой площади лицевой грани: 1 / (0,39 × 0,19) = 13,50 камня на 1 м&sup2;. Толщина 90 или 188 мм меняет объём стены, но не число камней на квадратный метр при одинаковых длине и высоте. Порядная раскладка и швы считаются отдельно.</p>",
      },
      {
        question: "Какой запас блоков выбрать?",
        answer: "<p>Единого обязательного процента нет. Оцените раскладку, число углов и коротких простенков, качество геометрии и поставки, повторное использование обрезков, риск повреждений и возможность докупить ту же партию. Выбранные 0%, 5%, 10% или 15% — явное пользовательское допущение.</p>",
      },
    ],
  },
};
