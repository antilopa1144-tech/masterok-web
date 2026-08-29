import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalBasement } from "../../../../engine/basement";
import basementSpec from "../../../../configs/calculators/basement-canonical.v1.json";

const hideWithoutFormwork = { key: "wallFormworkMode", op: "eq" as const, value: 0 };
const hideWithoutWaterproofing = { key: "waterproofScope", op: "eq" as const, value: 0 };
const hideWithoutWaterproofedWalls = [
  hideWithoutWaterproofing,
  { key: "waterproofScope", op: "eq" as const, value: 2 },
];
const hideWithoutMassWaterproofing = [
  hideWithoutWaterproofing,
  { key: "waterproofSystem", op: "ne" as const, value: 1 },
];
const hideWithoutRollWaterproofing = [
  hideWithoutWaterproofing,
  { key: "waterproofSystem", op: "ne" as const, value: 2 },
];
const hideWithoutInsulation = { key: "insulationScope", op: "eq" as const, value: 0 };
const hideWithoutInsulatedWalls = [
  hideWithoutInsulation,
  { key: "insulationScope", op: "eq" as const, value: 2 },
];

export const basementDef: CalculatorDefinition = {
  id: "foundation_basement",
  slug: "podval-fundamenta",
  title: "Калькулятор монолитного подвала",
  h1: "Калькулятор подвала — материалы по проектной схеме",
  description:
    "Переведите наружный контур стен, отдельные размеры плиты пола и готовые проектные данные в раздельные заказы бетона, массу арматуры и позиции к покупке.",
  metaTitle: withSiteMetaTitle("Подвал: бетон и материалы к покупке по проекту"),
  metaDescription:
    "Бесплатный калькулятор монолитного подвала: рассчитайте отдельные заливки пола и стен, арматуру из ведомости, опалубку, гидроизоляцию и утепление.",
  category: "foundation",
  categorySlug: "fundament",
  tags: [
    "цокольный этаж",
    "подвал",
    "монолитный подвал",
    "бетонные стены подвала",
    "материалы по проекту",
  ],
  popularity: 48,
  complexity: 3,
  fields: [
    {
      key: "length",
      label: "Наружная длина контура стен",
      type: "number",
      unit: "м",
      min: 3,
      max: 30,
      step: 0.1,
      defaultValue: 8,
      hint: "Размер по наружной грани монолитных стен",
      group: "Геометрия стен",
    },
    {
      key: "width",
      label: "Наружная ширина контура стен",
      type: "number",
      unit: "м",
      min: 3,
      max: 20,
      step: 0.1,
      defaultValue: 6,
      hint: "Размер по наружной грани монолитных стен",
      group: "Геометрия стен",
    },
    {
      key: "depth",
      label: "Высота монолитной стены по проекту",
      type: "number",
      unit: "м",
      min: 1.5,
      max: 5,
      step: 0.1,
      defaultValue: 2.5,
      hint: "Это геометрическая высота стены, а не автоматически выбранная глубина заложения",
      group: "Геометрия стен",
    },
    {
      key: "wallThickness",
      label: "Толщина стены по проекту",
      type: "number",
      unit: "мм",
      min: 100,
      max: 1000,
      step: 10,
      defaultValue: 200,
      hint: "Калькулятор не подбирает толщину и не проверяет давление грунта или воды",
      group: "Геометрия стен",
    },
    {
      key: "wallOpeningsAreaM2",
      label: "Суммарная площадь сквозных проёмов",
      type: "number",
      unit: "м²",
      min: 0,
      max: 200,
      step: 0.1,
      defaultValue: 0,
      hint: "Проёмы вычитаются из бетона и плоских граней опалубки; откосы и усиления не добавляются",
      group: "Геометрия стен",
    },
    {
      key: "floorLength",
      label: "Длина плиты пола по проекту",
      type: "number",
      unit: "м",
      min: 3,
      max: 35,
      step: 0.1,
      defaultValue: 8,
      hint: "Размер плиты вводится отдельно и не выводится из наружного контура стен",
      group: "Плита пола",
    },
    {
      key: "floorWidth",
      label: "Ширина плиты пола по проекту",
      type: "number",
      unit: "м",
      min: 3,
      max: 25,
      step: 0.1,
      defaultValue: 6,
      group: "Плита пола",
    },
    {
      key: "floorThickness",
      label: "Толщина плиты пола по проекту",
      type: "number",
      unit: "мм",
      min: 100,
      max: 1000,
      step: 10,
      defaultValue: 150,
      hint: "Толщину и конструктивную схему назначает проектировщик",
      group: "Плита пола",
    },
    {
      key: "floorConcreteReservePercent",
      label: "Запас бетона на плиту пола",
      type: "number",
      unit: "%",
      min: 0,
      max: 20,
      step: 1,
      defaultValue: 5,
      group: "Заказ бетона",
    },
    {
      key: "wallConcreteReservePercent",
      label: "Запас бетона на стены",
      type: "number",
      unit: "%",
      min: 0,
      max: 20,
      step: 1,
      defaultValue: 5,
      group: "Заказ бетона",
    },
    {
      key: "readyMixOrderStepM3",
      label: "Шаг заказа готовой смеси",
      type: "select",
      defaultValue: 0.1,
      options: [
        { value: 0.1, label: "0,1 м³" },
        { value: 0.5, label: "0,5 м³" },
        { value: 1, label: "1 м³" },
      ],
      hint: "Пол и стены округляются с этим шагом раздельно",
      group: "Заказ бетона",
    },
    {
      key: "floorDeliveryAllowanceM3",
      label: "Остаток в линии при заливке пола",
      type: "number",
      unit: "м³",
      min: 0,
      max: 5,
      step: 0.1,
      defaultValue: 0,
      hint: "Добавляйте только по данным поставщика насоса или принятой схемы подачи",
      group: "Заказ бетона",
    },
    {
      key: "wallDeliveryAllowanceM3",
      label: "Остаток в линии при заливке стен",
      type: "number",
      unit: "м³",
      min: 0,
      max: 5,
      step: 0.1,
      defaultValue: 0,
      group: "Заказ бетона",
    },
    {
      key: "floorRebarProjectKg",
      label: "Арматура плиты из ведомости",
      type: "number",
      unit: "кг",
      min: 0,
      max: 100000,
      step: 1,
      defaultValue: 0,
      hint: "0 — не добавлять; калькулятор не назначает кг/м² автоматически",
      group: "Арматура из проекта",
    },
    {
      key: "wallRebarProjectKg",
      label: "Арматура стен из ведомости",
      type: "number",
      unit: "кг",
      min: 0,
      max: 100000,
      step: 1,
      defaultValue: 0,
      hint: "Перенесите массу из проектной спецификации",
      group: "Арматура из проекта",
    },
    {
      key: "rebarReservePercent",
      label: "Запас арматуры на раскрой",
      type: "number",
      unit: "%",
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 0,
      hint: "Нахлёсты и усиления уже должны быть учтены проектной ведомостью",
      group: "Арматура из проекта",
    },
    {
      key: "rebarOrderStepKg",
      label: "Шаг заказа арматуры по массе",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "1 кг" },
        { value: 10, label: "10 кг" },
        { value: 50, label: "50 кг" },
      ],
      hint: "Для покупки прутками используйте ведомость диаметров и карту раскроя",
      group: "Арматура из проекта",
    },
    {
      key: "wallFormworkMode",
      label: "Какие грани стен считать в опалубке",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Не включать" },
        { value: 1, label: "Только наружные грани" },
        { value: 2, label: "Только внутренние грани" },
        { value: 3, label: "Обе грани" },
      ],
      group: "Опалубка",
    },
    {
      key: "formworkReservePercent",
      label: "Запас площади опалубки",
      type: "number",
      unit: "%",
      min: 0,
      max: 30,
      step: 1,
      defaultValue: 10,
      hideIf: hideWithoutFormwork,
      group: "Опалубка",
    },
    {
      key: "formworkSheetAreaM2",
      label: "Площадь одного щита или листа",
      type: "number",
      unit: "м²",
      min: 0.1,
      max: 20,
      step: 0.01,
      defaultValue: 2.88,
      hideIf: hideWithoutFormwork,
      hint: "Введите фактическую рабочую площадь выбранного щита; 2,88 м² — только стартовый пример",
      group: "Опалубка",
    },
    {
      key: "waterproofScope",
      label: "Поверхности гидроизоляции по проекту",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Не включать" },
        { value: 1, label: "Наружные стены" },
        { value: 2, label: "Плита пола" },
        { value: 3, label: "Наружные стены и пол" },
      ],
      hint: "Тип защиты и узлы назначают по геологии, воде и проекту",
      group: "Гидроизоляция",
    },
    {
      key: "waterproofSystem",
      label: "Способ закупочного расчёта",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "Состав по расходу, кг/м²" },
        { value: 2, label: "Рулонный материал по площади" },
      ],
      hideIf: hideWithoutWaterproofing,
      group: "Гидроизоляция",
    },
    {
      key: "waterproofWallHeightM",
      label: "Высота гидроизоляции стены",
      type: "number",
      unit: "м",
      min: 0,
      max: 5,
      step: 0.1,
      defaultValue: 2.5,
      hideIf: hideWithoutWaterproofedWalls,
      group: "Гидроизоляция",
    },
    {
      key: "waterproofReservePercent",
      label: "Запас гидроизоляции",
      type: "number",
      unit: "%",
      min: 0,
      max: 50,
      step: 1,
      defaultValue: 15,
      hideIf: hideWithoutWaterproofing,
      hint: "Явно учитывает нахлёсты, раскрой и узлы только в объёме, который вы задали",
      group: "Гидроизоляция",
    },
    {
      key: "waterproofConsumptionKgM2",
      label: "Расход состава на весь цикл",
      type: "number",
      unit: "кг/м²",
      min: 0,
      max: 20,
      step: 0.01,
      defaultValue: 0,
      hideIf: hideWithoutMassWaterproofing,
      hint: "Возьмите суммарный расход всех предусмотренных слоёв из техкарты выбранного продукта",
      group: "Гидроизоляция",
    },
    {
      key: "waterproofPackageKg",
      label: "Масса одной упаковки состава",
      type: "number",
      unit: "кг",
      min: 0,
      max: 200,
      step: 0.1,
      defaultValue: 0,
      hideIf: hideWithoutMassWaterproofing,
      group: "Гидроизоляция",
    },
    {
      key: "waterproofLayers",
      label: "Слоёв рулонного материала",
      type: "number",
      min: 1,
      max: 5,
      step: 1,
      defaultValue: 1,
      hideIf: hideWithoutRollWaterproofing,
      hint: "Количество слоёв — только из принятой проектной системы",
      group: "Гидроизоляция",
    },
    {
      key: "waterproofRollAreaM2",
      label: "Полезная площадь одного рулона",
      type: "number",
      unit: "м²",
      min: 0,
      max: 200,
      step: 0.1,
      defaultValue: 0,
      hideIf: hideWithoutRollWaterproofing,
      hint: "Введите площадь по этикетке; нахлёсты учитываются отдельным запасом",
      group: "Гидроизоляция",
    },
    {
      key: "insulationScope",
      label: "Поверхности утепления по проекту",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Не включать" },
        { value: 1, label: "Наружные стены" },
        { value: 2, label: "Плита пола" },
        { value: 3, label: "Наружные стены и пол" },
      ],
      hint: "Тип, прочность, толщину и расположение утеплителя задаёт проект",
      group: "Утепление",
    },
    {
      key: "insulationWallHeightM",
      label: "Высота утепления стены",
      type: "number",
      unit: "м",
      min: 0,
      max: 5,
      step: 0.1,
      defaultValue: 2.5,
      hideIf: hideWithoutInsulatedWalls,
      group: "Утепление",
    },
    {
      key: "insulationLayers",
      label: "Слоёв плитного утеплителя",
      type: "number",
      min: 1,
      max: 5,
      step: 1,
      defaultValue: 1,
      hideIf: hideWithoutInsulation,
      group: "Утепление",
    },
    {
      key: "insulationReservePercent",
      label: "Запас утеплителя",
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
      key: "insulationBoardAreaM2",
      label: "Площадь одной плиты утеплителя",
      type: "number",
      unit: "м²",
      min: 0.1,
      max: 5,
      step: 0.01,
      defaultValue: 0.72,
      hideIf: hideWithoutInsulation,
      hint: "Введите фактическую площадь по этикетке; 0,72 м² соответствует лишь примеру 1200 × 600 мм",
      group: "Утепление",
    },
  ],
  calculate(inputs) {
    const canonical = computeCanonicalBasement(basementSpec as any, inputs);
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
          value: String(totals.recPurchase),
          unit: "м³",
          hint: "пол и стены раздельно",
          tone: "violet",
        },
        {
          icon: "🧱",
          label: "Чистый объём",
          value: String(totals.cleanConcreteM3),
          unit: "м³",
          hint: "без скрытых запасов",
          tone: "emerald",
        },
        {
          icon: "📐",
          label: "Наружная площадь стен",
          value: String(totals.outerWallArea),
          unit: "м²",
          hint: "за вычетом проёмов",
          tone: "slate",
        },
      ],
    };
  },
  formulaDescription: `
**Калькулятор переводит готовую проектную схему в закупку:**

1. Стены: из площади наружного прямоугольника вычитается внутренний — углы не считаются дважды; объём проёмов вычитается отдельно.
2. Плита пола: длина × ширина × проектную толщину; её размеры не выводятся из размеров стен.
3. Пол и стены считаются отдельными заливками с собственным запасом и остатком в линии подачи, затем округляются вверх с шагом заказа.
4. Арматура берётся только из проектной ведомости; калькулятор не назначает кг/м², диаметры или схему.
5. Опалубка, гидроизоляция и утепление считаются только для выбранных поверхностей и по фактической площади или массе упаковки.

Дренаж, вентиляция, земляные работы, обратная засыпка, швы и узлы примыкания не рассчитываются.
  `,
  howToUse: [
    "Перенесите наружный контур, высоту и толщину стен из проекта",
    "Введите отдельные размеры и толщину плиты пола",
    "Настройте раздельные заказы бетона для пола и стен",
    "При наличии ведомости добавьте проектные массы арматуры",
    "Включите только предусмотренные проектом опалубку, гидроизоляцию и утепление",
    "Сверьте чистую геометрию, явный запас и отдельные позиции к покупке",
  ],
  faq: [
    {
      question: "Калькулятор подбирает толщину стен и армирование подвала?",
      answer:
        "Нет. Давление грунта и воды, нагрузки здания, трещиностойкость, толщину, класс бетона и схему армирования определяет проектировщик по изысканиям. Калькулятор считает материалы только по введённой схеме.",
    },
    {
      question: "Почему арматура больше не считается в кг на квадратный метр?",
      answer:
        "Одинаковая площадь стен не задаёт давление грунта, опирание, проёмы, шаги и диаметры стержней. Универсальные 18 или 22 кг/м² выглядят убедительно, но не являются проектной ведомостью и могут дать опасную закупку.",
    },
    {
      question: "Почему гидроизоляция выключена по умолчанию?",
      answer:
        "Калькулятор не может выбрать систему по одному размеру подвала. Нужно знать грунтовые воды, среду, швы, вводы, дренаж и принятую проектом защиту. После выбора системы введите расход или площадь упаковки конкретного товара.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор монолитного подвала</h2>
<p>Калькулятор переводит наружные размеры монолитных стен и отдельные размеры плиты пола в чистую геометрию и позиции к покупке. Он не выбирает конструктивную схему и не заменяет инженерные изыскания.</p>

<h2>Бетон стен без двойного счёта углов</h2>
<p>Объём наружных стен считается как разность наружного и внутреннего прямоугольников, умноженная на высоту: <strong>V = (L × B − L<sub>вн</sub> × B<sub>вн</sub>) × H</strong>. Так угловые участки не суммируются дважды. Сквозные проёмы вычитаются как площадь проёмов × толщину стены.</p>
<p>Плита пола считается по своим размерам. Это важно, потому что она может выступать за контур стен или, наоборот, иметь другую рабочую геометрию.</p>

<h2>Отдельные поставки бетона</h2>
<p>Пол и стены обычно бетонируют в разные этапы, поэтому калькулятор отдельно показывает чистый объём, выбранный запас, остаток в линии подачи и округление по шагу поставщика для каждой заливки.</p>

<h2>Арматура только из проекта</h2>
<p>Удельные расходы в кг/м² удалены. Пользователь может перенести массу из проектной ведомости, добавить явный закупочный запас и округлить массу заказа. Диаметры, стыки, выпуски, усиления проёмов и раскрой по пруткам остаются в рабочих чертежах.</p>

<h2>Гидроизоляция и утепление по выбранному товару</h2>
<p>Система защиты по умолчанию не назначается. Для состава вводятся расход на весь цикл и масса упаковки, для рулонного материала — число слоёв и полезная площадь рулона. Утеплитель округляется до фактической площади плиты.</p>

<h2>Нормативная граница расчёта</h2>
<ul>
  <li><strong>СП 22.13330.2016</strong> — основания по изысканиям и расчёту;</li>
  <li><strong>СП 63.13330.2018</strong> — бетонные и железобетонные конструкции;</li>
  <li><strong>СП 28.13330.2017</strong> — проектирование защиты от коррозии;</li>
  <li><strong>СП 71.13330.2017</strong> — производство и приёмка изоляционных работ;</li>
  <li><strong>ГОСТ 7473-2010</strong> — действующие на 29 августа 2026 года требования к готовым бетонным смесям; принятый ГОСТ 7473-2026 вводится 1 ноября 2026 года.</li>
</ul>
<p>Ссылки на нормы показывают границу применимости. Они не превращают калькулятор материалов в расчёт подземной конструкции.</p>
`,
    faq: [
      {
        question: "Как посчитать бетон на стены подвала?",
        answer:
          "<p>Для прямоугольного монолитного контура вычтите площадь внутреннего прямоугольника из наружного и умножьте разницу на высоту стены. Затем вычтите объём сквозных проёмов. Запас, остаток в линии подачи и округление заказа учитывайте отдельно.</p>",
      },
      {
        question: "Можно ли по этому расчёту строить подвал без проекта?",
        answer:
          "<p>Нет. Калькулятор не проверяет грунты, воду, давление, всплытие, осадки, трещиностойкость, армирование и узлы водозащиты. Он подходит для ведомости материалов после принятия проектных решений.</p>",
      },
      {
        question: "Что не входит в результат?",
        answer:
          "<p>Не рассчитываются котлован, крепление откосов, водопонижение, дренаж, вентиляция, обратная засыпка, перекрытие, лестница, внутренние стены, швы, вводы и локальные усиления. Их считают по отдельным чертежам и спецификациям.</p>",
      },
    ],
  },
};
