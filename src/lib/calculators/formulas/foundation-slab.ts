import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalFoundationSlab } from "../../../../engine/foundation-slab";
import foundationSlabSpec from "../../../../configs/calculators/foundation-slab-canonical.v1.json";

const hideWithoutSand = { key: "sandLayerMm", op: "eq" as const, value: 0 };
const hideWithoutGravel = { key: "gravelLayerMm", op: "eq" as const, value: 0 };
const hideWithoutGeotextile = { key: "includeGeotextile", op: "eq" as const, value: 0 };
const hideWithoutInsulation = { key: "insulationThickness", op: "eq" as const, value: 0 };

export const foundationSlabDef: CalculatorDefinition = {
  id: "foundation_slab",
  slug: "plitnyj-fundament",
  title: "Калькулятор плитного фундамента",
  h1: "Калькулятор плитного фундамента — материалы по проектной схеме",
  description:
    "Переведите размеры и готовую проектную схему фундаментной плиты в бетон, целые прутки арматуры, проволоку, опалубку и материалы подготовки к покупке.",
  metaTitle: withSiteMetaTitle("Плитный фундамент: бетон и арматура к покупке"),
  metaDescription:
    "Бесплатный калькулятор плитного фундамента: рассчитайте бетон с явным запасом, арматуру целыми прутками, проволоку, опалубку, подготовку, геотекстиль и ЭППС.",
  category: "foundation",
  categorySlug: "fundament",
  tags: ["плитный фундамент", "монолитная плита", "бетон", "арматура", "материалы по проекту"],
  popularity: 68,
  complexity: 3,
  fields: [
    {
      key: "length",
      label: "Длина плиты по проекту",
      type: "number",
      unit: "м",
      min: 1,
      max: 50,
      step: 0.1,
      defaultValue: 10,
      group: "Геометрия",
    },
    {
      key: "width",
      label: "Ширина плиты по проекту",
      type: "number",
      unit: "м",
      min: 1,
      max: 50,
      step: 0.1,
      defaultValue: 6,
      group: "Геометрия",
    },
    {
      key: "thickness",
      label: "Толщина плиты по проекту",
      type: "number",
      unit: "мм",
      min: 100,
      max: 500,
      step: 10,
      defaultValue: 200,
      hint: "Калькулятор не подбирает толщину и не проверяет несущую способность",
      group: "Геометрия",
    },
    {
      key: "concreteReservePercent",
      label: "Запас товарного бетона",
      type: "number",
      unit: "%",
      min: 0,
      max: 20,
      step: 1,
      defaultValue: 5,
      hint: "Явный запас к геометрическому объёму — не скрытый коэффициент",
      group: "Заказ бетона",
    },
    {
      key: "readyMixOrderStepM3",
      label: "Шаг заказа бетонной смеси",
      type: "select",
      defaultValue: 0.1,
      options: [
        { value: 0.1, label: "0,1 м³" },
        { value: 0.5, label: "0,5 м³" },
        { value: 1, label: "1 м³" },
      ],
      hint: "Выберите фактический шаг, с которым поставщик принимает заказ",
      group: "Заказ бетона",
    },
    {
      key: "deliveryAllowanceM3",
      label: "Остаток в линии подачи",
      type: "number",
      unit: "м³",
      min: 0,
      max: 5,
      step: 0.1,
      defaultValue: 0,
      hint: "Добавляйте только по данным поставщика насоса или выбранной схемы подачи",
      group: "Заказ бетона",
    },
    {
      key: "gridLayers",
      label: "Слоёв арматурной сетки",
      type: "select",
      defaultValue: 2,
      options: [
        { value: 1, label: "1 слой — по проекту" },
        { value: 2, label: "2 слоя — по проекту" },
      ],
      hint: "Количество слоёв переносится из конструктивной схемы",
      group: "Армирование из проекта",
    },
    {
      key: "rebarDiam",
      label: "Диаметр арматуры сетки",
      type: "select",
      defaultValue: 12,
      options: [6, 8, 10, 12, 14, 16].map((value) => ({
        value,
        label: `∅${value} мм — по проекту`,
      })),
      group: "Армирование из проекта",
    },
    {
      key: "rebarStep",
      label: "Максимальный шаг стержней",
      type: "number",
      unit: "мм",
      min: 100,
      max: 500,
      step: 10,
      defaultValue: 200,
      hint: "Перенесите шаг из схемы армирования",
      group: "Армирование из проекта",
    },
    {
      key: "edgeCoverMm",
      label: "Отступ оси крайнего стержня",
      type: "number",
      unit: "мм",
      min: 0,
      max: 150,
      step: 5,
      defaultValue: 50,
      hint: "Геометрический отступ от каждой кромки — не автоподбор защитного слоя",
      group: "Армирование из проекта",
    },
    {
      key: "rebarReservePercent",
      label: "Запас арматуры на стыки и раскрой",
      type: "number",
      unit: "%",
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 10,
      hint: "Явный закупочный запас; сверяйте с ведомостью стержней и картой раскроя",
      group: "Закупка арматуры",
    },
    {
      key: "rodLengthM",
      label: "Длина покупного прутка",
      type: "select",
      defaultValue: 11.7,
      options: [
        { value: 6, label: "6 м" },
        { value: 11.7, label: "11,7 м" },
        { value: 12, label: "12 м" },
      ],
      group: "Закупка арматуры",
    },
    {
      key: "tieSharePercent",
      label: "Доля перевязываемых пересечений",
      type: "select",
      unit: "%",
      defaultValue: 100,
      options: [
        { value: 25, label: "25% — по проекту производства работ" },
        { value: 50, label: "50% — по проекту производства работ" },
        { value: 100, label: "100% — каждый узел" },
      ],
      group: "Вязальная проволока",
    },
    {
      key: "wireLengthPerTieM",
      label: "Проволоки на одну вязку",
      type: "number",
      unit: "м",
      min: 0.1,
      max: 1,
      step: 0.05,
      defaultValue: 0.3,
      group: "Вязальная проволока",
    },
    {
      key: "wireReservePercent",
      label: "Запас вязальной проволоки",
      type: "number",
      unit: "%",
      min: 0,
      max: 50,
      step: 1,
      defaultValue: 10,
      group: "Вязальная проволока",
    },
    {
      key: "wirePackageKg",
      label: "Фасовка вязальной проволоки",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "1 кг" },
        { value: 5, label: "5 кг" },
        { value: 10, label: "10 кг" },
      ],
      group: "Вязальная проволока",
    },
    {
      key: "formworkHeightMm",
      label: "Высота щитов опалубки",
      type: "number",
      unit: "мм",
      min: 0,
      max: 1000,
      step: 10,
      defaultValue: 200,
      hint: "0 — не включать опалубку; укажите фактическую высоту внешнего борта",
      group: "Опалубка",
    },
    {
      key: "formworkReservePercent",
      label: "Запас площади щитов",
      type: "number",
      unit: "%",
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 10,
      group: "Опалубка",
    },
    {
      key: "sandLayerMm",
      label: "Песчаный слой после уплотнения",
      type: "number",
      unit: "мм",
      min: 0,
      max: 500,
      step: 10,
      defaultValue: 100,
      hint: "Толщина из проекта подготовки; 0 — исключить слой",
      group: "Подготовка основания",
    },
    {
      key: "sandOrderExtraPercent",
      label: "Надбавка к заказу песка",
      type: "number",
      unit: "%",
      min: 0,
      max: 50,
      step: 1,
      defaultValue: 0,
      hideIf: hideWithoutSand,
      hint: "По данным поставщика и принятой технологии уплотнения",
      group: "Подготовка основания",
    },
    {
      key: "gravelLayerMm",
      label: "Щебёночный слой после уплотнения",
      type: "number",
      unit: "мм",
      min: 0,
      max: 500,
      step: 10,
      defaultValue: 150,
      hint: "Толщина из проекта подготовки; 0 — исключить слой",
      group: "Подготовка основания",
    },
    {
      key: "gravelOrderExtraPercent",
      label: "Надбавка к заказу щебня",
      type: "number",
      unit: "%",
      min: 0,
      max: 50,
      step: 1,
      defaultValue: 0,
      hideIf: hideWithoutGravel,
      hint: "По данным поставщика и принятой технологии уплотнения",
      group: "Подготовка основания",
    },
    {
      key: "aggregateOrderStepM3",
      label: "Шаг заказа сыпучих материалов",
      type: "select",
      defaultValue: 0.1,
      options: [
        { value: 0.1, label: "0,1 м³" },
        { value: 0.5, label: "0,5 м³" },
        { value: 1, label: "1 м³" },
      ],
      group: "Подготовка основания",
    },
    {
      key: "includeGeotextile",
      label: "Включить геотекстиль",
      type: "switch",
      defaultValue: 1,
      fullWidth: true,
      hint: "Наличие, тип и плотность материала — из проекта подготовки",
      group: "Геотекстиль",
    },
    {
      key: "geotextileReservePercent",
      label: "Запас геотекстиля на раскладку",
      type: "number",
      unit: "%",
      min: 0,
      max: 50,
      step: 1,
      defaultValue: 20,
      hideIf: hideWithoutGeotextile,
      group: "Геотекстиль",
    },
    {
      key: "geotextileRollAreaM2",
      label: "Площадь одного рулона",
      type: "number",
      unit: "м²",
      min: 10,
      max: 500,
      step: 1,
      defaultValue: 50,
      hideIf: hideWithoutGeotextile,
      hint: "Введите фактическую площадь по этикетке выбранного рулона",
      group: "Геотекстиль",
    },
    {
      key: "insulationThickness",
      label: "ЭППС под плитой",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Не включать" },
        { value: 50, label: "50 мм — по проекту" },
        { value: 100, label: "100 мм — по проекту" },
        { value: 150, label: "150 мм — по проекту" },
        { value: 200, label: "200 мм — по проекту" },
      ],
      hint: "Толщину, прочность и схему укладки назначает проект",
      group: "Утепление",
    },
    {
      key: "insulationReservePercent",
      label: "Запас ЭППС",
      type: "number",
      unit: "%",
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 5,
      hideIf: hideWithoutInsulation,
      group: "Утепление",
    },
    {
      key: "eppsBoardAreaM2",
      label: "Площадь одной плиты ЭППС",
      type: "number",
      unit: "м²",
      min: 0.2,
      max: 3,
      step: 0.01,
      defaultValue: 0.72,
      hideIf: hideWithoutInsulation,
      hint: "Например, 1200 × 600 мм = 0,72 м²; сверяйте с выбранным товаром",
      group: "Утепление",
    },
  ],
  calculate(inputs) {
    const canonical = computeCanonicalFoundationSlab(foundationSlabSpec as any, inputs);
    const totals = canonical.totals;
    return {
      materials: canonical.materials,
      totals,
      warnings: canonical.warnings,
      scenarios: canonical.scenarios,
      formulaVersion: canonical.formulaVersion,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes: canonical.practicalNotes ?? [],
      accuracyMode: canonical.accuracyMode,
      accuracyExplanation: canonical.accuracyExplanation,
      summaryCards: [
        {
          icon: "🚚",
          label: "Бетон к заказу",
          value: String(totals.recPurchaseM3),
          unit: "м³",
          hint: `шаг ${totals.readyMixOrderStepM3} м³`,
          tone: "violet",
        },
        {
          icon: "▦",
          label: "Арматура к покупке",
          value: String(totals.rebarRods),
          unit: "прутков",
          hint: `по ${totals.rodLengthM} м`,
          tone: "emerald",
        },
        {
          icon: "📐",
          label: "Площадь плиты",
          value: String(totals.area),
          unit: "м²",
          hint: `${totals.length} × ${totals.width} м`,
          tone: "slate",
        },
      ],
    };
  },
  formulaDescription: `
**Расчёт выполняется по готовой проектной схеме:**

1. Бетон: длина × ширина × проектную толщину; запас, остаток в линии подачи и шаг заказа задаются явно.
2. Арматура: чистые размеры сетки с указанным отступом, шагом и числом слоёв; затем один явный запас и округление вверх до целых прутков.
3. Проволока: число пересечений × долю перевязки × расход на узел; затем отдельный запас и целые упаковки.
4. Опалубка: внешний периметр × указанную высоту щитов.
5. Подготовка: площадь × проектную толщину каждого уплотнённого слоя; закупочная надбавка и шаг заказа вводятся отдельно.
6. Геотекстиль и ЭППС округляются до фактической площади рулона или плиты.

Калькулятор не проектирует фундамент и не проверяет несущую способность, деформации или пригодность схемы армирования.
  `,
  howToUse: [
    "Перенесите длину, ширину и толщину из проекта",
    "Укажите условия заказа готовой смеси у поставщика",
    "Перенесите число сеток, диаметр, шаг и отступ крайнего стержня из схемы армирования",
    "Настройте закупочный запас, длину прутка и параметры вязальной проволоки",
    "Добавьте только предусмотренные проектом слои подготовки, геотекстиль и ЭППС",
    "Сверьте чистую потребность, расчёт с запасом и отдельные позиции к покупке",
  ],
  faq: [
    {
      question: "Калькулятор подбирает толщину плиты и армирование?",
      answer:
        "Нет. Тип фундамента, толщину, бетон, число сеток, диаметр, шаг, защитный слой, нахлёсты и усиления определяет проектировщик по нагрузкам и инженерно-геологическим данным. Калькулятор переводит готовую схему в закупочные количества.",
    },
    {
      question: "Почему больше нельзя считать арматуру только по площади?",
      answer:
        "Одна площадь не задаёт периметр и длины стержней. Плиты 6 × 10 и 3 × 20 м имеют одинаковую площадь, но разные периметры, раскрой и условия армирования. Для честной закупки нужны обе стороны.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор фундаментной плиты</h2>
<p>Калькулятор переводит готовые размеры и проектную схему в чистую потребность, количество с запасом и позиции к покупке. Он не выбирает фундамент и не заменяет расчёт конструктора.</p>

<h2>Бетон для монолитной плиты</h2>
<p>Чистый объём: <strong>V = L × B × h</strong>. Отдельно задаются запас, технологический остаток в линии подачи и шаг заказа у поставщика. Поэтому геометрический объём и заказ не смешиваются в одну непрозрачную цифру.</p>

<h2>Арматура по готовой схеме</h2>
<p>Для каждого направления определяется число стержней с учётом максимального шага и указанного отступа оси крайнего стержня. Чистый метраж умножается на число слоёв, затем применяется явный запас, а закупка округляется до целых прутков выбранной длины.</p>
<p>Нахлёсты, анкеровку, выпуски, локальные усиления, П-образные элементы и карту раскроя берут из рабочей документации.</p>

<h2>Подготовка основания и упаковки</h2>
<p>Объём песка и щебня считается по толщине слоя после уплотнения. Надбавка к заказу вводится отдельно по данным поставщика и технологии работ. Геотекстиль и ЭППС округляются до введённой площади рулона или плиты.</p>

<h2>Граница нормативной применимости</h2>
<ul>
  <li><strong>СП 22.13330.2016</strong> — проектирование оснований;</li>
  <li><strong>СП 63.13330.2018</strong> — расчёт и конструирование железобетонных элементов;</li>
  <li><strong>ГОСТ 7473-2010</strong> — готовые бетонные смеси;</li>
  <li><strong>ГОСТ 34028-2016</strong> — арматурный прокат.</li>
</ul>
<p>Ссылки на нормы объясняют границу расчёта, но не превращают бытовой калькулятор в конструктивный проект.</p>
`,
    faq: [
      {
        question: "Как посчитать бетон на плитный фундамент?",
        answer: "<p>Умножьте длину плиты на ширину и проектную толщину в метрах. Затем отдельно учтите согласованный запас и технологический остаток, после чего округлите объём вверх с шагом заказа поставщика.</p>",
      },
      {
        question: "Сколько арматуры покупать на плиту?",
        answer: "<p>Количество зависит от реальных размеров, числа сеток, шага, отступов, диаметра, нахлёстов и раскроя. Калькулятор считает по введённой проектной сетке и округляет результат до целых прутков; достаточность армирования он не определяет.</p>",
      },
      {
        question: "Как учитывается уплотнение песка и щебня?",
        answer: "<p>Вводится толщина готового уплотнённого слоя. Надбавку к закупочному объёму пользователь задаёт отдельно по данным поставщика и принятой технологии, потому что универсального коэффициента для любого материала и состояния нет.</p>",
      },
    ],
  },
};
