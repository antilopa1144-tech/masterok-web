import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import {
  computeSlopesPurchase,
  SLOPES_PURCHASE_FORMULA_VERSION,
} from "../../../../engine/slopes-purchase";

const RESERVE_OPTIONS = [
  { value: 0, label: "0% — без запаса" },
  { value: 3, label: "3%" },
  { value: 5, label: "5%" },
  { value: 7, label: "7%" },
  { value: 10, label: "10%" },
  { value: 12, label: "12%" },
  { value: 15, label: "15%" },
  { value: 20, label: "20%" },
  { value: 30, label: "30%" },
];

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

const AREA_POSITION_HIDDEN = {
  key: "positionType",
  op: "eq" as const,
  value: 2,
};

export const slopesDef: CalculatorDefinition = {
  id: "slopes_finishing",
  slug: "otkosy-okon-i-dverej",
  formulaVersion: SLOPES_PURCHASE_FORMULA_VERSION,
  title: "Калькулятор материалов для откосов",
  h1: "Калькулятор откосов — обмер и одна позиция к покупке",
  description:
    "Рассчитайте площадь оконных или дверных откосов и переведите её в одну выбранную закупку: листы, смесь либо профиль по фактической фасовке.",
  metaTitle: withSiteMetaTitle(
    "Калькулятор откосов: площадь и материалы",
  ),
  metaDescription:
    "Бесплатный калькулятор откосов окон и дверей: рассчитайте площадь по реальным размерам, листы, смесь или профиль с явным запасом и фасовкой товара.",
  category: "interior",
  categorySlug: "otdelka",
  tags: [
    "калькулятор откосов",
    "площадь откосов",
    "оконные откосы",
    "дверные откосы",
    "материалы для откосов",
    "сколько смеси на откосы",
  ],
  popularity: 55,
  complexity: 2,
  fields: [
    {
      key: "positionType",
      label: "Что рассчитываем",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Лист или панель по полезной площади" },
        { value: 1, label: "Смесь по паспортному расходу" },
        { value: 2, label: "Профиль или уголок по обмеру" },
      ],
      hint:
        "Один запуск — одна товарная позиция. У листов, смесей и погонажа разные исходные данные и округление.",
      fullWidth: true,
    },
    {
      key: "areaMode",
      label: "Как задаём площадь откосов",
      type: "radio",
      defaultValue: 1,
      options: [
        { value: 0, label: "Готовая площадь из обмера" },
        { value: 1, label: "Одинаковые прямоугольные проёмы" },
      ],
      hint:
        "Для разной глубины, разворота граней, четвертей и повреждений используйте готовую площадь после детального обмера.",
      fullWidth: true,
      hideIf: AREA_POSITION_HIDDEN,
    },
    {
      key: "measuredAreaM2",
      label: "Готовая площадь откосов",
      type: "number",
      unit: "м²",
      min: 0,
      max: 100000,
      step: 0.01,
      defaultValue: 1.4,
      hint:
        "Сумма площадей всех отделываемых граней без запаса. Не включайте окно, дверь и другие необлицовываемые участки.",
      hideIf: [
        AREA_POSITION_HIDDEN,
        { key: "areaMode", op: "ne", value: 0 },
      ],
    },
    {
      key: "openingCount",
      label: "Одинаковых проёмов",
      type: "number",
      unit: "шт",
      min: 0,
      max: 1000,
      step: 1,
      integerOnly: true,
      defaultValue: 1,
      hint: "Количество проёмов с одинаковой шириной, высотой и глубинами граней.",
      hideIf: [AREA_POSITION_HIDDEN, { key: "areaMode", op: "ne", value: 1 }],
    },
    {
      key: "openingWidthM",
      label: "Ширина проёма",
      type: "number",
      unit: "м",
      min: 0,
      max: 100,
      step: 0.01,
      defaultValue: 1.2,
      hint: "Размер по отделываемой границе верхнего откоса.",
      hideIf: [AREA_POSITION_HIDDEN, { key: "areaMode", op: "ne", value: 1 }],
    },
    {
      key: "openingHeightM",
      label: "Высота проёма",
      type: "number",
      unit: "м",
      min: 0,
      max: 100,
      step: 0.01,
      defaultValue: 1.4,
      hint: "Размер левой и правой отделываемых граней.",
      hideIf: [AREA_POSITION_HIDDEN, { key: "areaMode", op: "ne", value: 1 }],
    },
    {
      key: "leftDepthMm",
      label: "Глубина левого откоса",
      type: "number",
      unit: "мм",
      min: 0,
      max: 5000,
      step: 1,
      defaultValue: 350,
      hint:
        "Измерьте фактическую отделываемую ширину грани. Это не обязательно полная толщина стены.",
      hideIf: [AREA_POSITION_HIDDEN, { key: "areaMode", op: "ne", value: 1 }],
    },
    {
      key: "rightDepthMm",
      label: "Глубина правого откоса",
      type: "number",
      unit: "мм",
      min: 0,
      max: 5000,
      step: 1,
      defaultValue: 350,
      hint: "Левую и правую стороны вводите отдельно — после монтажа они могут различаться.",
      hideIf: [AREA_POSITION_HIDDEN, { key: "areaMode", op: "ne", value: 1 }],
    },
    {
      key: "includeTop",
      label: "Добавить верхний откос",
      type: "switch",
      defaultValue: 1,
      hint: "Отключите для проёма, у которого отделываются только две боковые грани.",
      hideIf: [AREA_POSITION_HIDDEN, { key: "areaMode", op: "ne", value: 1 }],
    },
    {
      key: "topDepthMm",
      label: "Глубина верхнего откоса",
      type: "number",
      unit: "мм",
      min: 0,
      max: 5000,
      step: 1,
      defaultValue: 350,
      hint: "Измерьте верхнюю грань отдельно; она может отличаться от боковых.",
      hideIf: [
        AREA_POSITION_HIDDEN,
        { key: "areaMode", op: "ne", value: 1 },
        { key: "includeTop", op: "eq", value: 0 },
      ],
    },
    {
      key: "coveragePerUnitM2",
      label: "Полезная площадь одной единицы",
      type: "number",
      unit: "м²",
      min: 0.01,
      max: 10000,
      step: 0.01,
      defaultValue: 3.6,
      hint:
        "Полезная площадь выбранного листа, панели или упаковки по маркировке. 3,6 м² — редактируемый пример, а не универсальный формат.",
      hideIf: { key: "positionType", op: "ne", value: 0 },
    },
    {
      key: "sheetReservePercent",
      label: "Запас листового материала",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hint:
        "Выберите по карте резов, направлению, стыкам, браку и пригодности остатков. По умолчанию скрытого запаса нет.",
      hideIf: { key: "positionType", op: "ne", value: 0 },
    },
    {
      key: "consumptionKgPerM2",
      label: "Расход смеси для выбранной системы",
      type: "number",
      unit: "кг/м²",
      min: 0,
      max: 10000,
      step: 0.01,
      defaultValue: 8.5,
      hint:
        "Перенесите расход из техкарты продукта для полной толщины и основания. 8,5 кг/м² — только пример KNAUF Ротбанд при слое 10 мм.",
      hideIf: { key: "positionType", op: "ne", value: 1 },
    },
    {
      key: "mixtureReservePercent",
      label: "Дополнительный запас смеси",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hint:
        "Добавляйте один явный запас только если он ещё не включён в принятую норму и подтверждён состоянием основания.",
      hideIf: { key: "positionType", op: "ne", value: 1 },
    },
    {
      key: "packageMassKg",
      label: "Масса упаковки",
      type: "number",
      unit: "кг",
      min: 0.01,
      max: 10000,
      step: 0.01,
      defaultValue: 30,
      hint: "Фактическая фасовка выбранной смеси. 30 кг — редактируемый пример.",
      hideIf: { key: "positionType", op: "ne", value: 1 },
    },
    {
      key: "measuredLinearM",
      label: "Суммарная длина по обмеру",
      type: "number",
      unit: "м",
      min: 0,
      max: 100000,
      step: 0.01,
      defaultValue: 10,
      hint:
        "Сложите длины только выбранного профиля или уголка по готовой схеме узлов. Калькулятор не назначает число контуров.",
      hideIf: { key: "positionType", op: "ne", value: 2 },
    },
    {
      key: "linearReservePercent",
      label: "Запас погонажа",
      type: "select",
      unit: "%",
      defaultValue: 0,
      options: RESERVE_OPTIONS,
      hint: "Выберите по карте резов и пригодности остатков; скрытого запаса нет.",
      hideIf: { key: "positionType", op: "ne", value: 2 },
    },
    {
      key: "pieceLengthM",
      label: "Длина одной покупной планки",
      type: "number",
      unit: "м",
      min: 0.01,
      max: 1000,
      step: 0.01,
      defaultValue: 3,
      hint: "Фактическая длина выбранного артикула. 3 м — только редактируемый пример.",
      hideIf: { key: "positionType", op: "ne", value: 2 },
    },
  ],
  calculate(inputs) {
    const result = computeSlopesPurchase({
      ...inputs,
      accuracyMode: inputs.accuracyMode as never,
    });
    const positionType = result.totals.positionType;
    const packagesCount = result.totals.packagesCount;
    const exactNeed = result.totals.exactNeed;
    const needWithReserve = result.totals.needWithReserve;
    const purchaseQuantity = result.totals.purchaseQuantity;
    const unit = positionType === 1 ? "кг" : positionType === 2 ? "м" : "м²";
    const packageHint = positionType === 0
      ? `${packagesCount} ${plural(packagesCount, "единица", "единицы", "единиц")}`
      : positionType === 1
        ? `${packagesCount} ${plural(packagesCount, "упаковка", "упаковки", "упаковок")}`
        : `${packagesCount} ${plural(packagesCount, "планка", "планки", "планок")}`;

    return {
      ...result,
      summaryCards: [
        {
          icon: "∑",
          label: "Точная потребность",
          value: formatRuNumber(exactNeed),
          unit,
          hint: positionType === 1
            ? "по паспортному расходу"
            : positionType === 2
              ? "по суммарному обмеру"
              : "по площади откосов",
          tone: "slate",
        },
        {
          icon: "+",
          label: "С явным запасом",
          value: formatRuNumber(needWithReserve),
          unit,
          hint: "без скрытого коэффициента",
          tone: "amber",
        },
        {
          icon: "▦",
          label: "К покупке",
          value: formatRuNumber(purchaseQuantity),
          unit,
          hint: packageHint,
          tone: "emerald",
        },
      ],
      hidePrimaryMaterialBadge: true,
    };
  },
  formulaDescription: `
**Площадь одинаковых прямоугольных проёмов:**
- Боковые грани = высота × (глубина слева + глубина справа)
- Верхняя грань = ширина × глубина сверху
- Общая площадь = количество проёмов × (боковые + верхняя)

**Одна закупочная позиция:**
- Листы/панели = ⌈площадь × (1 + явный запас / 100) / полезная площадь единицы⌉
- Смесь = площадь × паспортный расход; упаковки = ⌈кг с запасом / масса упаковки⌉
- Погонаж = ⌈измеренная длина с запасом / длина планки⌉

MIN/REC/MAX и режимы точности не добавляют скрытых множителей. Сопутствующие материалы автоматически не назначаются.
  `,
  howToUse: [
    "Выберите одну позицию: листы, смесь или погонаж",
    "Введите готовую площадь либо реальные размеры одинаковых прямоугольных проёмов",
    "Перенесите полезную площадь, паспортный расход или длину из данных выбранного товара",
    "Добавьте только осознанный запас и укажите фактическую фасовку",
    "Проверьте точную потребность, количество к покупке и упаковочный остаток",
  ],
  expertTips: [
    {
      title: "Измеряйте каждую грань",
      content:
        "После установки блока левая, правая и верхняя глубины могут различаться. При развороте или неровностях разбейте откос на простые фигуры и внесите готовую суммарную площадь.",
      author: "Мастер-отделочник",
    },
    {
      title: "Не переносите расход между продуктами",
      content:
        "Расход смеси зависит от её состава, основания и толщины. Подставляйте паспортное значение своего продукта для полной проектной толщины, а не усреднённую норму из другой системы.",
      author: "Прораб",
    },
  ],
  faq: [
    {
      question: "Как посчитать площадь оконных откосов?",
      answer:
        "Умножьте высоту проёма на сумму фактических глубин левой и правой граней, затем добавьте ширину проёма, умноженную на глубину верхней грани. Для нескольких одинаковых проёмов умножьте результат на их количество.",
    },
    {
      question: "Как посчитать дверные откосы без верхней грани?",
      answer:
        "Отключите верхний откос. Тогда калькулятор сложит только площади двух боковых граней: высота × глубина слева + высота × глубина справа.",
    },
    {
      question: "Почему калькулятор не добавляет пену, грунтовку и шпаклёвку?",
      answer:
        "Комплект зависит от выбранной системы, основания, монтажного шва и инструкций производителей. Чтобы не создавать ложную ведомость, калькулятор считает одну принятую позицию; связанные материалы рассчитываются отдельно.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор откосов</h2>
<p>Калькулятор решает две последовательные задачи: помогает получить площадь прямоугольных боковых и верхней граней, а затем переводит её в одну выбранную закупочную позицию. Можно рассчитать листовой материал по полезной площади единицы, смесь по паспортному расходу и массе упаковки либо профиль и уголок по готовому линейному обмеру.</p>
<p>Это не автоматическая комплектация узла. Панели, гипсокартон, смесь, грунт, шпаклёвка, краска, клей, пена, герметики, профили, крепёж и утепление могут относиться к разным совместимым системам и поэтому не должны появляться в одной ведомости без проекта и конкретных продуктов.</p>

<h2>Как рассчитать площадь откосов окна</h2>
<p>Для прямоугольных граней используйте отдельные глубины слева, справа и сверху:</p>
<p><strong>S = n × [H × (D<sub>лев</sub> + D<sub>прав</sub>) + W × D<sub>верх</sub>]</strong>, где размеры предварительно переведены в метры. Если верхняя грань не отделывается, её часть равна нулю.</p>
<p>Например, один проём 1,2 × 1,4 м с тремя глубинами по 350 мм даёт 1,4 м²: 1,4 × (0,35 + 0,35) + 1,2 × 0,35. Полная толщина стены не подставляется автоматически: нужна ширина именно отделываемой грани от блока до плоскости стены.</p>

<h2>Когда нужна готовая площадь</h2>
<p>Простая формула подходит только для прямоугольных граней постоянной глубины. При развороте откоса, четверти, арке, разрушениях, разной глубине по высоте или сложном примыкании разбейте поверхность на измеряемые фигуры и внесите их сумму в режиме готовой площади.</p>

<h2>Листы и панели: площадь ещё не равна карте резов</h2>
<p><strong>N = ceil[S × (1 + запас / 100) / полезная площадь единицы]</strong>. Полезную площадь берут с маркировки конкретного листа, панели или упаковки. Полученное количество остаётся предварительным: отдельные длинные боковые детали могут не разместиться в общей площади без дополнительного листа. Перед заказом проверьте размеры заготовок, направление поверхности, допустимые стыки и повторное использование обрезков в <a href="/instrumenty/raskladka-listov/">раскладке листов</a>.</p>

<h2>Смесь: только паспортный расход для принятой толщины</h2>
<p><strong>M = S × q</strong>, где <strong>q</strong> — расход выбранного продукта для полной проектной толщины и подходящего основания. Затем один явный запас применяется к массе, и результат округляется вверх до фактических упаковок.</p>
<p>Например, официальный материал KNAUF указывает для Ротбанда ориентировочный расход около 8,5 кг/м² при слое 10 мм. Это характеристика конкретного продукта и слоя, а не универсальные 12 кг/м² для любого откоса. Если средняя толщина или продукт другие, значение в форме нужно заменить по их технической документации.</p>

<h2>Профиль и уголок: сначала схема узлов</h2>
<p>Калькулятор принимает готовую суммарную длину одной позиции, применяет явный запас и делит результат на фактическую длину планки. Он не умножает периметр проёма на условное число контуров: стартовый, примыкающий, финишный и угловой профили имеют разные места установки и считаются отдельно по выбранной системе.</p>

<h2>Монтажный шов и теплотехника — отдельная задача</h2>
<p><a href="https://protect.gost.ru/gost/details/09b731bf-531e-428b-8ef9-556ed2d1c110" target="_blank" rel="noopener noreferrer">ГОСТ 30971-2012</a> распространяется на монтажные швы узлов примыкания оконных блоков и указывает, что его требования могут применяться к наружным дверям. Отдельный <a href="https://protect.gost.ru/gost/details/dd2cf1c8-2634-46e7-8349-4a08ca4597f2" target="_blank" rel="noopener noreferrer">ГОСТ Р 70075-2022</a> относится к герметизирующим материалам наружного и внутреннего слоёв оконных монтажных швов. Эти документы не превращают глубину откоса в норму пены или утеплителя: конструкцию шва, защиту от влаги, конденсат и промерзание проверяют отдельно.</p>

<h2>Связанные расчёты</h2>
<p>Монтаж оконного или дверного блока не смешивается с отделкой откоса: используйте отдельные калькуляторы <a href="/kalkulyatory/otdelka/ustanovka-okon/">установки окон</a> и <a href="/kalkulyatory/otdelka/ustanovka-dverej/">установки дверей</a>. Для мокрой отделки отдельно рассчитайте <a href="/kalkulyatory/steny/shtukaturka/">штукатурку</a>, <a href="/kalkulyatory/otdelka/gruntovka/">грунтовку</a>, <a href="/kalkulyatory/otdelka/shpaklevka/">шпаклёвку</a> и <a href="/kalkulyatory/otdelka/kraska/">краску</a>. Стоимость материалов и работ переносите отдельными строками в <a href="/instrumenty/stoimost-remonta/">калькулятор стоимости ремонта</a>.</p>

<h2>Проверяемые источники</h2>
<ul>
  <li><a href="https://protect.gost.ru/gost/details/09b731bf-531e-428b-8ef9-556ed2d1c110" target="_blank" rel="noopener noreferrer">Росстандарт: ГОСТ 30971-2012</a> — область применения требований к монтажным швам оконных блоков.</li>
  <li><a href="https://protect.gost.ru/gost/details/dd2cf1c8-2634-46e7-8349-4a08ca4597f2" target="_blank" rel="noopener noreferrer">Росстандарт: ГОСТ Р 70075-2022</a> — материалы наружного и внутреннего слоёв оконных монтажных швов.</li>
  <li><a href="https://www.knauf.ru/catalog/sukhie-stroitelnye-smesi-i-gotovye-sostavy/shtukaturki/shtukaturki-gipsovye/knauf-rotband/" target="_blank" rel="noopener noreferrer">KNAUF Ротбанд</a> — продуктовый расход около 8,5 кг/м² при толщине 10 мм.</li>
  <li><a href="https://www.gyproc.ru/produkciya/gipsovye-stroitelnye-plity/gsp-vetonit-gyproc-layt-oblegchennyy-2700kh1200kh95-mm" target="_blank" rel="noopener noreferrer">Vetonit Gyproc Лайт</a> — пример фактического размера конкретного листового продукта 2700 × 1200 × 9,5 мм.</li>
</ul>
`,
    faq: [
      {
        question: "Сколько листов 1,2 × 3 м нужно на 7 м² откосов?",
        answer:
          "<p>Полезная площадь одного целого листа равна 3,6 м². Без запаса расчёт по общей площади даёт ceil(7 / 3,6) = 2 листа, то есть 7,2 м² к покупке. Перед заказом обязательно проверьте карту резов отдельных боковых и верхних деталей.</p>",
      },
      {
        question: "Сколько смеси нужно на 7 м² откосов?",
        answer:
          "<p>При подтверждённом расходе выбранного продукта 8,5 кг/м² для полной проектной толщины точная потребность равна 59,5 кг. Без дополнительного запаса и при фасовке 30 кг нужно 2 упаковки, или 60 кг. Для другой толщины и продукта подставьте их паспортный расход.</p>",
      },
      {
        question: "Можно ли считать откос по толщине стены?",
        answer:
          "<p>Не всегда. Измеряйте отделываемую глубину от рамы или коробки до плоскости стены отдельно слева, справа и сверху. Полная толщина стены может включать участки, которые не относятся к поверхности откоса.</p>",
      },
    ],
  },
};
